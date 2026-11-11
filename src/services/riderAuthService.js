/**
 * Rider registration — uploads documents to Storage and saves profile to Firestore.
 */
import { doc, setDoc, getDoc, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../config/firebase';
import { normalizeFleetType } from '../utils/riderFleetLabels';
import { isRiderApproved, mergeRiderProfile } from '../utils/riderApproval';

const DOC_FIELD_MAP = {
  profilePhoto: 'profilePhoto',
  idDocument: 'idDocumentURL',
  licensePhoto: 'licensePhotoURL',
  vehiclePhoto: 'vehiclePhotoURL',
};

const uploadRiderFile = async (uid, file, docType) => {
  const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
  const safe = docType.replace(/[^a-z0-9_-]/gi, '_');
  const storageRef = ref(storage, `riders/${uid}/documents/${safe}_${Date.now()}.${ext}`);
  await uploadBytes(storageRef, file);
  return getDownloadURL(storageRef);
};

/**
 * Submit or resubmit a rider application with document uploads.
 * @param {string} uid - Firebase Auth UID
 * @param {Object} form - Application fields
 * @param {Object} files - { profilePhoto?, idDocument?, licensePhoto?, vehiclePhoto? } File objects
 */
export const submitRiderApplication = async (uid, form, files = {}) => {
  if (!uid) throw new Error('You must be logged in to submit your application.');

  const [existingSnap, userSnap] = await Promise.all([
    getDoc(doc(db, 'riders', uid)),
    getDoc(doc(db, 'users', uid)),
  ]);
  const isResubmit = existingSnap.exists();
  const existingData = existingSnap.exists() ? existingSnap.data() : {};
  const userData = userSnap.exists() ? userSnap.data() : {};
  const alreadyApproved = isRiderApproved(mergeRiderProfile(existingData, userData, uid));

  const uploaded = {};
  for (const [key, file] of Object.entries(files)) {
    if (file && file instanceof File) {
      const url = await uploadRiderFile(uid, file, key);
      const field = DOC_FIELD_MAP[key] || `${key}URL`;
      uploaded[field] = url;
      if (key === 'idDocument') {
        uploaded.idFileURL = url;
        uploaded.idCard = url;
      }
      if (key === 'profilePhoto') {
        uploaded.photoURL = url;
      }
    }
  }

  const fleet = normalizeFleetType(form.fleetType);

  const riderDoc = {
    uid,
    name: form.name.trim(),
    fullName: form.name.trim(),
    email: form.email.trim(),
    phone: form.phone.trim(),
    address: (form.address || '').trim(),
    fleetType: fleet.fleetType,
    vehicleType: fleet.vehicleType,
    vehicle: fleet.vehicle,
    plateNumber: (form.plateNumber || '').trim(),
    licenseNumber: (form.licenseNumber || '').trim(),
    driversLicense: (form.licenseNumber || '').trim(),
    bankName: (form.bankName || '').trim(),
    accountNumber: (form.accountNumber || '').trim(),
    accountName: (form.accountName || form.name || '').trim(),
    status: alreadyApproved ? (existingData.status || 'active') : 'pending',
    approved: alreadyApproved,
    applicationStatus: alreadyApproved ? 'approved' : 'under_review',
    reuploadEnabled: false,
    resubmittedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    ...uploaded,
    ...(isResubmit ? {} : { createdAt: serverTimestamp() }),
  };

  await setDoc(doc(db, 'riders', uid), riderDoc, { merge: true });

  await setDoc(
    doc(db, 'users', uid),
    {
      uid,
      role: 'rider',
      displayName: form.name.trim(),
      name: form.name.trim(),
      email: form.email.trim(),
      phone: form.phone.trim(),
      updatedAt: serverTimestamp(),
      ...(alreadyApproved
        ? { riderApproved: true, applicationStatus: 'approved' }
        : { riderApproved: false, applicationStatus: 'under_review' }),
      ...(isResubmit ? {} : { createdAt: serverTimestamp() }),
    },
    { merge: true }
  );

  return { success: true, isResubmit, riderId: uid };
};

export const getRiderApplication = async (uid) => {
  const [riderSnap, userSnap] = await Promise.all([
    getDoc(doc(db, 'riders', uid)),
    getDoc(doc(db, 'users', uid)),
  ]);
  return mergeRiderProfile(
    riderSnap.exists() ? riderSnap.data() : null,
    userSnap.exists() ? userSnap.data() : null,
    uid,
  );
};

/** Live updates when admin approves — rider UI refreshes without re-login. */
export const subscribeRiderApplication = (uid, onChange) => {
  if (!uid) return () => {};

  let riderData = null;
  let userData = null;

  const emit = () => {
    onChange(mergeRiderProfile(riderData, userData, uid));
  };

  const unsubRider = onSnapshot(
    doc(db, 'riders', uid),
    (snap) => {
      riderData = snap.exists() ? snap.data() : null;
      emit();
    },
    (err) => console.error('Rider profile listener error:', err),
  );

  const unsubUser = onSnapshot(
    doc(db, 'users', uid),
    (snap) => {
      userData = snap.exists() ? snap.data() : null;
      emit();
    },
    (err) => console.error('User profile listener error:', err),
  );

  return () => {
    unsubRider();
    unsubUser();
  };
};
