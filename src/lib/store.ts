import { Product, Order } from './types';
import { PlaceHolderImages } from './placeholder-images';

export const INITIAL_PRODUCTS: Product[] = [
  {
    id: '1',
    name: 'Glazed Seabass',
    description: 'Pan-seared Mediterranean seabass, finished with a citrus reduction and wild micro-herbs.',
    price: 34.00,
    category: 'Signature',
    imageUrl: PlaceHolderImages.find(img => img.id === 'dish-1')?.imageUrl || '',
    ingredients: ['Seabass', 'Lemon', 'Wild Herbs', 'Olive Oil']
  },
  {
    id: '2',
    name: 'Truffle Tagliatelle',
    description: 'Freshly handmade pasta tossed in a cream of black summer truffles and 24-month aged Parmigiano-Reggiano.',
    price: 28.50,
    category: 'Mains',
    imageUrl: PlaceHolderImages.find(img => img.id === 'dish-2')?.imageUrl || '',
    ingredients: ['Handmade Pasta', 'Black Truffle', 'Cream', 'Parmesan']
  },
  {
    id: '3',
    name: 'Wagyu Miniatures',
    description: 'Grade A5 Wagyu beef sliders topped with balsamic-caramelized onions and melted artisanal cheddar.',
    price: 26.00,
    category: 'Signature',
    imageUrl: PlaceHolderImages.find(img => img.id === 'dish-3')?.imageUrl || '',
    ingredients: ['A5 Wagyu', 'Artisanal Cheddar', 'Caramelized Onion', 'Brioche']
  },
  {
    id: '4',
    name: 'Forest Berry Symphony',
    description: 'A deconstructed tart featuring wild blackberries, raspberry coulis, and a hint of Tahitian vanilla bean.',
    price: 18.00,
    category: 'Desserts',
    imageUrl: PlaceHolderImages.find(img => img.id === 'dish-4')?.imageUrl || '',
    ingredients: ['Wild Berries', 'Vanilla Bean', 'Shortcrust', 'Mint']
  },
  {
    id: '5',
    name: 'Heirloom Roots',
    description: 'Salt-baked heirloom vegetables glazed with a 12-year aged balsamic from Modena.',
    price: 14.50,
    category: 'Sides',
    imageUrl: PlaceHolderImages.find(img => img.id === 'dish-5')?.imageUrl || '',
    ingredients: ['Heirloom Carrots', 'Beets', 'Balsamic Modena', 'Sea Salt']
  },
  {
    id: '6',
    name: 'Botanical Gin Mist',
    description: 'Small-batch artisanal gin infused with cucumber, elderflower, and cracked pink peppercorn.',
    price: 16.00,
    category: 'Spirits',
    imageUrl: PlaceHolderImages.find(img => img.id === 'dish-6')?.imageUrl || '',
    ingredients: ['Artisan Gin', 'Elderflower', 'Cucumber', 'Pink Peppercorn']
  }
];

// In a real app, this would be a server-side DB or local storage wrapper.
export let mockOrders: Order[] = [];

export const addOrder = (order: Order) => {
  mockOrders = [order, ...mockOrders];
};