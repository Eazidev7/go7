/**
 * Activate homepage promo slides 3→4→2 via Firestore (images on go7.ng/promo-banners/).
 * Uses Application Default Credentials (gcloud / firebase login).
 */
import { initializeApp, applicationDefault } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

initializeApp({
  credential: applicationDefault(),
  projectId: 'go7-app-209e4',
});

const db = getFirestore();

const slides = [
  {
    file: '03-orombos.png',
    id: 'promo-orombos',
    displayOrder: 0,
    mainText: 'Orombos',
  },
  {
    file: '04-breakfast.png',
    id: 'promo-breakfast',
    displayOrder: 1,
    mainText: 'Breakfast',
  },
  {
    file: '02-free-delivery.png',
    id: 'promo-free-delivery',
    displayOrder: 2,
    mainText: 'Free delivery',
  },
];

async function main() {
  const existing = await db.collection('promoBanners').get();
  const batch = db.batch();
  let deactivateCount = 0;
  existing.docs.forEach((snap) => {
    if (!slides.some((s) => s.id === snap.id)) {
      batch.update(snap.ref, { isActive: false, updatedAt: FieldValue.serverTimestamp() });
      deactivateCount += 1;
    }
  });
  if (deactivateCount > 0) await batch.commit();

  for (const slide of slides) {
    const imageUrl = `https://go7.ng/promo-banners/${slide.file}`;
    await db.collection('promoBanners').doc(slide.id).set(
      {
        discount: '',
        label: '',
        mainText: slide.mainText,
        bgColor: 'bg-red-500',
        image: imageUrl,
        imageStoragePath: '',
        imageSource: 'external',
        displayOrder: slide.displayOrder,
        isActive: true,
        linkUrl: '',
        createdBy: 'activate-promo-slider',
        updatedAt: FieldValue.serverTimestamp(),
        createdAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );
    console.log('OK', slide.id, imageUrl);
  }
  console.log('Done. Slider order: Orombos → Breakfast → Free delivery');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
