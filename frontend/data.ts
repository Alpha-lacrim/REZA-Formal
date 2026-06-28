import { Product } from './types';

export const products: Product[] = [
  {
    id: 'suit-charcoal-check',
    name: 'کت و شلوار چهارخانه ذغالی',
    price: 16800000,
    currency: 'Toman',
    image: '/images/suit/charcoal-check.jpg',
    images: ['/images/suit/charcoal-check.jpg'],
    short: 'سه تکه رسمی با پارچه پشم',
    description: 'کت و شلوار سه تکه با بافت ظریف، مناسب جلسات کاری و مراسم رسمی.',
    category: 'suits',
    fabric: 'پشم',
    stock: 5
  },
  {
    id: 'suit-midnight-navy',
    name: 'کت و شلوار سرمه‌ای کلاسیک',
    price: 15500000,
    currency: 'Toman',
    image: '/images/suit/midnight.jpg',
    images: ['/images/suit/midnight.jpg'],
    short: 'برش مدرن برای موقعیت‌های رسمی',
    description: 'مدلی کلاسیک با رنگ سرمه‌ای عمیق و دوخت تمیز برای استفاده روزمره رسمی.',
    category: 'suits',
    fabric: 'پشم و ابریشم',
    stock: 8
  },
  {
    id: 'suit-burgundy-signature',
    name: 'کت و شلوار زرشکی سیگنیچر',
    price: 18000000,
    currency: 'Toman',
    image: '/images/suit/sp_red_suit.jpg',
    images: ['/images/suit/sp_red_suit.jpg'],
    short: 'انتخاب شاخص برای مراسم',
    description: 'رنگ زرشکی عمیق با ظاهر مجلسی برای مشتریانی که به دنبال تمایز هستند.',
    category: 'suits',
    fabric: 'ابریشم و پشم',
    stock: 2
  },
  {
    id: 'shirt-white-classic',
    name: 'پیراهن کلاسیک سفید',
    price: 2850000,
    currency: 'Toman',
    image: '/images/shirts/s0.jpg',
    images: ['/images/shirts/s0.jpg'],
    short: 'پیراهن رسمی روزمره',
    description: 'پیراهن سفید با بافت ریز و پارچه درجه‌یک برای تکمیل استایل رسمی.',
    category: 'shirts',
    fabric: 'پنبه',
    stock: 20
  },
  {
    id: 'shirt-navy-premium',
    name: 'پیراهن سرمه‌ای پریمیوم',
    price: 3100000,
    currency: 'Toman',
    image: '/images/shirts/s1.jpg',
    images: ['/images/shirts/s1.jpg'],
    short: 'رنگ عمیق و پارچه لطیف',
    description: 'پیراهنی مناسب کت‌های رسمی، جلسات کاری و مراسم شبانه.',
    category: 'shirts',
    fabric: 'پنبه و ابریشم',
    stock: 18
  },
  {
    id: 'blazer-ms63',
    name: 'کت رسمی MS-63',
    price: 17500000,
    currency: 'Toman',
    image: '/images/suit/MS-63.webp',
    images: ['/images/suit/MS-63.webp'],
    short: 'دوخت سفارشی ممتاز',
    description: 'کت رسمی با دوخت دقیق و پارچه ممتاز برای موقعیت‌های سطح بالا.',
    category: 'blazers',
    fabric: 'پشم',
    stock: 4
  },
  {
    id: 'accessory-brooch',
    name: 'بج سینه رسمی',
    price: 650000,
    currency: 'Toman',
    image: '/images/accessories/brooch.avif',
    images: ['/images/accessories/brooch.avif'],
    short: 'اکسسوری دست‌ساز لوکس',
    description: 'بج سینه رسمی برای تکمیل ظاهر کت و شلوار مردانه.',
    category: 'accessories',
    fabric: 'فلز',
    stock: 30
  },
  {
    id: 'accessory-pocket-square',
    name: 'دستمال جیب ابریشمی',
    price: 450000,
    currency: 'Toman',
    image: '/images/accessories/Understanding_pocket_squares_03396d68-5ee7-45cd-aaae-7f72913caa43_600x600.webp',
    images: ['/images/accessories/Understanding_pocket_squares_03396d68-5ee7-45cd-aaae-7f72913caa43_600x600.webp'],
    short: 'جزئیات ظریف برای استایل رسمی',
    description: 'دستمال جیب با پارچه ابریشمی و نقش رسمی برای تکمیل پوشش.',
    category: 'accessories',
    fabric: 'ابریشم',
    stock: 40
  }
];
