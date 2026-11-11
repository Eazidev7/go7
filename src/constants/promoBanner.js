/**
 * Mobile homepage promo carousel — display + upload specs.
 * Full-rectangle image fills the slide (go7 figma/components/PromoBanner.tsx h-40).
 */
export const PROMO_BANNER_SPECS = {
  displayHeightPx: 160,
  displayWidthPx: 390,
  /** @deprecated circle crop removed — kept for older admin copy references */
  circleImagePx: 160,
  recommendedImagePx: 1200,
  recommendedHeightPx: 480,
  recommendedAspect: '2.5:1 (landscape)',
  maxFileSizeMb: 8,
  acceptedTypes: ['image/jpeg', 'image/png', 'image/webp'],
  acceptedExtensions: '.jpg, .jpeg, .png, .webp',
};

export const DEFAULT_PROMO_BANNERS = [
  {
    id: 'default-1',
    discount: '30%',
    label: 'OFF',
    mainText: 'Your Bukka Hut Faves!',
    bgColor: 'bg-red-500',
    image: 'https://images.unsplash.com/photo-1664992960082-0ea299a9c53e?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080',
    displayOrder: 0,
    isActive: true,
  },
  {
    id: 'default-2',
    discount: '25%',
    label: 'OFF',
    mainText: 'Premium Fast Food!',
    bgColor: 'bg-gradient-to-br from-red-500 to-orange-500',
    image: 'https://images.unsplash.com/photo-1651843465180-5965076f7368?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080',
    displayOrder: 1,
    isActive: true,
  },
  {
    id: 'default-3',
    discount: '₦500',
    label: 'OFF',
    mainText: 'Local Market Delights!',
    bgColor: 'bg-gradient-to-br from-red-600 to-rose-500',
    image: 'https://images.unsplash.com/photo-1744968048879-2c79641429e4?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080',
    displayOrder: 2,
    isActive: true,
  },
];

export const PROMO_BG_OPTIONS = [
  { value: 'bg-red-500', label: 'Red' },
  { value: 'bg-gradient-to-br from-red-500 to-orange-500', label: 'Red → Orange' },
  { value: 'bg-gradient-to-br from-red-600 to-rose-500', label: 'Red → Rose' },
  { value: 'bg-gradient-to-br from-orange-500 to-amber-500', label: 'Orange → Amber' },
  { value: 'bg-gradient-to-br from-green-600 to-emerald-500', label: 'Green → Emerald' },
];
