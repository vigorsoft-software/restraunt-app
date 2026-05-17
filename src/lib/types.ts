
export interface Category {
  id: string;
  name: string;
  order?: number;
}

export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
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
  status: 'pending' | 'preparing' | 'completed' | 'delivered';
  createdAt: any;
}

export interface User {
  mobileNumber: string;
  name: string;
  isAdmin: boolean;
  password?: string;
  lastOrderedAt?: any;
}

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  read: boolean;
  createdAt: any;
}
