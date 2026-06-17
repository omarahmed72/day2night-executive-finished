/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { CategoryInfo, Product, Supplier } from './types';

// تاريخ النظام المحاكي (15 يونيو 2026 ليتوافق مع وقت النظام الحالي المعطى)
export const SYSTEM_TODAY = '2026-06-15';

export const CATEGORIES: CategoryInfo[] = [
  {
    key: 'groceries',
    nameAr: 'مواد تموينية وجافة',
    nameEn: 'Groceries & Dry Foods',
    iconName: 'ShoppingBag',
    color: 'emerald',
  },
  {
    key: 'dairy',
    nameAr: 'ألبان وأجبان وصناعاتها',
    nameEn: 'Dairy & Cheese',
    iconName: 'Milk',
    color: 'blue',
  },
  {
    key: 'meat',
    nameAr: 'لحوم ودواجن وأسماك',
    nameEn: 'Butchery & Poultry',
    iconName: 'Flame',
    color: 'red',
  },
  {
    key: 'produce',
    nameAr: 'خضروات وفواكه طازجة',
    nameEn: 'Fresh Produce',
    iconName: 'Leaf',
    color: 'lime',
  },
  {
    key: 'bakery',
    nameAr: 'مخبوزات وحلويات المول',
    nameEn: 'Bakery & Sweets',
    iconName: 'Cookie',
    color: 'amber',
  },
  {
    key: 'cleaning',
    nameAr: 'منظفات ومستلزمات منزلية',
    nameEn: 'Detergents & Cleaning',
    iconName: 'Sparkles',
    color: 'cyan',
  },
  {
    key: 'cosmetics',
    nameAr: 'عناية شخصية وتجميل',
    nameEn: 'Cosmetics & Personal Care',
    iconName: 'Smile',
    color: 'pink',
  },
  {
    key: 'electronics',
    nameAr: 'أجهزة كهربائية ومنزلية',
    nameEn: 'Electronics & Appliances',
    iconName: 'Tv',
    color: 'indigo',
  },
];

export const INITIAL_SUPPLIERS: Supplier[] = [
  { id: 'sup-1', nameAr: 'جهينة لمنتجات الألبان', nameEn: 'Juhayna Dairy Corp', phone: '16630', email: 'info@juhayna.com', category: 'dairy' },
  { id: 'sup-2', nameAr: 'دومتي للأغذية', nameEn: 'Domty Foods', phone: '16115', email: 'sales@domty.com', category: 'dairy' },
  { id: 'sup-3', nameAr: 'الشركة المصرية لتجارة اللحوم', nameEn: 'Egyptian Meat Co', phone: '0223456789', email: 'meat@egyptian.com', category: 'meat' },
  { id: 'sup-4', nameAr: 'مزارع دينا للفواكه والخضار', nameEn: 'Dina Farms', phone: '19044', email: 'produce@dinafarms.com', category: 'produce' },
  { id: 'sup-5', nameAr: 'هلال ومصيلحي للمنظفات', nameEn: 'Helal & Moselhy Soap', phone: '01012345678', email: 'helal@clean.com', category: 'cleaning' },
  { id: 'sup-6', nameAr: 'العربي جروب للأجهزة', nameEn: 'El-Araby Group', phone: '19319', email: 'service@elaraby.com', category: 'electronics' },
];

export const INITIAL_PRODUCTS: Product[] = [
  {
    id: 'p-1',
    nameAr: 'حليب جهينة كامل الدسم 1 لتر',
    nameEn: 'Juhayna Full Cream Milk 1L',
    barcode: '6221007011012',
    category: 'dairy',
    shelfStock: 120,
    warehouseStock: 450,
    minStockAlert: 100,
    buyPrice: 32.50,
    sellPrice: 38.00,
    expirationDate: '2026-07-20', // بعد 35 يومًا - قرب ينتهي (أقل من 60 يوم)
    supplierName: 'جهينة لمنتجات الألبان',
    supplierPhone: '16630',
    batchNumber: 'B-JUH-992',
    lastUpdated: '2026-06-10',
  },
  {
    id: 'p-2',
    nameAr: 'جبنة دومتي فيتا علبة 500 جرام',
    nameEn: 'Domty Feta Cheese 500g',
    barcode: '6224000329105',
    category: 'dairy',
    shelfStock: 80,
    warehouseStock: 200,
    minStockAlert: 90, // منخفض المخزون على الرفوف
    buyPrice: 28.00,
    sellPrice: 34.00,
    expirationDate: '2026-08-01', // بعد 47 يومًا - قرب ينتهي (أقل من 60 يوم)
    supplierName: 'دومتي للأغذية',
    supplierPhone: '16115',
    batchNumber: 'B-DOM-331',
    lastUpdated: '2026-06-12',
  },
  {
    id: 'p-3',
    nameAr: 'زبادي طبيعي المراعي 105 جرام',
    nameEn: 'Almarai Natural Yogurt 105g',
    barcode: '6281006112024',
    category: 'dairy',
    shelfStock: 250,
    warehouseStock: 100,
    minStockAlert: 150,
    buyPrice: 6.80,
    sellPrice: 8.50,
    expirationDate: '2026-06-25', // بعد 10 أيام - قرب ينتهي جداً! (أقل من 60 يوم)
    supplierName: 'جهينة لمنتجات الألبان', // فرعي
    supplierPhone: '16630',
    batchNumber: 'B-ALM-102',
    lastUpdated: '2026-06-14',
  },
  {
    id: 'p-4',
    nameAr: 'مكرونة ريجينا بنة (قلم) 400 جرام',
    nameEn: 'Regina Penne Pasta 400g',
    barcode: '6221034002427',
    category: 'groceries',
    shelfStock: 15, // منخفض جداً
    warehouseStock: 0,  // عجز تام
    minStockAlert: 50,
    buyPrice: 18.00,
    sellPrice: 22.00,
    expirationDate: '2026-05-10', // منتهي الصلاحية منذ 36 يومًا! ❌
    supplierName: 'دومتي للأغذية',
    supplierPhone: '16115',
    batchNumber: 'B-REG-011',
    lastUpdated: '2026-06-01',
  },
  {
    id: 'p-5',
    nameAr: 'زيت عباد الشمس كريستال 1.6 لتر',
    nameEn: 'Crystal Sunflower Oil 1.6L',
    barcode: '6221324551093',
    category: 'groceries',
    shelfStock: 45,
    warehouseStock: 120,
    minStockAlert: 40,
    buyPrice: 120.00,
    sellPrice: 145.00,
    expirationDate: '2026-08-10', // بعد 56 يومًا - قرب ينتهي (أقل من 60 يوم)
    supplierName: 'دومتي للأغذية',
    supplierPhone: '16115',
    batchNumber: 'B-CRY-880',
    lastUpdated: '2026-06-11',
  },
  {
    id: 'p-6',
    nameAr: 'فراخ كوكي مجمده صدور بانيه 1 كيلو',
    nameEn: 'Koki Frozen Chicken Pane 1kg',
    barcode: '6221056441019',
    category: 'meat',
    shelfStock: 60,
    warehouseStock: 180,
    minStockAlert: 50,
    buyPrice: 165.00,
    sellPrice: 195.00,
    expirationDate: '2026-12-15', // صالح لستة أشهر
    supplierName: 'الشركة المصرية لتجارة اللحوم',
    supplierPhone: '0223456789',
    batchNumber: 'B-KOK-404',
    lastUpdated: '2026-06-05',
  },
  {
    id: 'p-7',
    nameAr: 'تفاح أحمر سكري إيطالي طازج 1 كيلو',
    nameEn: 'Fresh Italian Red Apple 1kg',
    barcode: '0000000000101',
    category: 'produce',
    shelfStock: 90,
    warehouseStock: 150,
    minStockAlert: 60,
    buyPrice: 60.00,
    sellPrice: 75.00,
    expirationDate: '2026-06-30', // بعد 15 يومًا - قرب ينتهي (فاكهة طازجة)
    supplierName: 'مزارع دينا للفواكه والخضار',
    supplierPhone: '19044',
    batchNumber: 'B-APP-772',
    lastUpdated: '2026-06-14',
  },
  {
    id: 'p-8',
    nameAr: 'كرواسون زبدة طازج بالشوكولاتة (حبة)',
    nameEn: 'Fresh Butter Chocolate Croissant',
    barcode: '0000000000202',
    category: 'bakery',
    shelfStock: 40,
    warehouseStock: 0,
    minStockAlert: 20,
    buyPrice: 12.00,
    sellPrice: 18.00,
    expirationDate: '2026-06-18', // بعد 3 أيام - قرب ينتهي جداً! (مخبوز لليوم)
    supplierName: 'مخبوزات وحلويات المول',
    supplierPhone: 'داخلي',
    batchNumber: 'B-BAK-151',
    lastUpdated: '2026-06-15',
  },
  {
    id: 'p-9',
    nameAr: 'مسحوق غسيل أريال للغسالات الأوتوماتيك 4 كيلو',
    nameEn: 'Ariel Automatic Detergent 4kg',
    barcode: '4015600508561',
    category: 'cleaning',
    shelfStock: 50,
    warehouseStock: 150,
    minStockAlert: 30,
    buyPrice: 280.00,
    sellPrice: 320.00,
    expirationDate: '2029-06-15', // صالح لسنوات
    supplierName: 'هلال ومصيلحي للمنظفات',
    supplierPhone: '01012345678',
    batchNumber: 'B-ARI-202',
    lastUpdated: '2026-06-15',
  },
  {
    id: 'p-10',
    nameAr: 'شوكولاتة جالاكسي بندق 36 جرام',
    nameEn: 'Galaxy Hazelnut Chocolate 36g',
    barcode: '6221198081115',
    category: 'bakery',
    shelfStock: 140,
    warehouseStock: 300,
    minStockAlert: 80,
    buyPrice: 15.00,
    sellPrice: 19.00,
    expirationDate: '2026-06-05', // منتهي من 10 أيام ❌
    supplierName: 'دومتي للأغذية',
    supplierPhone: '16115',
    batchNumber: 'B-GAL-301',
    lastUpdated: '2026-05-20',
  },
  {
    id: 'p-11',
    nameAr: 'معجون أسنان كولجيت حماية مكثفة 75 مل',
    nameEn: 'Colgate Max Fresh Toothpaste 75ml',
    barcode: '8718951234567',
    category: 'cosmetics',
    shelfStock: 15,
    warehouseStock: 80,
    minStockAlert: 25, // إجمالي منخفض على الرفوف
    buyPrice: 38.00,
    sellPrice: 46.00,
    expirationDate: '2027-02-15', // صالح لأكثر من 60 يومًا
    supplierName: 'هلال ومصيلحي للمنظفات',
    supplierPhone: '01012345678',
    batchNumber: 'B-COL-711',
    lastUpdated: '2026-06-03',
  },
  {
    id: 'p-12',
    nameAr: 'خلاط تورنيدو 1.5 لتر 600 وات مطحنة',
    nameEn: 'Tornado Blender 1.5L 600W',
    barcode: '6222019011244',
    category: 'electronics',
    shelfStock: 8,
    warehouseStock: 14,
    minStockAlert: 5,
    buyPrice: 1100.00,
    sellPrice: 1350.00,
    expirationDate: '2031-12-30', // لا تنتهي فعلياً أو آمنة جداً
    supplierName: 'العربي جروب للأجهزة',
    supplierPhone: '19319',
    batchNumber: 'B-TOR-001',
    lastUpdated: '2026-06-11',
  }
];

// دالة حساب فارق الأيام
export function getDaysDifference(date1Str: string, date2Str: string): number {
  const d1 = new Date(date1Str);
  const d2 = new Date(date2Str);
  
  // تصفير الساعات للحصول على حساب فلكي سليم للأيام
  d1.setHours(0, 0, 0, 0);
  d2.setHours(0, 0, 0, 0);
  
  const diffTime = d1.getTime() - d2.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

// تحديد حالة المنتج من خلال تاريخ اليوم وتاريخ الصلاحية والافتراضي 60 يوماً
export function getProductExpiryStatus(
  expirationDate: string, 
  todayStr: string = SYSTEM_TODAY,
  thresholdDays: number = 60
): { status: 'valid' | 'near_expiry' | 'expired'; daysRemaining: number } {
  const daysVal = getDaysDifference(expirationDate, todayStr);
  
  if (daysVal <= 0) {
    return { status: 'expired', daysRemaining: daysVal };
  } else if (daysVal <= thresholdDays) {
    return { status: 'near_expiry', daysRemaining: daysVal };
  } else {
    return { status: 'valid', daysRemaining: daysVal };
  }
}

// دالة توليد الباركود عشوائياً
export function generateRandomBarcode(): string {
  // يمثل باركود EAN-13 لمصر يبدأ بـ 622
  let code = '622';
  for (let i = 0; i < 10; i++) {
    code += Math.floor(Math.random() * 10).toString();
  }
  return code;
}
