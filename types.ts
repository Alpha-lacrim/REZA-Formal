
export interface Product {
  id: string;
  name: string;
  name_fa?: string;
  price: number;
  currency: string;
  image: string;
  short: string;
  short_fa?: string;
  description: string;
  description_fa?: string;
  category: string;
  fabric?: string;
}

export interface CartItem extends Product {
  qty: number;
}

export type UserRole = 'user' | 'admin';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  phone?: string;
  address?: string;
  password?: string; // In a real app, never store plain text. We will mock hash it.
  createdAt: number;
}

export type OrderStatus = 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';

export interface Order {
  id: string;
  userId: string;
  items: CartItem[];
  total: number;
  status: OrderStatus;
  createdAt: number;
  shippingAddress: string;
}

export interface Translation {
  [key: string]: string;
}

export interface Translations {
  [lang: string]: Translation;
}
