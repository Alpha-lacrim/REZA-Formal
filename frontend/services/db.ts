import { Product, User, Order, ContactMessage, SiteSettings } from '../types';
import { products as seedProducts } from '../data';
import * as OTPAuth from 'otpauth';

const K_USERS = 'reza_db_users_v1';
const K_PRODUCTS = 'reza_db_products_v1';
const K_ORDERS = 'reza_db_orders_v1';
const K_MESSAGES = 'reza_db_messages_v1';
const K_SETTINGS = 'reza_db_settings_v1';

// Default Admin 2FA Secret (Base32)
export const DEFAULT_ADMIN_2FA_SECRET = 'KAYV46C7N5ZG62D3'; 

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

class DatabaseService {
    constructor() {
        this.init();
    }

    private init() {
        let users: User[] = [];
        try {
            users = JSON.parse(localStorage.getItem(K_USERS) || '[]');
        } catch (e) {
            users = [];
        }

        const adminEmail = 'admin@reza.com';
        let admin = users.find(u => u.email === adminEmail);

        if (!admin) {
            admin = {
                id: 'admin-1',
                name: 'مدیر سیستم',
                email: adminEmail,
                password: 'admin',
                role: 'admin',
                createdAt: Date.now(),
                twoFactorSecret: DEFAULT_ADMIN_2FA_SECRET,
                lastLogin: Date.now(),
                provider: 'local'
            };
            users.push(admin);
            localStorage.setItem(K_USERS, JSON.stringify(users));
        } else if (!admin.twoFactorSecret) {
            // Migration: Add 2FA secret to existing admin
            admin.twoFactorSecret = DEFAULT_ADMIN_2FA_SECRET;
            localStorage.setItem(K_USERS, JSON.stringify(users));
        }

        if (!localStorage.getItem(K_PRODUCTS)) {
            localStorage.setItem(K_PRODUCTS, JSON.stringify(seedProducts));
        }
        else {
            // Sanitize existing stored products to avoid oversized data URLs that can exceed quota
            try {
                const MAX_DATAURL_LENGTH = 100000;
                const stored = JSON.parse(localStorage.getItem(K_PRODUCTS) || '[]');
                let changed = false;
                const cleaned = (stored || []).map((p: any) => {
                    if (!p || !p.images) return p;
                    const filtered = (p.images || []).filter((img: string) => {
                        if (typeof img === 'string' && img.startsWith('data:image/') && img.length > MAX_DATAURL_LENGTH) {
                            changed = true;
                            return false;
                        }
                        return true;
                    });
                    return { ...p, images: filtered, image: filtered[0] || p.image };
                });
                if (changed) {
                    localStorage.setItem(K_PRODUCTS, JSON.stringify(cleaned));
                }
            } catch (e) {
                // ignore
            }
        }

        if (!localStorage.getItem(K_ORDERS)) {
            localStorage.setItem(K_ORDERS, JSON.stringify([]));
        }

        if (!localStorage.getItem(K_MESSAGES)) {
            localStorage.setItem(K_MESSAGES, JSON.stringify([]));
        }

        if (!localStorage.getItem(K_SETTINGS)) {
            const defaultSettings: SiteSettings = {
                aboutTitle: 'داستان رضا فرمال',
                aboutDescription: 'رضا فرمال با بیش از ۴۰ سال تجربه در صنعت پوشاک آقایان، نمادی از کیفیت، اصالت و زیبایی است. ما با بهره‌گیری از بهترین پارچه‌های ایتالیایی و هنر دست دوزندگان ماهر ایرانی و ترک، تلاش می‌کنیم تا تجربه‌ای متفاوت از پوشش را برای شما رقم بزنیم.\n\nماموریت ما ارتقای استایل آقایان ایرانی با ارائه جدیدترین ترندهای جهانی و حفظ استانداردهای کلاسیک است.',
                aboutImage: 'https://picsum.photos/1200/800?grayscale&random=about',
                
                heroImage: 'https://picsum.photos/1920/1080?grayscale&random=99',
                suitsSectionImage: 'https://picsum.photos/800/1200?random=100',
                shirtsSectionImage: 'https://picsum.photos/800/1200?random=101',
                blazersSectionImage: 'https://picsum.photos/800/1200?random=102',
                accessoriesSectionImage: 'https://picsum.photos/800/1200?random=103',
                bespokeSectionImage: 'https://picsum.photos/800/1200?random=104'
            };
            localStorage.setItem(K_SETTINGS, JSON.stringify(defaultSettings));
        }
    }

    private sanitize(input: string): string {
        if (typeof input !== 'string') return input;
        return input.replace(/[&<>"'/]/g, (char) => {
            const map: Record<string, string> = {
                '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#x27;', '/': '&#x2F;',
            };
            return map[char];
        });
    }

    private isValidUrl(string: string): boolean {
        try {
            const url = new URL(string);
            return url.protocol === "http:" || url.protocol === "https:" || string.startsWith('data:image/');
        } catch (_) {
            return string.startsWith('data:image/');
        }
    }

    private validateEmail(email: string): boolean {
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(email);
    }

    async login(email: string, pass: string, code?: string): Promise<User> {
        await delay(500);
        const safeEmail = this.sanitize(email).toLowerCase();
        let users: User[] = JSON.parse(localStorage.getItem(K_USERS) || '[]');
        const user = users.find(u => u.email.toLowerCase() === safeEmail && u.password === pass);
        
        if (!user) throw new Error('ایمیل یا رمز عبور اشتباه است.');

        // 30 Days in milliseconds
        const THIRTY_DAYS = 30 * 24 * 60 * 60 * 1000;
        const lastLogin = user.lastLogin || 0;
        const isSessionExpired = (Date.now() - lastLogin) > THIRTY_DAYS;

        // 2FA Logic: Enforce for Admins OR if session expired/new device logic (simulated by 30 days)
        // If provider is google, we assume 2FA is handled by Google
        const requires2FA = (user.role === 'admin' || isSessionExpired) && user.provider !== 'google';

        if (requires2FA) {
            if (!code) {
                throw new Error('2FA_REQUIRED');
            }

            if (!user.twoFactorSecret) {
                 // Should not happen if sendOtp is called properly, but as a fallback/security
                 throw new Error('کد دو مرحله‌ای تنظیم نشده است. لطفا مجددا تلاش کنید.');
            }

            const totp = new OTPAuth.TOTP({
                issuer: 'REZA Formal',
                label: user.email,
                algorithm: 'SHA1',
                digits: 6,
                period: 30,
                secret: OTPAuth.Secret.fromBase32(user.twoFactorSecret)
            });

            // Validate token (allow 2 window drift for network lag simulation)
            const delta = totp.validate({ token: code, window: 2 });
            
            if (delta === null) {
                throw new Error('کد دو مرحله‌ای نامعتبر است.');
            }
        }

        // Update Last Login
        user.lastLogin = Date.now();
        // Update in DB
        users = users.map(u => u.id === user.id ? user : u);
        localStorage.setItem(K_USERS, JSON.stringify(users));

        const { password, ...safeUser } = user;
        return safeUser as User;
    }

    async loginWithGoogle(email: string, name: string, avatar: string): Promise<User> {
        await delay(1000); // Simulate Google popup delay
        const safeEmail = this.sanitize(email).toLowerCase();
        let users: User[] = JSON.parse(localStorage.getItem(K_USERS) || '[]');
        
        let user = users.find(u => u.email.toLowerCase() === safeEmail);

        if (user) {
            // User exists, update login time and info
            user.lastLogin = Date.now();
            user.avatar = avatar; // Update avatar if changed on Google
            user.provider = 'google';
            // Note: We don't overwrite the role. If they were admin, they stay admin.
            
            users = users.map(u => u.id === user?.id ? user : u);
        } else {
            // Register new user via Google
            user = {
                id: 'user-g-' + Date.now(),
                name: this.sanitize(name),
                email: safeEmail,
                role: 'user',
                createdAt: Date.now(),
                lastLogin: Date.now(),
                avatar: avatar,
                provider: 'google'
                // No password for google users
            };
            users.push(user);
        }

        localStorage.setItem(K_USERS, JSON.stringify(users));
        const { password, ...safeUser } = user;
        return safeUser as User;
    }

    async sendOtp(email: string): Promise<string> {
        await delay(300);
        const safeEmail = this.sanitize(email).toLowerCase();
        const users: User[] = JSON.parse(localStorage.getItem(K_USERS) || '[]');
        const userIndex = users.findIndex(u => u.email.toLowerCase() === safeEmail);
        
        if (userIndex === -1) throw new Error('کاربر یافت نشد');
        
        let user = users[userIndex];
        
        // Ensure user has a secret
        if (!user.twoFactorSecret) {
            user.twoFactorSecret = new OTPAuth.Secret({ size: 20 }).base32;
            users[userIndex] = user;
            localStorage.setItem(K_USERS, JSON.stringify(users));
        }

        const totp = new OTPAuth.TOTP({
            issuer: 'REZA Formal',
            label: user.email,
            algorithm: 'SHA1',
            digits: 6,
            period: 30,
            secret: OTPAuth.Secret.fromBase32(user.twoFactorSecret)
        });

        return totp.generate();
    }

    async register(name: string, email: string, pass: string): Promise<User> {
        await delay(500);
        if (!this.validateEmail(email)) throw new Error('فرمت ایمیل نامعتبر است.');

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
            password: pass,
            role: 'user',
            createdAt: Date.now(),
            lastLogin: Date.now(), // Login immediately
            provider: 'local'
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
        if (sanitizedData.email) delete sanitizedData.email;
        if (sanitizedData.role) delete sanitizedData.role;

        const updatedUser = { ...users[idx], ...sanitizedData };
        users[idx] = updatedUser;
        localStorage.setItem(K_USERS, JSON.stringify(users));

        const { password, ...safeUser } = updatedUser;
        return safeUser as User;
    }

    async getUsers(): Promise<User[]> {
        await delay(300);
        const users: User[] = JSON.parse(localStorage.getItem(K_USERS) || '[]');
        // Remove passwords before returning
        return users.map(({ password, ...user }) => user as User);
    }

    async getProducts(): Promise<Product[]> {
        const stored = localStorage.getItem(K_PRODUCTS);
        return stored ? JSON.parse(stored) : [];
    }

    async saveProduct(product: Product): Promise<Product> {
        await delay(400);
        
        const MAX_DATAURL_LENGTH = 100000; // ~100KB per image stored in localStorage
        const images = (product.images || []).filter(img => this.isValidUrl(img)).map(img => {
            if (typeof img === 'string' && img.startsWith('data:image/') && img.length > MAX_DATAURL_LENGTH) {
                // Drop overly large data URLs to avoid localStorage quota issues
                return null;
            }
            return img;
        }).filter(Boolean) as string[];
        if (images.length === 0 && product.image && this.isValidUrl(product.image)) {
            images.push(product.image);
        }
        // Fallback image if none provided
        if (images.length === 0) {
            images.push('https://picsum.photos/400/600');
        }

        const safeProduct: Product = {
            ...product,
            name: this.sanitize(product.name),
            category: this.sanitize(product.category),
            description: this.sanitize(product.description),
            short: this.sanitize(product.short),
            fabric: product.fabric ? this.sanitize(product.fabric) : undefined,
            images: images,
            image: images[0], // Set primary image to first in list
            stock: product.stock !== undefined ? Number(product.stock) : 0
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

    async createOrder(userId: string, items: any[], total: number, address: string): Promise<Order> {
        await delay(600);
        
        // 1. Validate Stock
        const products: Product[] = JSON.parse(localStorage.getItem(K_PRODUCTS) || '[]');
        for (const item of items) {
            const product = products.find(p => p.id === item.id);
            if (!product) throw new Error(`محصول ${item.name} یافت نشد.`);
            if ((product.stock || 0) < item.qty) {
                throw new Error(`موجودی محصول ${item.name} کافی نیست. موجودی فعلی: ${product.stock}`);
            }
        }

        // 2. Deduct Stock
        for (const item of items) {
            const product = products.find(p => p.id === item.id);
            if (product) {
                product.stock = (product.stock || 0) - item.qty;
            }
        }
        localStorage.setItem(K_PRODUCTS, JSON.stringify(products));

        // 3. Create Order
        const safeAddress = this.sanitize(address);
        const orders: Order[] = JSON.parse(localStorage.getItem(K_ORDERS) || '[]');
        const newOrder: Order = {
            id: 'ORD-' + Date.now().toString().slice(-6),
            userId,
            items,
            total,
            status: 'pending',
            createdAt: Date.now(),
            shippingAddress: safeAddress
        };
        orders.unshift(newOrder);
        localStorage.setItem(K_ORDERS, JSON.stringify(orders));
        
        return newOrder;
    }

    async cancelOrder(orderId: string): Promise<void> {
        await delay(500);
        const orders: Order[] = JSON.parse(localStorage.getItem(K_ORDERS) || '[]');
        const order = orders.find(o => o.id === orderId);

        if (!order) throw new Error('سفارش یافت نشد.');
        if (order.status !== 'pending') throw new Error('امکان لغو این سفارش وجود ندارد.');

        // 1. Restore Stock
        const products: Product[] = JSON.parse(localStorage.getItem(K_PRODUCTS) || '[]');
        for (const item of order.items) {
            const product = products.find(p => p.id === item.id);
            if (product) {
                product.stock = (product.stock || 0) + item.qty;
            }
        }
        localStorage.setItem(K_PRODUCTS, JSON.stringify(products));

        // 2. Update Status
        order.status = 'cancelled';
        localStorage.setItem(K_ORDERS, JSON.stringify(orders));
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
            const validStatuses: Order['status'][] = ['pending', 'processing', 'shipped', 'delivered', 'cancelled'];
            if (validStatuses.includes(status)) {
                 if (status === 'cancelled' && order.status !== 'cancelled') {
                     const products: Product[] = JSON.parse(localStorage.getItem(K_PRODUCTS) || '[]');
                     for (const item of order.items) {
                         const product = products.find(p => p.id === item.id);
                         if (product) product.stock = (product.stock || 0) + item.qty;
                     }
                     localStorage.setItem(K_PRODUCTS, JSON.stringify(products));
                 }
                 
                 order.status = status;
                 localStorage.setItem(K_ORDERS, JSON.stringify(orders));
            }
        }
    }

    async sendMessage(name: string, email: string, message: string): Promise<void> {
        await delay(500);
        if (!name || !email || !message) throw new Error("تمام فیلدها الزامی هستند");
        if (!this.validateEmail(email)) throw new Error("فرمت ایمیل نامعتبر است");

        const msgs: ContactMessage[] = JSON.parse(localStorage.getItem(K_MESSAGES) || '[]');
        const newMsg: ContactMessage = {
            id: 'msg-' + Date.now(),
            name: this.sanitize(name),
            email: this.sanitize(email),
            message: this.sanitize(message),
            createdAt: Date.now(),
            read: false
        };
        msgs.unshift(newMsg);
        localStorage.setItem(K_MESSAGES, JSON.stringify(msgs));
    }

    async getMessages(): Promise<ContactMessage[]> {
        await delay(300);
        return JSON.parse(localStorage.getItem(K_MESSAGES) || '[]');
    }

    async markMessageAsRead(id: string): Promise<void> {
        await delay(200);
        const msgs: ContactMessage[] = JSON.parse(localStorage.getItem(K_MESSAGES) || '[]');
        const msgIndex = msgs.findIndex(m => m.id === id);
        if (msgIndex > -1) {
            msgs[msgIndex].read = true;
            localStorage.setItem(K_MESSAGES, JSON.stringify(msgs));
        }
    }

    async getSettings(): Promise<SiteSettings> {
        await delay(200);
        const settings = localStorage.getItem(K_SETTINGS);
        if (settings) return JSON.parse(settings);
        return {
             aboutTitle: 'داستان رضا فرمال',
             aboutDescription: '...',
             aboutImage: 'https://picsum.photos/1200/800?grayscale',
             heroImage: 'https://picsum.photos/1920/1080?grayscale&random=99',
             suitsSectionImage: 'https://picsum.photos/800/1200?random=100',
             shirtsSectionImage: 'https://picsum.photos/800/1200?random=101',
             blazersSectionImage: 'https://picsum.photos/800/1200?random=102',
             accessoriesSectionImage: 'https://picsum.photos/800/1200?random=103',
             bespokeSectionImage: 'https://picsum.photos/800/1200?random=104'
        };
    }

    async saveSettings(settings: SiteSettings): Promise<void> {
        await delay(400);
        const safeSettings: SiteSettings = {
            aboutTitle: this.sanitize(settings.aboutTitle),
            aboutDescription: this.sanitize(settings.aboutDescription),
            aboutImage: this.isValidUrl(settings.aboutImage) ? settings.aboutImage : '',
            
            heroImage: this.isValidUrl(settings.heroImage) ? settings.heroImage : '',
            suitsSectionImage: this.isValidUrl(settings.suitsSectionImage) ? settings.suitsSectionImage : '',
            shirtsSectionImage: this.isValidUrl(settings.shirtsSectionImage) ? settings.shirtsSectionImage : '',
            blazersSectionImage: this.isValidUrl(settings.blazersSectionImage) ? settings.blazersSectionImage : '',
            accessoriesSectionImage: this.isValidUrl(settings.accessoriesSectionImage) ? settings.accessoriesSectionImage : '',
            bespokeSectionImage: this.isValidUrl(settings.bespokeSectionImage) ? settings.bespokeSectionImage : '',
        };
        localStorage.setItem(K_SETTINGS, JSON.stringify(safeSettings));
    }
    
    async getStats() {
        await delay(200);
        const products = JSON.parse(localStorage.getItem(K_PRODUCTS) || '[]');
        const orders: Order[] = JSON.parse(localStorage.getItem(K_ORDERS) || '[]');
        const users = JSON.parse(localStorage.getItem(K_USERS) || '[]');
        const messages: ContactMessage[] = JSON.parse(localStorage.getItem(K_MESSAGES) || '[]');
        
        const validOrders = orders.filter(o => o.status !== 'cancelled');
        const totalRevenue = validOrders.reduce((acc: number, curr: Order) => acc + curr.total, 0);
        const unreadMessages = messages.filter(m => !m.read).length;
        
        return {
            productsCount: products.length,
            ordersCount: orders.length,
            usersCount: users.length,
            revenue: totalRevenue,
            messagesCount: unreadMessages
        };
    }
}

export const db = new DatabaseService();