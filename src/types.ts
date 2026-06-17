/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type CategoryKey = 
  | 'groceries' 
  | 'dairy' 
  | 'meat' 
  | 'produce' 
  | 'bakery' 
  | 'cleaning' 
  | 'cosmetics' 
  | 'electronics';

export interface CategoryInfo {
  key: CategoryKey;
  nameAr: string;
  nameEn: string;
  iconName: string;
  color: string;
}

export interface StockBatch {
  id: string;
  buyPrice: number;
  sellPrice: number;
  quantity: number; // current quantity available in this batch
  initialQuantity: number; // initial quantity when batched
  expiryDate: string; // YYYY-MM-DD
  dateAdded: string; // YYYY-MM-DD
}

export interface Product {
  id: string;
  nameAr: string;
  nameEn: string;
  barcode: string;
  category: CategoryKey;
  shelfStock: number;       // المخزون على الرفوف
  warehouseStock: number;   // المخزن الداخلي
  minStockAlert: number;    // حد الطلب
  buyPrice: number;         // سعر الشراء الأساسي / الافتراضي
  sellPrice: number;        // سعر البيع الأساسي / الافتراضي
  isDiscounted?: boolean;   // هل عليه عرض؟
  discountPercentage?: number; // نسبة الخصم (للتوافق القديم)
  discountType?: 'egp' | 'percent'; // نوع الخصم الجديد: نسبة أو جنيه
  discountValue?: number; // قيمة الخصم الجديد بالجنيه أو النسبة
  unitsSold?: number;       // عدد الوحدات المباعة
  unitsLost?: number;       // عدد الوحدات التالفة/المفقودة/المنتهية
  expirationDate: string;   // تاريخ الصلاحية YYYY-MM-DD
  supplierName: string;     // اسم المورد
  supplierPhone?: string;   // هاتف المورد
  batchNumber: string;      // رقم التشغيلة/الباتش
  lastUpdated: string;      // تاريخ آخر تحديث
  batches?: StockBatch[];   // مصفوفة الباتشات لدعم حسابات FIFO / LIFO ومتوسط السائد السعر
  subCategory?: string;     // التصنيف الفرعي (Subcategory)
  isComposite?: boolean;    // هل المنتج مركب / عرض بندل؟ (Composite product / bundle offer)
  components?: { productId: string; quantity: number }[]; // المكونات للمنتج المركب
  additionalBarcode?: string; // الباركود الإضافي / البديل المساعد للطباعة والقراءة
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  governorate: string; // المحافظة
  points: number; // عدد النقاط المتراكمة للعميل
}

export interface PurchaseInvoiceItem {
  productId: string;
  productNameAr: string;
  productNameEn: string;
  barcode: string;
  category: CategoryKey;
  quantity: number;
  buyPrice: number;
  sellPrice: number;
  expiryDate: string;
}

export interface PurchaseInvoice {
  id: string;
  invoiceNumber: string;
  supplierName: string;
  supplierPhone?: string;
  date: string;
  items: PurchaseInvoiceItem[];
  totalAmount: number;
  isPosted: boolean; // هل تم ترحيلها للمخزن؟
}

export interface TransferOrderItem {
  productId: string;
  productNameAr: string;
  productNameEn: string;
  quantity: number;
}

export interface TransferOrder {
  id: string;
  orderNumber: string;
  date: string;
  items: TransferOrderItem[];
  status: 'pending' | 'approved' | 'rejected';
  approvedBy?: string;
  lastUpdated?: string;
}

export interface Supplier {
  id: string;
  nameAr: string;
  nameEn: string;
  phone: string;
  email?: string;
  category: CategoryKey;
}

export interface ExpiryNotification {
  id: string;
  productId: string;
  productNameAr: string;
  productNameEn: string;
  expirationDate: string;
  daysRemaining: number;
  quantity: number;
  dismissed: boolean;
  actionTaken?: 'discount' | 'return' | 'dispose';
}

export interface InventoryStats {
  totalItems: number;
  totalCategories: number;
  lowStockCount: number;
  nearExpiryCount: number; // < 60 days
  expiredCount: number;
  totalValueCost: number;   // إجمالي قيمة رأس المال بالمخزون
  totalValueSell: number;   // القيمة الإجمالية بسعر البيع المتوقع
  marginPercentage: number;
}
