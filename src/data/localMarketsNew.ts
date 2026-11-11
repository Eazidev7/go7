export interface LocalMarket {
  id: string;
  name: string;
  category: string;
  rating: number;
  deliveryTime: string;
  image: string;
  altImage: string;
  placeholder: string;
}

export const localMarkets: LocalMarket[] = [
  {
    id: '1',
    name: 'Itoku Market',
    category: 'Spices & Herbs',
    rating: 4.8,
    deliveryTime: '25-35 min',
    image: '/images/itoku-spices.jpg',
    altImage: 'https://images.unsplash.com/photo-1601004890684-d8cbf643f5f2?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1200&q=80',
    placeholder: 'https://placehold.co/1200x800/fff7ed/9a3412?text=Traditional+Spices'
  },
  {
    id: '2',
    name: 'Kuto Market',
    category: 'Root Vegetables',
    rating: 4.6,
    deliveryTime: '30-40 min',
    image: '/images/kuto-cassava.jpg',
    altImage: 'https://images.unsplash.com/photo-1589927986089-35812388d1f4?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1200&q=80',
    placeholder: 'https://placehold.co/1200x800/fff3f3/9b1c1c?text=Cassava+Roots'
  },
  {
    id: '3',
    name: 'Lafenwa Market',
    category: 'Farm Produce',
    rating: 4.7,
    deliveryTime: '35-45 min',
    image: '/images/lafenwa-market.webp',
    altImage: 'https://images.unsplash.com/photo-1590779033100-9f60a05a013d?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1200&q=80',
    placeholder: 'https://placehold.co/1200x800/effaf1/065f46?text=Fresh+Vegetables'
  },
  {
    id: '4',
    name: 'Ake Market',
    category: 'Fresh Peppers',
    rating: 4.5,
    deliveryTime: '28-38 min',
    image: '/images/pepper-market.webp',
    altImage: 'https://images.unsplash.com/photo-1525607551316-4a8e36d1deef?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1200&q=80',
    placeholder: 'https://placehold.co/1200x800/ffefe9/9b1c1c?text=Fresh+Peppers'
  },
  {
    id: '5',
    name: 'Omida Market',
    category: 'Mixed Produce',
    rating: 4.9,
    deliveryTime: '25-35 min',
    image: 'https://images.unsplash.com/photo-1488459716781-31db52582fe9?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1200&q=80',
    altImage: 'https://via.placeholder.com/1200x800/6366f1/ffffff?text=Market+Stall',
    placeholder: 'https://placehold.co/1200x800/f1f5f9/0f172a?text=Local+Market+Stall'
  }
];
