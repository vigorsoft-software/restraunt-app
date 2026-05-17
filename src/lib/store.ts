
import { Product, Order } from './types';
import { PlaceHolderImages } from './placeholder-images';

export const INITIAL_PRODUCTS: Product[] = [
  {
    id: '1',
    name: 'Truffle Mushroom Soup',
    description: 'Creamy wild mushroom blend infused with black truffle oil and chive dust.',
    price: 12.00,
    category: 'Soups',
    imageUrl: PlaceHolderImages.find(img => img.id === 'dish-2')?.imageUrl || '',
    ingredients: ['Wild Mushrooms', 'Black Truffle Oil', 'Cream', 'Chives']
  },
  {
    id: '2',
    name: 'Glazed Seabass',
    description: 'Pan-seared Mediterranean seabass, finished with a citrus reduction.',
    price: 34.00,
    category: 'Mains',
    imageUrl: PlaceHolderImages.find(img => img.id === 'dish-1')?.imageUrl || '',
    ingredients: ['Seabass', 'Lemon', 'Wild Herbs', 'Olive Oil']
  },
  {
    id: '3',
    name: 'Wagyu Carpaccio',
    description: 'Thinly sliced A5 Wagyu with caper berries and aged balsamic.',
    price: 22.00,
    category: 'Starters',
    imageUrl: PlaceHolderImages.find(img => img.id === 'dish-3')?.imageUrl || '',
    ingredients: ['A5 Wagyu', 'Capers', 'Balsamic', 'Arugula']
  },
  {
    id: '4',
    name: 'Emerald Cold Press',
    description: 'Freshly pressed cucumber, green apple, and mint extract.',
    price: 9.00,
    category: 'Juice',
    imageUrl: PlaceHolderImages.find(img => img.id === 'dish-6')?.imageUrl || '',
    ingredients: ['Cucumber', 'Green Apple', 'Mint']
  },
  {
    id: '5',
    name: 'Forest Berry Symphony',
    description: 'A deconstructed tart featuring wild blackberries and raspberry coulis.',
    price: 18.00,
    category: 'Desserts',
    imageUrl: PlaceHolderImages.find(img => img.id === 'dish-4')?.imageUrl || '',
    ingredients: ['Wild Berries', 'Vanilla Bean', 'Shortcrust', 'Mint']
  },
  {
    id: '6',
    name: 'Lobster Bisque',
    description: 'Rich, velvet lobster reduction with a touch of cognac.',
    price: 16.00,
    category: 'Soups',
    imageUrl: PlaceHolderImages.find(img => img.id === 'dish-5')?.imageUrl || '',
    ingredients: ['Lobster', 'Cream', 'Cognac', 'Tarragon']
  }
];

export let mockOrders: Order[] = [];

export const addOrder = (order: Order) => {
  mockOrders = [order, ...mockOrders];
};
