
export type Category = 'All' | 'Starters' | 'Soups' | 'Mains' | 'Juice' | 'Desserts';

export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  category: Category;
  imageUrl: string;
  ingredients: string[];
}

export interface CartItem extends Product {
  quantity: number;
}

export interface Order {
  id: string;
  customerName: string;
  mobileNumber: string;
  items: CartItem[];
  totalAmount: number;
  status: 'pending' | 'confirmed' | 'delivered';
  createdAt: any; // Firestore Timestamp or Date
}
