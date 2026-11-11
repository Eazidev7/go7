export interface FoodVendor {
  id: string;
  name: string;
  cuisine: string;
  rating: number;
  deliveryTime: string;
  image: string;
}

export const foodVendors: FoodVendor[] = [
  {
    id: '1',
    name: 'Burger Palace',
    cuisine: 'Burgers & Fast Food',
    rating: 4.8,
    deliveryTime: '15-25 min',
    image: 'https://images.unsplash.com/photo-1550547660-d9450f859349?q=80&w=1200&auto=format&fit=crop'
  },
  {
    id: '2',
    name: 'Jollof Kitchen',
    cuisine: 'Nigerian Rice Dishes',
    rating: 4.9,
    deliveryTime: '20-30 min',
    image: 'https://images.unsplash.com/photo-1617191518000-8b2d8f46d5db?q=80&w=1200&auto=format&fit=crop'
  },
  {
    id: '3',
    name: 'Shawarma Express',
    cuisine: 'Middle Eastern',
    rating: 4.7,
    deliveryTime: '10-20 min',
    image: 'https://images.unsplash.com/photo-1604908812117-22ab4d58f86d?q=80&w=1200&auto=format&fit=crop'
  },
  {
    id: '4',
    name: 'Grill Masters',
    cuisine: 'Grilled Chicken & BBQ',
    rating: 4.6,
    deliveryTime: '25-35 min',
    image: 'https://images.unsplash.com/photo-1544025162-d76694265947?q=80&w=1200&auto=format&fit=crop'
  }
];
