// Local Markets data for Abeokuta
export interface LocalMarket {
  id: string;
  name: string;
  category: string;
  rating: number;
  eta: number; // in minutes
  minOrder: number; // in Naira
  image: string;
  popular?: boolean;
  verified?: boolean;
}

export const localMarkets: LocalMarket[] = [
  {
    id: 'kuto-market',
    name: 'Kuto Market',
    category: 'Fresh Produce & Groceries',
    rating: 4.8,
    eta: 25,
    minOrder: 2000,
    image: 'https://images.unsplash.com/photo-1566385101042-1a0aa0c1268c?w=400&h=250&fit=crop&auto=format',
    popular: true,
    verified: true
  },
  {
    id: 'itoku-market',
    name: 'Itoku Market',
    category: 'Traditional Fabrics & Crafts',
    rating: 4.6,
    eta: 30,
    minOrder: 1500,
    image: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=400&h=250&fit=crop&auto=format',
    verified: true
  },
  {
    id: 'lafenwa-market',
    name: 'Lafenwa Market',
    category: 'Electronics & Gadgets',
    rating: 4.7,
    eta: 35,
    minOrder: 3000,
    image: 'https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=400&h=250&fit=crop&auto=format',
    popular: true
  },
  {
    id: 'omida-market',
    name: 'Omida Market',
    category: 'Fashion & Clothing',
    rating: 4.5,
    eta: 40,
    minOrder: 2500,
    image: 'https://images.unsplash.com/photo-1441984904996-e0b6ba687e04?w=400&h=250&fit=crop&auto=format',
    verified: true
  },
  {
    id: 'sapon-market',
    name: 'Sapon Market',
    category: 'Meat & Fish',
    rating: 4.9,
    eta: 20,
    minOrder: 1800,
    image: 'https://images.unsplash.com/photo-1567306226416-28f0efdc88ce?w=400&h=250&fit=crop&auto=format',
    popular: true,
    verified: true
  },
  {
    id: 'ake-market',
    name: 'Ake Market',
    category: 'Books & Stationery',
    rating: 4.4,
    eta: 45,
    minOrder: 1000,
    image: 'https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=400&h=250&fit=crop&auto=format'
  },
  {
    id: 'totoro-market',
    name: 'Totoro Market',
    category: 'Health & Beauty',
    rating: 4.6,
    eta: 30,
    minOrder: 2200,
    image: 'https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=400&h=250&fit=crop&auto=format',
    verified: true
  },
  {
    id: 'isabo-market',
    name: 'Isabo Market',
    category: 'Sports & Fitness',
    rating: 4.3,
    eta: 50,
    minOrder: 3500,
    image: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=400&h=250&fit=crop&auto=format'
  }
];
