
import { Product, User, Order } from '../types';
import { products as seedProducts } from '../data';

// Keys for LocalStorage
const K_USERS = 'reza_db_users_v1';
const K_PRODUCTS = 'reza_db_products_v1';
const K_ORDERS = 'reza_db_orders_v1';

// Simulated delay helper
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

class DatabaseService {
    constructor() {
        this.init();
    }

    private init() {
        if (!localStorage.getItem(K_USERS)) {
            const admin: User = {
                id: 'admin-1',
                name: 'مدیر سیستم',
                email: 'admin@reza.com',
                password: 'admin', // Mock password
                role: 'admin',
                createdAt: Date.now()
            };
            localStorage.setItem(K_USERS, JSON.stringify([admin]));
        }

        if (!localStorage.getItem(K_PRODUCTS)) {
            localStorage.setItem(K_PRODUCTS, JSON.stringify(seedProducts));
        }

        if (!localStorage.getItem(K_ORDERS)) {
            localStorage.setItem(K_ORDERS, JSON.stringify([]));
        }
    }

    // --- SECURITY HELPERS ---

    private sanitize(input: string): string {
        if (typeof input !== 'string') return input;
        // Basic HTML Entity encoding to prevent XSS
        return input.replace(/[&<>"'/]/g, (char) => {
            const map: Record<string, string> = {
                '&': '&amp;',
                '<': '&lt;',
                '>': '&gt;',
                '"': '&quot;',
                "'": '&#x27;',
                '/': '&#x2F;',
            };
            return map[char];
        });
    }

    private isValidUrl(string: string): boolean {
        try {
            const url = new URL(string);
            // Block javascript: protocols
            return url.protocol === "http:" || url.protocol === "https:";
        } catch (_) {
            return false;
        }
    }

    private validateEmail(email: string): boolean {
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(email);
    }

    // --- AUTH ---

    async login(email: string, pass: string): Promise<User> {
        await delay(500);
        // Sanitize input to match stored format if necessary, though email is restrictive
        const safeEmail = this.sanitize(email).toLowerCase();
        
        const users: User[] = JSON.parse(localStorage.getItem(K_USERS) || '[]');
        // We compare against plain stored password for this mock. 
        // In real secure app, we'd hash 'pass' and compare with stored hash.
        const user = users.find(u => u.email.toLowerCase() === safeEmail && u.password === pass);
        
        if (!user) throw new Error('ایمیل یا رمز عبور اشتباه است.');
        const { password, ...safeUser } = user;
        return safeUser as User;
    }

    async register(name: string, email: string, pass: string): Promise<User> {
        await delay(500);

        if (!this.validateEmail(email)) {
            throw new Error('فرمت ایمیل نامعتبر است.');
        }

        const safeName = this.sanitize(name);
        const safeEmail = this.sanitize(email).toLowerCase();

        const users: User[] = JSON.parse(localStorage.getItem(K_USERS) || '[]');
        if (users.find(u => u.email.toLowerCase() === safeEmail)) {
            throw new Error('این ایمیل قبلا ثبت شده است.');
        }

        const newUser: User = {
            id: 'user-' + Date.now(),
            name: safeName,
            email: safeEmail,
            password: pass, // In a real app, hash this!
            role: 'user',
            createdAt: Date.now()
        };

        users.push(newUser);
        localStorage.setItem(K_USERS, JSON.stringify(users));
        
        const { password, ...safeUser } = newUser;
        return safeUser as User;
    }

    async updateUser(userId: string, data: Partial<User>): Promise<User> {
        await delay(300);
        const users: User[] = JSON.parse(localStorage.getItem(K_USERS) || '[]');
        const idx = users.findIndex(u => u.id === userId);
        if (idx === -1) throw new Error('User not found');

        const sanitizedData = { ...data };
        if (sanitizedData.name) sanitizedData.name = this.sanitize(sanitizedData.name);
        if (sanitizedData.address) sanitizedData.address = this.sanitize(sanitizedData.address);
        if (sanitizedData.email) delete sanitizedData.email; // Prevent email change for simplicity or sanitize it
        if (sanitizedData.role) delete sanitizedData.role; // Prevent role escalation via update

        const updatedUser = { ...users[idx], ...sanitizedData };
        users[idx] = updatedUser;
        localStorage.setItem(K_USERS, JSON.stringify(users));

        const { password, ...safeUser } = updatedUser;
        return safeUser as User;
    }

    // --- PRODUCTS ---

    async getProducts(): Promise<Product[]> {
        // Minimal delay for read operations
        const stored = localStorage.getItem(K_PRODUCTS);
        return stored ? JSON.parse(stored) : [];
    }

    async saveProduct(product: Product): Promise<Product> {
        await delay(400);
        
        // Sanitize Product Data
        const safeProduct: Product = {
            ...product,
            name: this.sanitize(product.name),
            category: this.sanitize(product.category),
            description: this.sanitize(product.description),
            short: this.sanitize(product.short),
            fabric: product.fabric ? this.sanitize(product.fabric) : undefined,
            // Validate Image URL to prevent javascript: vectors
            image: this.isValidUrl(product.image) ? product.image : 'https://via.placeholder.com/400'
        };

        const products: Product[] = JSON.parse(localStorage.getItem(K_PRODUCTS) || '[]');
        const idx = products.findIndex(p => p.id === safeProduct.id);
        
        if (idx > -1) {
            products[idx] = safeProduct;
        } else {
            products.push(safeProduct);
        }
        
        localStorage.setItem(K_PRODUCTS, JSON.stringify(products));
        return safeProduct;
    }

    async deleteProduct(id: string): Promise<void> {
        await delay(300);
        let products: Product[] = JSON.parse(localStorage.getItem(K_PRODUCTS) || '[]');
        products = products.filter(p => p.id !== id);
        localStorage.setItem(K_PRODUCTS, JSON.stringify(products));
    }

    // --- ORDERS ---

    async createOrder(userId: string, items: any[], total: number, address: string): Promise<Order> {
        await delay(600);
        
        const safeAddress = this.sanitize(address);

        const orders: Order[] = JSON.parse(localStorage.getItem(K_ORDERS) || '[]');
        const newOrder: Order = {
            id: 'ORD-' + Date.now().toString().slice(-6),
            userId,
            items, // Items are derived from products which are already sanitized
            total,
            status: 'pending',
            createdAt: Date.now(),
            shippingAddress: safeAddress
        };
        orders.unshift(newOrder); // Newest first
        localStorage.setItem(K_ORDERS, JSON.stringify(orders));
        return newOrder;
    }

    async getOrders(userId?: string): Promise<Order[]> {
        await delay(300);
        const orders: Order[] = JSON.parse(localStorage.getItem(K_ORDERS) || '[]');
        if (userId) {
            return orders.filter(o => o.userId === userId);
        }
        return orders;
    }

    async updateOrderStatus(orderId: string, status: Order['status']): Promise<void> {
        await delay(300);
        const orders: Order[] = JSON.parse(localStorage.getItem(K_ORDERS) || '[]');
        const order = orders.find(o => o.id === orderId);
        if (order) {
            // Status is typed, but safe-guarding anyway
            const validStatuses: Order['status'][] = ['pending', 'processing', 'shipped', 'delivered', 'cancelled'];
            if (validStatuses.includes(status)) {
                 order.status = status;
                 localStorage.setItem(K_ORDERS, JSON.stringify(orders));
            }
        }
    }
    
    // Stats for Admin
    async getStats() {
        await delay(200);
        const products = JSON.parse(localStorage.getItem(K_PRODUCTS) || '[]');
        const orders: Order[] = JSON.parse(localStorage.getItem(K_ORDERS) || '[]');
        const users = JSON.parse(localStorage.getItem(K_USERS) || '[]');
        
        const totalRevenue = orders.reduce((acc, curr) => acc + curr.total, 0);
        
        return {
            productsCount: products.length,
            ordersCount: orders.length,
            usersCount: users.length,
            revenue: totalRevenue
        };
    }
}

export const db = new DatabaseService();
