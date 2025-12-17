export interface Product {
  id: string;
  name: string;
  name_fa?: string;
  price: number;
  currency: string;
  image: string;
  images: string[];
  short: string;
  short_fa?: string;
  description: string;
  description_fa?: string;
  category: string;
  fabric?: string;
  stock?: number;
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
  password?: string;
  createdAt: number;
  twoFactorSecret?: string;
  lastLogin?: number;
  avatar?: string;
  provider?: 'local' | 'google';
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

export interface ContactMessage {
  id: string;
  name: string;
  email: string;
  message: string;
  createdAt: number;
  read?: boolean;
}

export interface SiteSettings {
  aboutTitle: string;
  aboutDescription: string;
  aboutImage: string;
  
  // Homepage Sections
  heroImage: string;
  suitsSectionImage: string;
  shirtsSectionImage: string;
  blazersSectionImage: string;
  accessoriesSectionImage: string;
  bespokeSectionImage: string;
}