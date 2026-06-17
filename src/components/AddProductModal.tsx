/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Product, CategoryKey } from '../types';
import { CATEGORIES, generateRandomBarcode, SYSTEM_TODAY } from '../data';
import { X, Barcode, HelpCircle, Check, DollarSign } from 'lucide-react';

interface AddProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (product: Product) => void;
  editingProduct?: Product | null;
  language: 'ar' | 'en';
}

export const AddProductModal: React.FC<AddProductModalProps> = ({
  isOpen,
  onClose,
  onSave,
  editingProduct,
  language,
}) => {
  const [nameAr, setNameAr] = useState('');
  const [nameEn, setNameEn] = useState('');
  const [barcode, setBarcode] = useState('');
  const [category, setCategory] = useState<CategoryKey>('groceries');
  const [subCategory, setSubCategory] = useState('');
  const [shelfStock, setShelfStock] = useState<number>(50);
  const [warehouseStock, setWarehouseStock] = useState<number>(100);
  const [minStockAlert, setMinStockAlert] = useState<number>(25);
  const [buyPrice, setBuyPrice] = useState<number>(10);
  const [sellPrice, setSellPrice] = useState<number>(15);
  const [expirationDate, setExpirationDate] = useState('');
  const [supplierName, setSupplierName] = useState('');
  const [supplierPhone, setSupplierPhone] = useState('');
  const [batchNumber, setBatchNumber] = useState('');
  const [additionalBarcode, setAdditionalBarcode] = useState('');

  // Discount settings
  const [isDiscounted, setIsDiscounted] = useState(false);
  const [discountType, setDiscountType] = useState<'percent' | 'egp'>('percent');
  const [discountValue, setDiscountValue] = useState<number>(0);

  // Composite product / bundle settings
  const [isComposite, setIsComposite] = useState(false);
  const [bundleComponents, setBundleComponents] = useState<{ productId: string; quantity: number }[]>([]);

  // DB Fetched metadata lists
  const [categoriesList, setCategoriesList] = useState<any[]>([]);
  const [allProductsList, setAllProductsList] = useState<Product[]>([]);

  useEffect(() => {
    if (isOpen) {
      fetch('/api/categories')
        .then(res => res.json())
        .then(data => {
          if (Array.isArray(data)) setCategoriesList(data);
        })
        .catch(err => console.error(err));

      fetch('/api/products')
        .then(res => res.json())
        .then(data => {
          if (Array.isArray(data)) setAllProductsList(data);
        })
        .catch(err => console.error(err));
    }
  }, [isOpen]);

  // تهيئة المدخلات عند التعديل
  useEffect(() => {
    if (editingProduct) {
      setNameAr(editingProduct.nameAr);
      setNameEn(editingProduct.nameEn);
      setBarcode(editingProduct.barcode);
      setCategory(editingProduct.category);
      setSubCategory(editingProduct.subCategory || '');
      setShelfStock(editingProduct.shelfStock);
      setWarehouseStock(editingProduct.warehouseStock);
      setMinStockAlert(editingProduct.minStockAlert);
      setBuyPrice(editingProduct.buyPrice);
      setSellPrice(editingProduct.sellPrice);
      setExpirationDate(editingProduct.expirationDate);
      setSupplierName(editingProduct.supplierName);
      setSupplierPhone(editingProduct.supplierPhone || '');
      setBatchNumber(editingProduct.batchNumber);
      setAdditionalBarcode(editingProduct.additionalBarcode || '');

      setIsDiscounted(editingProduct.isDiscounted || false);
      setDiscountType(editingProduct.discountType || 'percent');
      setDiscountValue(editingProduct.discountValue || editingProduct.discountPercentage || 0);

      setIsComposite(editingProduct.isComposite || false);
      setBundleComponents(editingProduct.components || []);
    } else {
      // تفريغ المدخلات للإنشاء الجديد
      const defaultDate = new Date();
      defaultDate.setMonth(defaultDate.getMonth() + 6); // افتراضي 6 شهور
      
      setNameAr('');
      setNameEn('');
      setBarcode(generateRandomBarcode());
      setCategory('groceries');
      setSubCategory('');
      setShelfStock(50);
      setWarehouseStock(150);
      setMinStockAlert(30);
      setBuyPrice(10);
      setSellPrice(13);
      setExpirationDate(defaultDate.toISOString().split('T')[0]);
      setSupplierName('');
      setSupplierPhone('');
      setBatchNumber('B-' + Math.floor(100 + Math.random() * 900));
      setAdditionalBarcode('');

      setIsDiscounted(false);
      setDiscountType('percent');
      setDiscountValue(0);

      setIsComposite(false);
      setBundleComponents([]);
    }
  }, [editingProduct, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nameAr || !nameEn || !barcode || !expirationDate || !supplierName) {
      alert(language === 'ar' ? 'يرجى ملء جميع الحقول الإلزامية مميزة بعلامة *' : 'Please fill all required starred [*] fields');
      return;
    }

    const savedProduct: Product = {
      id: editingProduct ? editingProduct.id : 'p-' + Date.now(),
      nameAr,
      nameEn,
      barcode,
      category,
      subCategory,
      shelfStock: Number(shelfStock),
      warehouseStock: Number(warehouseStock),
      minStockAlert: Number(minStockAlert),
      buyPrice: Number(buyPrice),
      sellPrice: Number(sellPrice),
      expirationDate,
      supplierName,
      supplierPhone,
      batchNumber,
      additionalBarcode,
      lastUpdated: SYSTEM_TODAY,
      isDiscounted,
      discountType,
      discountValue: Number(discountValue),
      discountPercentage: discountType === 'percent' ? Number(discountValue) : undefined,
      isComposite,
      components: isComposite ? bundleComponents : [],
    };

    onSave(savedProduct);
    onClose();
  };

  const handleGenBarcode = () => {
    setBarcode(generateRandomBarcode());
  };

  const margin = buyPrice > 0 ? ((sellPrice - buyPrice) / buyPrice) * 100 : 0;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div 
        className="relative bg-white rounded-2xl w-full max-w-3xl shadow-xl border border-slate-100 max-h-[90vh] flex flex-col"
        style={{ direction: language === 'ar' ? 'rtl' : 'ltr' }}
      >
        {/* رأس النافذة المنبثقة */}
        <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-slate-50 rounded-t-2xl">
          <div>
            <h3 className="font-bold text-lg text-slate-800">
              {editingProduct 
                ? (language === 'ar' ? '📝 تعديل بيانات منتج' : '📝 Edit Product Details') 
                : (language === 'ar' ? '➕ إضافة صنف جديد للمول' : '➕ Add New Mall Inventory Item')}
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              {language === 'ar' 
                ? 'أدخل بدقة معلومات المخزن والصلاحية والتسعير مطابقة لمعايير جودة داي تو نايت مول' 
                : 'Fill in catalog info, shelves count, depot, and expiration margin properties'}
            </p>
          </div>
          <button 
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-150 rounded-lg transition-all"
          >
            <X size={20} />
          </button>
        </div>

        {/* جسم الفورم */}
        <form onSubmit={handleSubmit} className="overflow-y-auto p-6 space-y-6 flex-1">
          {/* القسم 1: معلومات التعريف */}
          <div>
            <span className="text-xs font-semibold px-2 py-1 bg-sky-55 text-sky-700 rounded-md">
              {language === 'ar' ? '1. البيانات الأساسية' : '1. Core Details'}
            </span>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  {language === 'ar' ? 'الاسم باللغة العربية *' : 'Product Name (Arabic) *'}
                </label>
                <input
                  type="text"
                  required
                  placeholder={language === 'ar' ? 'مثال: حليب جهينة كامل الدسم' : 'e.g. حليب جهينة كامل الدسم'}
                  value={nameAr}
                  onChange={(e) => setNameAr(e.target.value)}
                  className="w-full text-sm px-3 py-2 bg-slate-50 border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-[#004a99] focus:bg-white transition-all text-slate-700"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  {language === 'ar' ? 'الاسم باللغة الإنجليزية *' : 'Product Name (English) *'}
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Juhayna Full Cream Milk 1L"
                  value={nameEn}
                  onChange={(e) => setNameEn(e.target.value)}
                  className="w-full text-sm px-3 py-2 bg-slate-50 border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-[#004a99] focus:bg-white transition-all text-slate-700"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1 flex items-center justify-between">
                  <span>{language === 'ar' ? 'الباركود الرقمي اليدوي أو المولد *' : 'Barcode / SKU EAN *'}</span>
                  <button
                    type="button"
                    onClick={handleGenBarcode}
                    className="text-[11px] text-[#004a99] hover:text-blue-800 flex items-center gap-1 font-semibold transition-colors"
                  >
                    <Barcode size={13} />
                    {language === 'ar' ? 'توليد باركود تلقائي' : 'Auto Generate'}
                  </button>
                </label>
                <input
                  type="text"
                  required
                  value={barcode}
                  onChange={(e) => setBarcode(e.target.value)}
                  className="w-full text-sm px-3 py-2 bg-slate-50 border border-slate-200 rounded-md font-mono focus:outline-none focus:ring-2 focus:ring-[#004a99] focus:bg-white transition-all text-slate-700"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1 flex items-center justify-between">
                  <span>{language === 'ar' ? 'الباركود الرقمي الإضافي / البديل (اختياري)' : 'Additional / Alternate Barcode (Optional)'}</span>
                  <button
                    type="button"
                    onClick={() => {
                      // Alternate barcode has slightly different seed
                      const rand = '444' + Math.floor(1000000000 + Math.random() * 9000000000);
                      setAdditionalBarcode(rand);
                    }}
                    className="text-[11px] text-emerald-700 hover:text-emerald-900 flex items-center gap-1 font-semibold transition-colors"
                  >
                    <Barcode size={13} />
                    {language === 'ar' ? 'توليد باركود إضافي' : 'Generate Alternate'}
                  </button>
                </label>
                <input
                  type="text"
                  placeholder={language === 'ar' ? 'مثال: باركود الكرتونة أو الحبة البديلة' : 'e.g. Alternate SKU or box barcode'}
                  value={additionalBarcode}
                  onChange={(e) => setAdditionalBarcode(e.target.value)}
                  className="w-full text-sm px-3 py-2 bg-slate-50 border border-slate-200 rounded-md font-mono focus:outline-none focus:ring-2 focus:ring-[#004a99] focus:bg-white transition-all text-slate-700"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  {language === 'ar' ? 'القسم / فئة المبيعات *' : 'Department Category *'}
                </label>
                <select
                  value={category}
                  onChange={(e) => {
                    const newCat = e.target.value as CategoryKey;
                    setCategory(newCat);
                    const foundCat = categoriesList.find(c => c.key === newCat);
                    if (foundCat && foundCat.subCategories && foundCat.subCategories.length > 0) {
                      setSubCategory(foundCat.subCategories[0]);
                    } else {
                      setSubCategory('');
                    }
                  }}
                  className="w-full text-sm px-3 py-2 bg-slate-50 border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-[#004a99] focus:bg-white transition-all text-slate-700"
                >
                  {CATEGORIES.map((cat) => (
                    <option key={cat.key} value={cat.key}>
                      {language === 'ar' ? cat.nameAr : cat.nameEn}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  {language === 'ar' ? 'التصنيف الفرعي (Subcategory)' : 'Subcategory'}
                </label>
                <div className="flex gap-2">
                  <select
                    value={categoriesList.find(c => c.key === category)?.subCategories?.includes(subCategory) ? subCategory : (subCategory ? 'NEW_CUSTOM' : '')}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === 'NEW_CUSTOM') {
                        setSubCategory('');
                      } else {
                        setSubCategory(val);
                      }
                    }}
                    className="flex-1 text-sm px-3 py-2 bg-slate-50 border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-[#004a99] focus:bg-white transition-all text-slate-700"
                  >
                    <option value="">{language === 'ar' ? '-- اختر تصنيف فرعي --' : '-- Choose Subcategory --'}</option>
                    {categoriesList.find(c => c.key === category)?.subCategories?.map((sub: string) => (
                      <option key={sub} value={sub}>{sub}</option>
                    ))}
                    <option value="NEW_CUSTOM">{language === 'ar' ? '✏️ كتابة تصنيف فرعي جديد...' : '✏️ Write new subcategory...'}</option>
                  </select>
                  
                  {(!categoriesList.find(c => c.key === category)?.subCategories?.includes(subCategory) || subCategory === '') && (
                    <input
                      type="text"
                      placeholder={language === 'ar' ? 'اكتب اسم التصنيف الفرعي' : 'Type subcategory...'}
                      value={subCategory}
                      onChange={(e) => setSubCategory(e.target.value)}
                      className="flex-1 text-sm px-3 py-2 bg-blue-50/50 border border-blue-200 rounded-md focus:outline-none focus:ring-2 focus:ring-[#004a99] focus:bg-white transition-all text-slate-700 font-bold"
                    />
                  )}
                </div>
              </div>
            </div>
          </div>

          <hr className="border-slate-100" />

          {/* القسم 2: مراقبة كميات المخزون */}
          <div>
            <span className="text-xs font-semibold px-2 py-1 bg-amber-55 text-amber-700 rounded-md">
              {language === 'ar' ? '2. مراقبة مستويات المخزون (الكميات)' : '2. Inventory Stock Control'}
            </span>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  {language === 'ar' ? 'المعروض على الرفوف (Shelf Stock) *' : 'Stock on Shelves *'}
                </label>
                <input
                  type="number"
                  min="0"
                  required
                  value={shelfStock}
                  onChange={(e) => setShelfStock(Number(e.target.value))}
                  className="w-full text-sm px-3 py-2 bg-slate-50 border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-[#004a99] focus:bg-white transition-all text-slate-700 font-semibold"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  {language === 'ar' ? 'المخزن الداخلي الرأسي (Warehouse) *' : 'Internal Back Store Depot *'}
                </label>
                <input
                  type="number"
                  min="0"
                  required
                  value={warehouseStock}
                  onChange={(e) => setWarehouseStock(Number(e.target.value))}
                  className="w-full text-sm px-3 py-2 bg-slate-50 border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-[#004a99] focus:bg-white transition-all text-slate-700 font-semibold"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1 flex items-center justify-between">
                  <span>{language === 'ar' ? 'حد الأمان للمخزون (حد الطلب) *' : 'Low Safety Level Limit *'}</span>
                </label>
                <input
                  type="number"
                  min="0"
                  required
                  value={minStockAlert}
                  onChange={(e) => setMinStockAlert(Number(e.target.value))}
                  className="w-full text-sm px-3 py-2 bg-slate-50 border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-[#004a99] focus:bg-white transition-all text-slate-700 font-semibold"
                />
              </div>
            </div>
            <p className="text-[11px] text-slate-400 mt-2 italic">
              {language === 'ar' 
                ? '💡 يتم إرسال تنبيه لإعادة الملء للرفوف فوراً عندما يقل المخزون الفعلي عن حد الأمان.'
                : '💡 Reorder trigger is sent if combined stock of department drops below safety limit.'}
            </p>
          </div>

          <hr className="border-slate-100" />

          {/* القسم 3: المورد والتفاصيل والصلاحية */}
          <div>
            <span className="text-xs font-semibold px-2 py-1 bg-red-50 text-red-700 rounded-md">
              {language === 'ar' ? '3. تاريخ الصلاحية والتتبع والمورد' : '3. Dates, Expiry Warnings & Supplier'}
            </span>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1 text-red-650 font-semibold">
                  {language === 'ar' ? 'تاريخ نهاية الصلاحية [ هام جداً ] *' : 'Expiration Date [ Critical ] *'}
                </label>
                <input
                  type="date"
                  required
                  value={expirationDate}
                  onChange={(e) => setExpirationDate(e.target.value)}
                  className="w-full text-sm px-3 py-2 bg-red-50/40 border border-red-200 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:bg-white transition-all text-slate-700 font-semibold"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  {language === 'ar' ? 'رقم باتش التشغيلة (Batch/Lot) *' : 'Batch/Lot Number *'}
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. B-GEN-707"
                  value={batchNumber}
                  onChange={(e) => setBatchNumber(e.target.value)}
                  className="w-full text-sm px-3 py-2 bg-slate-50 border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-[#004a99] focus:bg-white transition-all text-slate-700 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  {language === 'ar' ? 'اسم شركة المورد المعني *' : 'Supplier Business Name *'}
                </label>
                <input
                  type="text"
                  required
                  placeholder={language === 'ar' ? 'مثال: شركة جهينة للصناعات' : 'e.g. Juhayna Industries'}
                  value={supplierName}
                  onChange={(e) => setSupplierName(e.target.value)}
                  className="w-full text-sm px-3 py-2 bg-slate-50 border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-[#004a99] focus:bg-white transition-all text-slate-700"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  {language === 'ar' ? 'لهاتف المورد (لطلب تعويض مخزون سريع)' : 'Supplier Phone Number'}
                </label>
                <input
                  type="text"
                  placeholder={language === 'ar' ? 'مثال: 16630 أو 022...' : 'e.g. 16630'}
                  value={supplierPhone}
                  onChange={(e) => setSupplierPhone(e.target.value)}
                  className="w-full text-sm px-3 py-2 bg-slate-50 border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-[#004a99] focus:bg-white transition-all text-slate-700"
                />
              </div>
            </div>
          </div>

          <hr className="border-slate-100" />

          {/* القسم 4: الأسعار */}
          <div>
            <span className="text-xs font-semibold px-2 py-1 bg-green-50 text-green-700 rounded-md">
              {language === 'ar' ? '4. التسعير وهامش الربح' : '4. Pricing & Profit Margin'}
            </span>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  {language === 'ar' ? 'سعر الشراء من المورد (جنيه مصري) *' : 'Wholesale Buy Price (EGP) *'}
                </label>
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  required
                  value={buyPrice}
                  onChange={(e) => setBuyPrice(Number(e.target.value))}
                  className="w-full text-sm px-3 py-2 bg-slate-50 border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-[#004a99] focus:bg-white transition-all text-slate-700 font-semibold"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  {language === 'ar' ? 'سعر البيع للمستهلك النهائي *' : 'Consumer Retail Sell Price *'}
                </label>
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  required
                  value={sellPrice}
                  onChange={(e) => setSellPrice(Number(e.target.value))}
                  className="w-full text-sm px-3 py-2 bg-slate-50 border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-[#004a99] focus:bg-white transition-all text-slate-700 font-semibold"
                />
              </div>

              <div className="bg-slate-50 rounded-xl p-3 flex flex-col justify-center border border-slate-100">
                <span className="text-[10px] text-slate-400 block uppercase font-bold tracking-tight">
                  {language === 'ar' ? 'هامش الربح المتوقع' : 'Projected Profit Margin'}
                </span>
                <span className="text-lg font-bold text-slate-700 flex items-center gap-1 mt-0.5">
                  <span className={margin > 0 ? 'text-green-600' : 'text-rose-600'}>
                    {margin.toFixed(1)}%
                  </span>
                  <span className="text-xs text-slate-400 font-normal">
                    ({(sellPrice - buyPrice).toFixed(1)} {language === 'ar' ? 'ج.م ربح للحبة' : 'EGP/unit'})
                  </span>
                </span>
              </div>
            </div>
          </div>
        </form>

        {/* أزرار الحفظ والإغلاق */}
        <div className="flex items-center justify-end gap-3 p-5 border-t border-slate-100 bg-slate-50 rounded-b-2xl animate-none">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 text-sm text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-md font-medium transition-all"
          >
            {language === 'ar' ? 'إلغاء' : 'Cancel'}
          </button>
          
          <button
            onClick={handleSubmit}
            className="px-6 py-2 text-sm text-white bg-[#004a99] hover:bg-blue-700 rounded-md font-medium shadow-sm transition-all flex items-center gap-2 cursor-pointer"
          >
            <Check size={16} />
            {editingProduct 
              ? (language === 'ar' ? 'حفظ التحديثات' : 'Save Changes') 
              : (language === 'ar' ? 'إضافة للمول' : 'Add to Inventory')}
          </button>
        </div>
      </div>
    </div>
  );
};
