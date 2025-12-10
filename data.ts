import { Product, Translations } from './types';

export const products: Product[] = [
  {
    id: "suit-grey-check-3p",
    name: "کت‌ و شلوار سه تکه چهارخانه",
    price: 16800000,
    currency: "Toman",
    image: "https://images.unsplash.com/photo-1594938298603-c8148c47e356?auto=format&fit=crop&q=80&w=800",
    short: "پارچه پشم مرینو چهارخانه",
    description: "کت‌ و شلوار سه تکه چهارخانه با بافت ظریف و رنگ ذغالی، انتخابی بی‌نظیر برای جلسات کاری مهم و مراسم رسمی. دوخت اسلیم‌فیت و جلیقه کلاسیک، استایلی مقتدر و جذاب می‌سازد.",
    category: "suits",
    fabric: "پشم"
  },
  {
    id: "suit-navy-royal",
    name: "کت‌ و شلوار سرمه‌ای رویال",
    price: 15500000,
    currency: "Toman",
    image: "https://images.unsplash.com/photo-1593030761757-71bd90dbe3e4?auto=format&fit=crop&q=80&w=800",
    short: "سرمه‌ای کلاسیک",
    description: "کت‌ و شلوار سرمه‌ای رویال، نماد قدرت و اعتماد به نفس. با برش مدرن و پارچه ضدچروک، مناسب استفاده روزمره مدیران و رویدادهای شبانه. به همراه کراوات قرمز برای تضاد رنگی جذاب.",
    category: "suits",
    fabric: "پشم و ابریشم"
  },
  {
    id: "suit-brown-vintage",
    name: "کت‌ و شلوار قهوه‌ای وینتیج",
    price: 17200000,
    currency: "Toman",
    image: "https://images.unsplash.com/photo-1507679799987-c73779587ccf?auto=format&fit=crop&q=80&w=800",
    short: "سه تکه قهوه‌ای سوخته",
    description: "این ست سه تکه با رنگ قهوه‌ای خاص و بافت غنی، استایلی متفاوت و گرم برای فصول سرد سال ارائه می‌دهد. مناسب آقایانی که به دنبال تمایز و وقار کلاسیک هستند.",
    category: "suits",
    fabric: "پشم فلانل"
  },
  {
    id: "suit-grey-formal",
    name: "کت‌ و شلوار طوسی رسمی",
    price: 16500000,
    currency: "Toman",
    image: "https://images.unsplash.com/photo-1617137968427-85924c800a22?auto=format&fit=crop&q=80&w=800",
    short: "طوسی مات سه تکه",
    description: "کت و شلوار ذغالی مات با طراحی مینیمال و برش دقیق. به همراه جلیقه هم‌رنگ و کراوات مشکی طرح‌دار، گزینه‌ای همیشگی و شیک برای محیط‌های اداری و قرارهای رسمی.",
    category: "suits",
    fabric: "پشم"
  },
  {
    id: "suit-burgundy-sig",
    name: "کت‌ و شلوار زرشکی سیگنیچر",
    price: 18000000,
    currency: "Toman",
    image: "https://images.unsplash.com/photo-1552374196-c4e7ffc6e126?auto=format&fit=crop&q=80&w=800",
    short: "زرشکی مجلسی",
    description: "رنگ زرشکی عمیق این کت‌وشلوار سه تکه، آن را به گزینه‌ای ایده‌آل برای دامادها و مراسم جشن تبدیل کرده است. ترکیبی از جسارت رنگی و اصالت دوخت.",
    category: "suits",
    fabric: "ابریشم و پشم"
  },
  {
    id: "suit-light-grey-summer",
    name: "کت‌ و شلوار طوسی روشن",
    price: 14900000,
    currency: "Toman",
    image: "https://images.unsplash.com/photo-1497339100210-9e87df79c218?auto=format&fit=crop&q=80&w=800",
    short: "طوسی روشن با کراوات قهوه‌ای",
    description: "رنگ طوسی روشن و پارچه سبک این مدل، آن را برای مراسم روز و فصول گرم سال مناسب می‌سازد. ترکیب آن با اکسسوری‌های قهوه‌ای، استایلی فرش و جوان‌پسند می‌سازد.",
    category: "suits",
    fabric: "کتان و پشم"
  },
  {
    id: "accessory-brooch",
    name: "بج سینه رسمی دست‌ساز",
    price: 650000,
    currency: "Toman",
    image: "https://picsum.photos/id/1060/400/500",
    short: "بج دست‌ساز لوکس",
    description: "بج سینه رسمی با طراحی کلاسیک و ساخت دست‌ساز، تکمیل‌کننده‌ ظاهری شیک و مجلسی برای پیراهن و کت‌وشلوار مردانه است.",
    category: "accessories"
  },
  {
    id: "shirt-luxury-s6",
    name: "پیراهن لاکچری مردانه",
    price: 4200000,
    currency: "Toman",
    image: "https://picsum.photos/id/1059/400/500",
    short: "پیراهن با بافت خاص پریمیوم",
    description: "پیراهن لاکچری مردانه تهیه‌شده از بهترین الیاف با طراحی انحصاری، مناسب برای استایل‌های رسمی و مجلسی. بافت خاص این پیراهن، جلوه‌ای اصیل و فاخر به پوشش شما می‌بخشد.",
    category: "shirts"
  },
  {
    id: "blazer-premium-b2",
    name: "کت پریمیوم درز تک",
    price: 14800000,
    currency: "Toman",
    image: "https://picsum.photos/id/338/400/500",
    short: "کت پریمیوم کلاسیک مردانه",
    description: "کت پریمیوم درز تک با دوختی دقیق و پارچه‌ای باکیفیت، انتخابی لوکس برای مردانی است که در رویدادهای رسمی و مهم به دنبال ظاهری شیک، موقر و حرفه‌ای هستند.",
    category: "blazers"
  },
  {
    id: "accessory-tie-premium",
    name: "کراوات ابریشمی فاخر مردانه",
    price: 1800000,
    currency: "Toman",
    image: "https://picsum.photos/id/823/400/500",
    short: "کراوات ابریشمی لوکس",
    description: "کراوات ابریشمی فاخر با بافتی باکیفیت و رنگ‌های جذاب، مناسب برای استایل رسمی و ظاهری شیک و حرفه‌ای.",
    category: "accessories"
  },
  {
    "id": "blazer-ms63",
    "name": "کت رسمی MS-63",
    "price": 17500000,
    "currency": "Toman",
    "image": "https://picsum.photos/id/175/400/500",
    "short": "دوخت سفارشی ممتاز",
    "description": "کت رسمی MS-63 با دوخت سفارشی و پارچه ممتاز، انتخابی لوکس برای افرادی است که به دنبال تلفیق زیبایی سنتی و طراحی مدرن هستند. مناسب استفاده در مراسم و محیط‌های کاری سطح‌بالا.",
    "category": "blazers"
  },
  {
    "id": "shirt-classic-s0",
    "name": "پیراهن کلاسیک سفید مردانه",
    "price": 2850000,
    "currency": "Toman",
    "image": "https://picsum.photos/id/1/400/500",
    "short": "پیراهن سفید رسمی",
    "description": "پیراهن کلاسیک سفید با بافت ریز و پارچه‌ای درجه‌یک، مناسب برای انواع کت و شلوار رسمی. این مدل همواره انتخابی مطمئن، حرفه‌ای و شیک برای استایل مردانه است.",
    "category": "shirts"
  },
  {
    "id": "shirt-navy-s1",
    "name": "پیراهن سرمه‌ای مردانه",
    "price": 3100000,
    "currency": "Toman",
    "image": "https://picsum.photos/id/2/400/500",
    "short": "پیراهن ابریشمی مخلوط",
    "description": "پیراهن سرمه‌ای با طراحی معاصر و بافتی باکیفیت، مناسب استایل رسمی، جلسات مهم و مراسم مجلسی. این رنگ همیشه ظاهری جدی، شیک و قدرتمند ایجاد می‌کند.",
    "category": "shirts"
  },
  {
    "id": "accessory-pocketquare",
    "name": "دستمال جیب رسمی ابریشمی",
    "price": 450000,
    "currency": "Toman",
    "image": "https://picsum.photos/id/3/400/500",
    "short": "دستمال جیبی ابریشمی",
    "description": "دستمال جیب رسمی با پارچه ابریشمی و نقوش ظریف، یک اکسسوری شیک برای تکمیل استایل رسمی و افزودن جذابیت بصری به کت‌وشلوار است.",
    "category": "accessories"
  }
];

export const translations: Translations = {
  "fa": {
    "nav_suits": "کت و شلوار",
    "nav_new": "جدیدترین‌ها",
    "nav_shirts": "پیراهن",
    "nav_bespoke": "بلیزر",
    "nav_accessories": "اکسسوری",
    "hero_est": "از ۱۹۸۴ تا امروز • تهران",
    "hero_title": "Refining the <br><span class='italic text-lux-gold'>Gentleman</span>",
    "hero_subtitle": "در رضا فرمال زیبایی، وقار و ظرافت هنر دوخت ایتالیا و ترکیه را تجربه کنید.",
    "btn_shop": "مشاهده کلکسیون",
    "btn_book": "رزرو و هماهنگی",

    "col_title": "امضای کار فروشگاه",
    "view_catalog": "مشاهده تمام محصولات",

    "atelier_sub": "آتلیه دوخت",
    "atelier_title": "ظرافت و زیبایی در پوشش",
    "atelier_desc": "خدمات سفارشی ما نهایت زیبایی و ظرافت در پوشش است. با مشاوره خصوصی و انتخاب پارچه‌ها، لباسی کاملاً اختصاصی برای شما طراحی می‌شود.",
    "btn_discover": "درخواست دوخت سفارشی",

    "blazer_sub": "بلیزر مردانه",
    "blazer_title": "سادگی و الگانس در هر حرکت",
    "blazer_desc": "کالکسیون بلیزرهای ما ترکیبی از کیفیت بالا و طراحی کلاسیک است. برای هر مناسبت، بلیزری پرفشنالی که شخصیت شما را برجسته می‌کند.",
    "btn_blazer_shop": "مشاهده بلیزرها",

    "feat_1_title": "دوختی دقیق و استادانه",
    "feat_1_desc": "دوخت و فرم‌دهی دقیق با روش‌های نوین و تخصصی برای تناسب کامل بدن با لباس شما.",
    "feat_2_title": "پارچه‌های ایتالیایی و ترکیه‌ای",
    "feat_2_desc": "تهیه‌شده از بهترین کارخانه‌های پارچه‌بافی داخل و خارج کشور",
    "feat_3_title": "ارسال به سراسر کشور",
    "feat_3_desc": "ارسال رایگان و سریع برای همه سفارش‌های خصوصی",

    "news_title": "عضو باشگاه مشتریان ما شوید",
    "news_desc": "برای اطلاع از محصولات جدید و رویدادهای خصوصی ثبت ‌نام کنید.",
    "btn_sub": "ثبت‌ نام",

    "footer_desc": "جایی که کلاس، اصالت و جدیدترین ترندهای دنیای مد مردانه در قالب یک مجموعه منتخب ارائه می‌شوند",
    "footer_shop": "محصولات",
    "footer_company": "فروشگاه",
    "footer_about": "درباره ما",
    "footer_shirts": "پیراهن",
    "footer_outer": "کت و پالتو",

    "label_fabric": "جنس پارچه",
    "label_price": "قیمت",
    "opt_all": "همه",
    "opt_under_1400": "کمتر از ۱۴ میلیون",
    "opt_1400_2000": "۱۴ تا ۲۰ میلیون",
    "opt_above_2000": "بیش از ۲۰ میلیون",

    "btn_back": "بازگشت",
    "btn_add": "افزودن به سبد",
    "btn_remove": "حذف",
    "btn_checkout": "تسویه حساب",
    "btn_continue": "ادامه خرید",

    "cart_empty": "سبد خرید خالی است",
    "cart_total": "مجموع",
    "msg_added": "به سبد خرید اضافه شد",

    "currency": "تومان",
    "mini_cart_title": "سبد خرید",
    "btn_close": "بستن",

    "page_loading_product": "در حال بارگذاری محصول…",
    "product_not_found": "محصول یافت نشد.",
    "cart_title": "سبد خرید شما",
    "loading": "در حال بارگذاری…",

    "newsletter_invalid": "لطفاً یک آدرس ایمیل معتبر وارد کنید.",
    "msg_subscribed": "با تشکر — شما با موفقیت ثبت‌ نام شدید",

    "auth_register": "ثبت‌‌ نام",
    "auth_login": "ورود",
    "auth_logout": "خروج",
    "auth_email": "ایمیل",
    "auth_password": "رمز عبور",
    "auth_name": "نام",
    "auth_register_success": "ثبت‌ نام با موفقیت انجام شد، لطفاً وارد شوید.",
    "auth_login_failed": "ایمیل یا رمز عبور نامعتبر است",
    "auth_logged_in_as": "ورود به عنوان {name}",
    "btn_profile": "پروفایل"
  }
};