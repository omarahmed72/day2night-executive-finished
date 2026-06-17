/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, Upload, Sparkles, Check, Trash2, 
  ArrowRight, RefreshCw, Barcode, AlertCircle, Plus, FileSpreadsheet, Eye
} from 'lucide-react';
import { CATEGORIES } from '../data';
import { CategoryKey, Product } from '../types';

interface InvoiceScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  language?: 'ar' | 'en';
  onItemsImported: () => void; // call parent reload
}

interface ExtractedItem {
  nameAr: string;
  nameEn: string;
  barcode: string;
  quantity: number;
  buyPrice: number;
  category: CategoryKey;
  sellPrice: number; // calculated sell price
}

export const InvoiceScannerModal: React.FC<InvoiceScannerModalProps> = ({
  isOpen,
  onClose,
  language = 'ar',
  onItemsImported
}) => {
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [step, setStep] = useState<'upload' | 'scanning' | 'review'>('upload');
  
  // Scanning state
  const [scanStatusMsg, setScanStatusMsg] = useState('');
  const [scanError, setScanError] = useState<string | null>(null);
  const [scanIntervalId, setScanIntervalId] = useState<any>(null);

  // Review & Edit state
  const [items, setItems] = useState<ExtractedItem[]>([]);
  const [supplierName, setSupplierName] = useState('');
  const [batchNumber, setBatchNumber] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // File Input Ref
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  // Drag over handler
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  // Drop handler
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  // File select handler
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  // Helper function to generate fresh random barcode
  const triggerGenerateBarcode = (index: number) => {
    const randomVal = '622' + Math.floor(1000000000 + Math.random() * 9000000000);
    const updated = [...items];
    updated[index].barcode = randomVal;
    setItems(updated);
  };

  // Process selected file
  const processFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      alert(language === 'ar' ? 'عذراً، يرجى اختيار ملف صورة فقط (JPEG, PNG)' : 'Please select an image file only (JPEG, PNG).');
      return;
    }
    setSelectedFile(file);
    const reader = new FileReader();
    reader.onload = () => {
      setImagePreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  // Start the scan api call
  const startInvoiceScan = async () => {
    if (!imagePreview) return;
    
    setStep('scanning');
    setScanError(null);
    
    // Simulate smart progression phrases
    const phrases = [
      language === 'ar' ? 'جاري الاتصال بنموذج Gemini 3.5-Flash للمستندات...' : 'Connecting to Gemini 3.5-Flash Vision client...',
      language === 'ar' ? 'جاري تحسين وضوح الصورة وقراءة بنود المشتريات بدقة...' : 'Optimizing invoice resolution & reading purchasing items...',
      language === 'ar' ? 'جاري استخراج أسماء المنتجات وترجمتها تلقائياً...' : 'Extracting product names and translating dynamically...',
      language === 'ar' ? 'جاري ربط الكميات والأسعار المسجلة بالفاتورة...' : 'Matching quantities and unit prices recorded in the sheet...',
      language === 'ar' ? 'جاري عزل الباركودات وتخمين التصانيف الافتراضية المناسبة...' : 'Isolating EAN barcodes & matching depot departments...'
    ];
    
    let phraseIndex = 0;
    setScanStatusMsg(phrases[0]);
    const timer = setInterval(() => {
      phraseIndex = (phraseIndex + 1) % phrases.length;
      setScanStatusMsg(phrases[phraseIndex]);
    }, 4500);
    setScanIntervalId(timer);

    try {
      // Clean base64 block
      const base64Data = imagePreview.split(',')[1];
      const mime = selectedFile?.type || 'image/jpeg';

      const response = await fetch('/api/products/scan-invoice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: base64Data, mimeType: mime })
      });

      const resJson = await response.json();
      clearInterval(timer);

      if (!response.ok || !resJson.success) {
        throw new Error(resJson.message || 'فشل الاتصال بخادم الاستخراج بالذكاء الاصطناعي');
      }

      const extractedItems = resJson.data?.items || [];
      
      // Auto-populate supplier and patch defaults
      setSupplierName(language === 'ar' ? 'مورد فاتورة ذكية' : 'Smart Invoice Supplier');
      setBatchNumber('AI-' + Math.floor(100 + Math.random() * 900));

      // Map to ExtractedItem structure with suggested sell price (e.g. 30% margin)
      const mapped = extractedItems.map((it: any) => {
        const cost = Number(it.buyPrice) || 0;
        return {
          nameAr: it.nameAr || 'صنف ذكي غير مسمى',
          nameEn: it.nameEn || 'AI Named Item',
          barcode: it.barcode || '',
          quantity: Number(it.quantity) || 1,
          buyPrice: cost,
          sellPrice: Number((cost * 1.30).toFixed(2)), // standard 30% markup
          category: (it.category && CATEGORIES.some(c => c.key === it.category)) ? it.category : 'groceries'
        };
      });

      setItems(mapped);
      setStep('review');

    } catch (err: any) {
      clearInterval(timer);
      console.error(err);
      setScanError(err.message || 'فشل قراءة الفاتورة، يرجى التأكد من تشغيل الخادم وتثبيت مفتاح Gemini API في لوحة الإعدادات.');
    }
  };

  // Add a blank row manually
  const addBlankRow = () => {
    setItems([
      ...items,
      {
        nameAr: '',
        nameEn: '',
        barcode: '',
        quantity: 1,
        buyPrice: 0,
        sellPrice: 0,
        category: 'groceries'
      }
    ]);
  };

  // Remove single row
  const removeRow = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  // Modify cell handler
  const handleCellChange = (index: number, field: keyof ExtractedItem, value: any) => {
    const updated = [...items];
    if (field === 'buyPrice') {
      const buyPrice = Number(value) || 0;
      updated[index].buyPrice = buyPrice;
      // Recalculate sell price suggestion
      updated[index].sellPrice = Number((buyPrice * 1.30).toFixed(2));
    } else if (field === 'sellPrice' || field === 'quantity') {
      updated[index][field] = Number(value) || 0;
    } else {
      updated[index][field] = value as any;
    }
    setItems(updated);
  };

  // Final Action: Import everything into database
  const saveAllToDatabase = async () => {
    if (items.length === 0) {
      alert(language === 'ar' ? 'يرجى مراجعة الصنف وإضافة عنصر واحد على الأقل.' : 'Please add at least one item to import.');
      return;
    }

    // Basic validation
    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      if (!it.nameAr.trim()) {
        alert(language === 'ar' ? `يرجى تحديد اسم عربي للصنف رقم ${i + 1}` : `Please write an Arabic name for item #${i + 1}`);
        return;
      }
      if (!it.barcode.trim()) {
        alert(language === 'ar' ? `يرجى تزويد أو توليد باركود للصنف رقم ${i + 1}` : `Please set a barcode for item #${i + 1}`);
        return;
      }
    }

    setIsSaving(true);

    try {
      // Map ExtractedItem to complete Product object structure matching bulk spec
      const productsPayload = items.map((it) => {
        const uniqueId = "p-ai-" + Date.now() + "-" + Math.floor(Math.random() * 1000000);
        return {
          id: uniqueId,
          nameAr: it.nameAr,
          nameEn: it.nameEn,
          barcode: it.barcode,
          category: it.category,
          shelfStock: 0, // start 0 on shelf, wait for restocking
          warehouseStock: it.quantity, // all quantities directly imported into internal depot
          minStockAlert: Math.max(10, Math.floor(it.quantity * 0.2)),
          buyPrice: it.buyPrice,
          sellPrice: it.sellPrice,
          expirationDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 1 year out
          supplierName: supplierName || 'مورد الفاتورة الذكية',
          batchNumber: batchNumber || 'AI-BATCH',
          lastUpdated: new Date().toISOString().split('T')[0]
        };
      });

      const response = await fetch('/api/products/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ products: productsPayload })
      });

      const resJson = await response.json();

      if (!response.ok || !resJson.success) {
        throw new Error(resJson.message || 'فشل إدخال البيانات تلقائياً');
      }

      // Success
      alert(
        language === 'ar' 
          ? `✓ تم اعتماد وإدخال عدد (${items.length}) من المنتجات الذكية بنجاح إلى قاعدة مستودع داي تو نايت!` 
          : `✓ Successfully imported (${items.length}) products into the persistent database!`
      );
      
      onItemsImported(); // trigger reload in App.tsx
      onClose(); // close modal
    } catch (err: any) {
      console.error(err);
      alert(language === 'ar' ? `حدث خطأ أثناء الحفظ: ${err.message}` : `Save failed: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleModalClose = () => {
    if (scanIntervalId) {
      clearInterval(scanIntervalId);
    }
    // reset states
    setSelectedFile(null);
    setImagePreview(null);
    setStep('upload');
    setScanError(null);
    setItems([]);
    onClose();
  };

  return (
    <div id="ai_invoice_scanner_backdrop" className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto">
      <motion.div 
        id="ai_invoice_scanner_card"
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="bg-white rounded-2xl shadow-xl border border-slate-200/80 w-full max-w-5xl overflow-hidden flex flex-col my-8 max-h-[90vh]"
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-900 via-[#004a99] to-indigo-900 px-6 py-4 flex items-center justify-between text-white">
          <div className="flex items-center gap-2.5">
            <span className="p-1.5 bg-white/12 rounded-lg text-amber-300">
              <Sparkles size={18} className="animate-pulse" />
            </span>
            <div>
              <h2 className="text-base font-extrabold tracking-tight">
                {language === 'ar' ? 'المستخرج الذكي لفواتير المشتريات والبطاقات 📸🪄' : 'AI purchase-sheet & invoice smart extractor'}
              </h2>
              <p className="text-[10px] text-blue-100 font-medium">
                {language === 'ar' 
                  ? 'بواسطة الذكاء الاصطناعي التوليدي لمطابقة، جرد وتخزين بنود الشراء وتخمين التصانيف تلقائياً' 
                  : 'Analyzed server-side with Gemini 3.5-flash vision for high-fidelity inventory updates.'}
              </p>
            </div>
          </div>
          <button 
            onClick={handleModalClose}
            className="p-1.5 hover:bg-white/10 rounded-full text-blue-100 hover:text-white transition-all"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content View */}
        <div className="p-6 overflow-y-auto flex-1 bg-slate-50/50">
          
          {/* STEP 1: UPLOAD */}
          {step === 'upload' && (
            <div className="space-y-6">
              <div 
                id="dropzone-container"
                onDragEnter={handleDrag}
                onDragOver={handleDrag}
                onDragLeave={handleDrag}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-4 ${
                  dragActive 
                    ? 'border-[#004a99] bg-blue-50/50' 
                    : 'border-slate-300 bg-white hover:border-[#004a99] hover:bg-slate-50/30'
                }`}
              >
                <input 
                  type="file" 
                  ref={fileInputRef}
                  onChange={handleFileSelect}
                  accept="image/*"
                  // capture="environment" // allows mobile phone back camera capture natively if on phone
                  className="hidden" 
                />

                <div className="p-4 bg-blue-50 rounded-full text-[#004a99]">
                  <Upload size={36} className="text-blue-600" />
                </div>

                <div className="space-y-1">
                  <h3 className="text-sm font-bold text-slate-700">
                    {language === 'ar' ? 'اسحب وأفلت صورة فاتورة الشراء هنا أو انقر للتصفح' : 'Drag and drop procurement invoice photo or click to browse'}
                  </h3>
                  <p className="text-xs text-slate-400 font-medium">
                    {language === 'ar' ? 'يدعم الصور من نوع JPG, JPEG, PNG حتى 20 ميغابايت' : 'Supports JPG, PNG images up to 20MB. Camera capture is compatible.'}
                  </p>
                </div>

                {selectedFile && (
                  <div className="inline-flex items-center gap-1.5 bg-blue-50 text-blue-800 text-xs font-bold px-3 py-1 rounded-full border border-blue-200">
                    <Check size={12} />
                    {selectedFile.name} ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
                  </div>
                )}
              </div>

              {/* Preview and Action Banner */}
              {imagePreview && (
                <div className="bg-white border rounded-xl p-4 flex flex-col md:flex-row items-center gap-5">
                  <div className="w-28 h-28 border rounded-lg overflow-hidden bg-slate-100 flex items-center justify-center relative shrink-0 shadow-sm">
                    <img src={imagePreview} alt="invoice preview" className="object-cover w-full h-full" referrerPolicy="no-referrer" />
                  </div>
                  <div className="flex-1 space-y-2 text-center md:text-right" style={{ textAlign: language === 'ar' ? 'right' : 'left' }}>
                    <h4 className="text-xs font-black text-slate-500 uppercase">{language === 'ar' ? 'الصورة المرفقة جاهزة للمسح' : 'Attached invoice snapshot is ready'}</h4>
                    <p className="text-xs text-slate-600 font-medium">
                      {language === 'ar' 
                        ? 'سيقوم الذكاء الاصطناعي بفك محتويات المستند وقراءة أسماء المنتجات بدقة مع وضع الكميات والأسعار.' 
                        : 'Gemini visual engine will OCR extract and classify items directly into your catalogue structure.'}
                    </p>
                  </div>
                  <button 
                    onClick={startInvoiceScan}
                    className="w-full md:w-auto bg-green-600 hover:bg-green-700 text-white font-black px-6 py-2.5 rounded-lg shadow flex items-center justify-center gap-2 cursor-pointer transition-all hover:scale-[1.01]"
                  >
                    <Sparkles size={16} />
                    <span>{language === 'ar' ? 'بدء التحليل التلقائي بـ Gemini🪄' : 'Initiate Gemini AI Scanning🪄'}</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* STEP 2: SCANNING */}
          {step === 'scanning' && (
            <div className="flex flex-col items-center justify-center py-16 space-y-6">
              <div className="relative">
                <RefreshCw size={44} className="text-[#004a99] animate-spin" />
                <Sparkles size={16} className="text-amber-500 absolute -top-1 -right-1 animate-ping" />
              </div>
              
              <div className="text-center space-y-2 max-w-md">
                <h3 className="text-sm font-extrabold text-slate-800 animate-pulse">
                  {language === 'ar' ? 'جاري فك تشفير الفاتورة بالذكاء الاصطناعي...' : 'Gemini AI Vision client parsing file contents...'}
                </h3>
                <p className="text-xs text-slate-500 leading-relaxed font-bold bg-white border px-4 py-2 rounded-xl shadow-sm inline-block">
                  ✨ {scanStatusMsg}
                </p>
              </div>
            </div>
          )}

          {/* STEP 3: REVIEW & EDIT TABLE */}
          {step === 'review' && (
            <div className="space-y-6">
              
              {/* Supplier Info and Details Panel */}
              <div className="bg-white border text-xs text-slate-700 rounded-xl p-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 mb-1">{language === 'ar' ? 'اسم مورد الشحنة (تلقائي):' : 'Supplier Name:'}</label>
                  <input 
                    type="text"
                    value={supplierName}
                    onChange={(e) => setSupplierName(e.target.value)}
                    className="w-full font-bold px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-[#004a99]"
                    placeholder={language === 'ar' ? 'اكتب اسم المورد' : 'Supplier title...'}
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 mb-1">{language === 'ar' ? 'رقم تشغيلة الشحنة (رقم الباتش):' : 'Lot/Batch Number:'}</label>
                  <input 
                    type="text"
                    value={batchNumber}
                    onChange={(e) => setBatchNumber(e.target.value)}
                    className="w-full font-mono font-bold px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-[#004a99]"
                    placeholder="BATCH-ID"
                  />
                </div>
                <div className="flex items-end justify-start md:justify-end">
                  <button 
                    onClick={addBlankRow}
                    className="bg-[#004a99]/10 hover:bg-[#004a99]/20 text-[#004a99] font-black px-4 py-1.5 border border-[#004a99]/20 rounded-md flex items-center gap-1 cursor-pointer transition-all"
                  >
                    <Plus size={13} />
                    <span>{language === 'ar' ? 'إضافة صنف إضافي يدوياً' : 'Add Empty Row'}</span>
                  </button>
                </div>
              </div>

              {/* Products Table */}
              <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                <div className="overflow-x-auto max-h-[40vh]">
                  <table className="w-full text-xs text-right whitespace-nowrap" style={{ textAlign: language === 'ar' ? 'right' : 'left' }}>
                    <thead className="bg-slate-50 text-[#004a99] text-[10px] font-bold uppercase sticky top-0 border-b border-slate-100 z-10">
                      <tr>
                        <th className="px-3 py-2.5 w-8">#</th>
                        <th className="px-3 py-2.5">{language === 'ar' ? 'الاسم باللغة العربية' : 'Product Name (Ar)'}</th>
                        <th className="px-3 py-2.5">{language === 'ar' ? 'الاسم باللغة الإنجليزية' : 'Product Name (En)'}</th>
                        <th className="px-3 py-2.5">{language === 'ar' ? 'الباركود' : 'Barcode EAN'}</th>
                        <th className="px-3 py-2.5">{language === 'ar' ? 'القسم المقترح' : 'Category'}</th>
                        <th className="px-3 py-2.5 w-16 text-center">{language === 'ar' ? 'الكمية' : 'Qty'}</th>
                        <th className="px-3 py-2.5 w-24 text-center">{language === 'ar' ? 'شريحة الشراء (جنيه)' : 'Cost Price'}</th>
                        <th className="px-3 py-2.5 w-24 text-center">{language === 'ar' ? 'سعر البيع المقدر' : 'Est. Retail'}</th>
                        <th className="px-3 py-2.5 w-8 text-center">{language === 'ar' ? 'إجراء' : 'Ex'}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium">
                      {items.map((it, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/50">
                          <td className="px-3 py-3 text-slate-400 font-bold">{idx + 1}</td>
                          
                          {/* Name Ar */}
                          <td className="px-3 py-2">
                            <input 
                              type="text"
                              value={it.nameAr}
                              onChange={(e) => handleCellChange(idx, 'nameAr', e.target.value)}
                              className="px-2 py-1 bg-white border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 font-bold text-slate-700 w-full min-w-[120px]"
                            />
                          </td>

                          {/* Name En */}
                          <td className="px-3 py-2">
                            <input 
                              type="text"
                              value={it.nameEn}
                              onChange={(e) => handleCellChange(idx, 'nameEn', e.target.value)}
                              className="px-2 py-1 bg-white border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 font-medium text-slate-600 w-full min-w-[120px]"
                            />
                          </td>

                          {/* Barcode */}
                          <td className="px-3 py-2">
                            <div className="flex items-center gap-1 min-w-[155px]">
                              <input 
                                type="text"
                                placeholder={language === 'ar' ? 'تخمين باركود...' : 'Barcode...'}
                                value={it.barcode}
                                onChange={(e) => handleCellChange(idx, 'barcode', e.target.value)}
                                className={`px-2 py-1 font-mono text-[11px] bg-white border rounded focus:outline-none focus:ring-1 focus:ring-blue-500 w-full ${!it.barcode ? 'border-amber-300 bg-amber-50/30' : 'border-slate-200'}`}
                              />
                              <button 
                                onClick={() => triggerGenerateBarcode(idx)}
                                title={language === 'ar' ? 'توليد باركود تلقائي' : 'Auto Generate Barcode'}
                                className="p-1.5 hover:bg-slate-100 rounded text-slate-500 hover:text-slate-800 shrink-0 border border-slate-200"
                              >
                                <Barcode size={13} />
                              </button>
                            </div>
                          </td>

                          {/* Category */}
                          <td className="px-3 py-2">
                            <select
                              value={it.category}
                              onChange={(e) => handleCellChange(idx, 'category', e.target.value)}
                              className="px-2 py-1 bg-white border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 text-slate-600 text-[11px] w-full"
                            >
                              {CATEGORIES.map(cat => (
                                <option key={cat.key} value={cat.key}>
                                  {language === 'ar' ? cat.nameAr : cat.nameEn}
                                </option>
                              ))}
                            </select>
                          </td>

                          {/* Quantity */}
                          <td className="px-3 py-2 text-center">
                            <input 
                              type="number"
                              min="1"
                              value={it.quantity}
                              onChange={(e) => handleCellChange(idx, 'quantity', e.target.value)}
                              className="px-2 py-1 font-mono text-center bg-white border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 w-16"
                            />
                          </td>

                          {/* Buy Price */}
                          <td className="px-3 py-2 text-center">
                            <input 
                              type="number"
                              step="0.1"
                              min="0"
                              value={it.buyPrice}
                              onChange={(e) => handleCellChange(idx, 'buyPrice', e.target.value)}
                              className="px-2 py-1 font-mono text-center bg-white border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 w-20 text-emerald-700 font-extrabold"
                            />
                          </td>

                          {/* Sell Price */}
                          <td className="px-3 py-2 text-center">
                            <input 
                              type="number"
                              step="0.1"
                              min="0"
                              value={it.sellPrice}
                              onChange={(e) => handleCellChange(idx, 'sellPrice', e.target.value)}
                              className="px-2 py-1 font-mono text-center bg-white border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 w-20 text-blue-700 font-extrabold"
                            />
                          </td>

                          {/* Remove row */}
                          <td className="px-3 py-2 text-center">
                            <button 
                              onClick={() => removeRow(idx)}
                              className="p-1 hover:bg-red-50 text-slate-400 hover:text-red-600 rounded transition-colors"
                            >
                              <Trash2 size={13} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="bg-slate-50 border-t px-4 py-2.5 flex items-center justify-between text-[11px] text-slate-500 font-bold">
                  <div>
                    {language === 'ar' 
                      ? `إجمالي الأصناف المراجعة: ${items.length} منتجات` 
                      : `Total extracted products: ${items.length} item(s)`}
                  </div>
                  <div>
                    {language === 'ar' 
                      ? `مجموع الكميات للتخزين: ${items.reduce((sum, item) => sum + item.quantity, 0)} وحدة` 
                      : `Total storage units quantity: ${items.reduce((sum, item) => sum + item.quantity, 0)} units`}
                  </div>
                  <div>
                    {language === 'ar' 
                      ? `التكلفة الإجمالية: ${items.reduce((sum, item) => sum + (item.buyPrice * item.quantity), 0).toFixed(2)} ج.م` 
                      : `Total cost: EGP ${items.reduce((sum, item) => sum + (item.buyPrice * item.quantity), 0).toFixed(2)}`}
                  </div>
                </div>
              </div>

              {/* Status Note */}
              <div className="flex gap-2 p-3.5 bg-sky-50 text-sky-800 rounded-xl border border-sky-100 text-xs">
                <AlertCircle size={15} className="text-sky-600 shrink-0 mt-0.5" />
                <p className="leading-relaxed">
                  {language === 'ar' 
                    ? '✓ تم تفعيل متوسط تسعير استرشادي بهامش ربح مبدئي 30% لأسعار البيع. يرجى تعديل أسعار البيع والباركودات بما يتناسب مع نظام متجرك قبل النقر على زر الاعتماد.' 
                    : '✓ Recommended average retail price is pre-populated with 30% dynamic target markup. You can modify retail prices or generate barcodes manually.'}
                </p>
              </div>
            </div>
          )}

          {/* Trigger Scan Error */}
          {scanError && (
            <div className="p-4 bg-red-50 text-red-800 border border-red-200 rounded-xl flex items-start gap-3 text-xs mt-4">
              <AlertCircle size={16} className="text-red-600 shrink-0 mt-0.5" />
              <div className="space-y-1 text-right" style={{ textAlign: language === 'ar' ? 'right' : 'left' }}>
                <span className="font-extrabold">{language === 'ar' ? 'حدث خطأ أثناء معالجة الفاتورة:' : 'Error processing invoice:'}</span>
                <p className="opacity-90 leading-relaxed font-bold">{scanError}</p>
                <div className="pt-2 text-[10px] text-red-600 font-mono">
                  {language === 'ar' 
                    ? 'تنبيه: سيتطلب تشغيل هذه الميزة إدخال مفتاح Gemini API وتثبيته في الإعدادات.' 
                    : 'Developer note: Ensure process.env.GEMINI_API_KEY is configured.'}
                </div>
                <button 
                  onClick={() => setStep('upload')}
                  className="mt-2 bg-red-600 text-white font-bold px-3 py-1 rounded hover:bg-red-700 cursor-pointer transition-all"
                >
                  {language === 'ar' ? 'الرجوع ومحاولة أخرى' : 'Go back and try again'}
                </button>
              </div>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="border-t bg-slate-50 px-6 py-4 flex items-center justify-between">
          <button 
            onClick={handleModalClose}
            className="px-4 py-2 border border-slate-200 rounded-lg hover:bg-slate-100 text-slate-600 text-xs font-bold transition-all"
          >
            {language === 'ar' ? 'إلغاء وإغلاق' : 'Cancel & Close'}
          </button>
          
          {step === 'review' && (
            <div className="flex gap-2">
              <button 
                onClick={() => setStep('upload')}
                className="px-4 py-2 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-100 text-xs font-bold flex items-center gap-1.5 transition-all"
              >
                <RefreshCw size={12} />
                <span>{language === 'ar' ? 'إعادة الرفع ومسح جديد' : 'Re-upload & Rescan'}</span>
              </button>
              <button 
                onClick={saveAllToDatabase}
                disabled={isSaving}
                className="bg-green-600 hover:bg-green-700 text-white font-black px-6 py-2 rounded-lg shadow-sm flex items-center gap-1.5 cursor-pointer hover:scale-[1.01] transition-all text-xs disabled:opacity-50"
              >
                {isSaving ? (
                  <>
                    <RefreshCw size={13} className="animate-spin" />
                    <span>{language === 'ar' ? 'جاري الاعتماد والحفظ...' : 'Confirming Import...'}</span>
                  </>
                ) : (
                  <>
                    <Check size={13} />
                    <span>{language === 'ar' ? 'اعتماد وإضافة الفاتورة للمخزن ✓' : 'Approve & Save to Depot ✓'}</span>
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};
