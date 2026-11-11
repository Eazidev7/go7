import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  getDocs,
  onSnapshot,
  query,
  orderBy,
  serverTimestamp,
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { db, storage } from '../config/firebase';
import { PROMO_BANNER_SPECS } from '../constants/promoBanner';

const COLLECTION = 'promoBanners';

function extensionFromFile(file) {
  const name = file?.name || '';
  const ext = name.split('.').pop()?.toLowerCase();
  if (ext && ['jpg', 'jpeg', 'png', 'webp'].includes(ext)) return ext === 'jpeg' ? 'jpg' : ext;
  if (file?.type === 'image/png') return 'png';
  if (file?.type === 'image/webp') return 'webp';
  return 'jpg';
}

function validateImageFile(file) {
  if (!file) return;
  if (!file.type?.startsWith('image/')) {
    throw new Error('Please upload a JPG, PNG, or WebP image.');
  }
  const maxBytes = PROMO_BANNER_SPECS.maxFileSizeMb * 1024 * 1024;
  if (file.size > maxBytes) {
    throw new Error(`Image must be under ${PROMO_BANNER_SPECS.maxFileSizeMb}MB.`);
  }
}

/** Accept https (preferred) or http image URLs for external promo art. */
export function normalizeExternalImageUrl(raw) {
  const value = String(raw || '').trim();
  if (!value) return '';
  let parsed;
  try {
    parsed = new URL(value);
  } catch {
    throw new Error('Enter a valid image URL (https://…)');
  }
  if (!['http:', 'https:'].includes(parsed.protocol)) {
    throw new Error('Image URL must start with https:// or http://');
  }
  return parsed.toString();
}

export async function uploadPromoBannerImage(bannerId, file) {
  validateImageFile(file);
  const ext = extensionFromFile(file);
  const storagePath = `promo-banners/${bannerId}/original.${ext}`;
  const storageRef = ref(storage, storagePath);

  await uploadBytes(storageRef, file, {
    contentType: file.type || `image/${ext}`,
    cacheControl: 'public,max-age=31536000',
    customMetadata: {
      originalName: file.name || `promo.${ext}`,
      uploadedAt: new Date().toISOString(),
    },
  });

  const imageUrl = await getDownloadURL(storageRef);
  return { imageUrl, storagePath };
}

export async function deletePromoBannerImage(storagePath) {
  if (!storagePath) return;
  try {
    await deleteObject(ref(storage, storagePath));
  } catch (err) {
    console.warn('Promo banner image delete skipped:', err?.message);
  }
}

function sortPromos(promos) {
  return [...promos].sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0));
}

function hasUsableImage(promo) {
  return Boolean(String(promo?.image || '').trim());
}

export function subscribeActivePromoBanners(onData, onError) {
  const q = query(collection(db, COLLECTION), orderBy('displayOrder', 'asc'));

  return onSnapshot(
    q,
    (snapshot) => {
      const promos = snapshot.docs
        .map((snap) => ({ id: snap.id, ...snap.data() }))
        .filter((p) => p.isActive !== false && hasUsableImage(p));
      onData(sortPromos(promos));
    },
    (error) => {
      console.error('Promo banner listener error:', error);
      onError?.(error);
      onData([]);
    }
  );
}

export async function fetchAllPromoBanners() {
  const snapshot = await getDocs(collection(db, COLLECTION));
  return sortPromos(snapshot.docs.map((snap) => ({ id: snap.id, ...snap.data() })));
}

/**
 * Create a promo banner with either a local upload or an external image URL.
 * Writes immediately to Firestore `promoBanners/{id}`.
 */
export async function createPromoBanner(
  { discount, label, mainText, bgColor, displayOrder, isActive, linkUrl, imageUrl },
  imageFile,
  adminUid
) {
  const externalUrl = imageFile ? '' : normalizeExternalImageUrl(imageUrl);
  if (!imageFile && !externalUrl) {
    throw new Error('Upload an image or paste an external image URL.');
  }
  if (imageFile) validateImageFile(imageFile);

  const docRef = await addDoc(collection(db, COLLECTION), {
    discount: discount?.trim() || '',
    label: label?.trim() || 'OFF',
    mainText: mainText?.trim() || '',
    bgColor: bgColor || 'bg-red-500',
    image: externalUrl || '',
    imageStoragePath: '',
    imageSource: externalUrl ? 'external' : 'storage',
    displayOrder: Number(displayOrder) || 0,
    isActive: isActive !== false,
    linkUrl: linkUrl?.trim() || '',
    createdBy: adminUid || null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  if (imageFile) {
    const { imageUrl: uploadedUrl, storagePath } = await uploadPromoBannerImage(docRef.id, imageFile);
    await updateDoc(docRef, {
      image: uploadedUrl,
      imageStoragePath: storagePath,
      imageSource: 'storage',
      updatedAt: serverTimestamp(),
    });
  }

  return docRef.id;
}

export async function updatePromoBanner(bannerId, updates = {}, imageFile = null) {
  const payload = {
    updatedAt: serverTimestamp(),
  };

  if (updates.discount !== undefined) payload.discount = updates.discount?.trim() || '';
  if (updates.label !== undefined) payload.label = updates.label?.trim() || 'OFF';
  if (updates.mainText !== undefined) payload.mainText = updates.mainText?.trim() || '';
  if (updates.bgColor !== undefined) payload.bgColor = updates.bgColor || 'bg-red-500';
  if (updates.displayOrder !== undefined) payload.displayOrder = Number(updates.displayOrder) || 0;
  if (updates.isActive !== undefined) payload.isActive = Boolean(updates.isActive);
  if (updates.linkUrl !== undefined) payload.linkUrl = updates.linkUrl?.trim() || '';

  if (imageFile) {
    validateImageFile(imageFile);
    if (updates.previousStoragePath) {
      await deletePromoBannerImage(updates.previousStoragePath);
    }
    const { imageUrl, storagePath } = await uploadPromoBannerImage(bannerId, imageFile);
    payload.image = imageUrl;
    payload.imageStoragePath = storagePath;
    payload.imageSource = 'storage';
  } else if (updates.imageUrl !== undefined) {
    const externalUrl = normalizeExternalImageUrl(updates.imageUrl);
    if (externalUrl) {
      if (updates.previousStoragePath) {
        await deletePromoBannerImage(updates.previousStoragePath);
      }
      payload.image = externalUrl;
      payload.imageStoragePath = '';
      payload.imageSource = 'external';
    }
  }

  await updateDoc(doc(db, COLLECTION, bannerId), payload);
}

export async function deletePromoBanner(bannerId, storagePath) {
  await deletePromoBannerImage(storagePath);
  await deleteDoc(doc(db, COLLECTION, bannerId));
}
