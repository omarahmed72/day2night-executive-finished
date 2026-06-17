/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, Printer, Check, Plus, Minus, Search, Sparkles, LayoutGrid, Info, Tag, Layers, AlertCircle, RefreshCw, Barcode
} from 'lucide-react';
import { Product } from '../types';
import { BarcodeRenderer } from './BarcodeRenderer';

interface BarcodePrinterModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: Product[];
  language?: 'ar' | 'en';
}

interface PrintItem {
  product: Product;
  quantity: number;
  barcodeType: 'main' | 'additional';
}

type StickerStyle = 'price_tag' | 'shelf_big' | 'simple_barcode';

export const BarcodePrinterModal: React.FC<BarcodePrinterModalProps> = ({
  isOpen,
  onClose,
  products,
  language = 'ar'
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedItems, setSelectedItems] = useState<PrintItem[]>([]);
  const [stickerStyle, setStickerStyle] = useState<StickerStyle>('price_tag');
  const [customTitle, setCustomTitle] = useState('');
  const [showPrintView, setShowPrintView] = useState(false);

  // If products list changes or search is typed, filter accordingly
  const filteredProducts = products.filter(p => {
    const term = searchTerm.toLowerCase();
    return (
      p.nameAr.toLowerCase().includes(term) ||
      p.nameEn.toLowerCase().includes(term) ||
      p.barcode.includes(term) ||
      (p.additionalBarcode && p.additionalBarcode.includes(term))
    );
  });

  // Toggle single product selection for printing
  const toggleProductSelection = (product: Product, barcodeType: 'main' | 'additional' = 'main') => {
    // Check if both product and barcodeType matches
    const existingIdx = selectedItems.findIndex(
      item => item.product.id === product.id && item.barcodeType === barcodeType
    );

    if (existingIdx !== -1) {
      // Remove
      setSelectedItems(selectedItems.filter((_, idx) => idx !== existingIdx));
    } else {
      // Add
      setSelectedItems([
        ...selectedItems,
        {
          product,
          quantity: 1,
          barcodeType
        }
      ]);
    }
  };

  // Add all products to print (Mass print price barcodes "طباعة باركود الاسعار مجمع")
  const selectAllProductsForMassPrint = () => {
    const items: PrintItem[] = products.map(p => ({
      product: p,
      quantity: 1,
      barcodeType: 'main'
    }));
    setSelectedItems(items);
  };

  // Select only additional barcodes for products that have them ("طباعة الباركود الاضافي مجمع")
  const selectAlternativeBarcodesForPrint = () => {
    const itemsWithAdd: PrintItem[] = products
      .filter(p => !!p.additionalBarcode)
      .map(p => ({
        product: p,
        quantity: 1,
        barcodeType: 'additional'
      }));
    
    if (itemsWithAdd.length === 0) {
      alert(language === 'ar' 
        ? '⚠️ لا توجد بضائع مسجلة تحتوي على باركود إضافي حالياً! يرجى إضافة باركود إضافي للمنتجات أولاً.' 
        : '⚠️ No products have additional barcodes assigned in the database.'
      );
      return;
    }
    setSelectedItems(itemsWithAdd);
  };

  const handleQtyChange = (idx: number, delta: number) => {
    const updated = [...selectedItems];
    updated[idx].quantity = Math.max(1, updated[idx].quantity + delta);
    setSelectedItems(updated);
  };

  const handleBarcodeTypeSelect = (idx: number, type: 'main' | 'additional') => {
    const updated = [...selectedItems];
    if (type === 'additional' && !updated[idx].product.additionalBarcode) {
      alert(language === 'ar' 
        ? '⚠️ هذا المنتج لا يحتوي على باركود إضافي مسجل!' 
        : '⚠️ This product does not have an additional barcode registered!'
      );
      return;
    }
    updated[idx].barcodeType = type;
    setSelectedItems(updated);
  };

  const handlePrintTrigger = () => {
    if (selectedItems.length === 0) {
      alert(language === 'ar' ? '⚠️ يرجى اختيار صنف واحد على الأقل للطباعة!' : '⚠️ Register at least one item to proceed.');
      return;
    }
    setShowPrintView(true);
  };

  const executeBrowserPrint = () => {
    setTimeout(() => {
      window.print();
    }, 150);
  };

  if (!isOpen) return null;

  return (
    <>
      {/* PRINT VIEW (Rendered in fullscreen when print screen is active for absolute layout isolation) */}
      <AnimatePresence>
        {showPrintView && (
          <div 
            id="print-sheet-fullscreen" 
            className="fixed inset-0 z-[150] bg-white text-black flex flex-col overflow-y-auto print:absolute print:inset-0"
          >
            {/* Top control header, invisible in paper print */}
            <div className="bg-slate-900 text-white p-4 flex items-center justify-between shadow-md print:hidden shrink-0">
              <div className="flex items-center gap-2">
                <Printer size={18} className="text-emerald-400" />
                <h3 className="text-sm font-black">
                  {language === 'ar' ? 'معاينة ملصقات الباركود والأسعار المجهزة للطباعة' : 'Barcode Labels Printing Slate / Roll Sheet'}
                </h3>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={executeBrowserPrint}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black rounded-lg flex items-center gap-1.5 shadow"
                >
                  <Printer size={14} />
                  <span>{language === 'ar' ? 'طباعة الآن (يفتح نافذة الطابعة)' : 'Send to Printer'}</span>
                </button>
                <button
                  onClick={() => setShowPrintView(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-xs font-bold rounded-lg border border-slate-700"
                >
                  {language === 'ar' ? 'رجوع للتعديل' : 'Modify Settings'}
                </button>
              </div>
            </div>

            {/* Print canvas sheets */}
            <div className="p-8 flex-1 flex flex-wrap gap-4 items-center justify-center bg-slate-100 print:bg-white print:p-0">
              <div 
                id="barcode-print-view-grid" 
                className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 p-4 bg-white border print:border-0 print:shadow-none print:w-full print:grid-cols-3 print:gap-3 print:p-0"
              >
                {/* Dynamically repeat stickers for matching quantity */}
                {selectedItems.map((item) => {
                  const bcValue = item.barcodeType === 'additional' && item.product.additionalBarcode 
                    ? item.product.additionalBarcode 
                    : item.product.barcode;
                  
                  return Array.from({ length: item.quantity }).map((_, repeatIdx) => (
                    <div 
                      key={`${item.product.id}-${item.barcodeType}-${repeatIdx}`}
                      className={`bg-white border text-center font-sans page-break-avoid flex flex-col justify-between items-center ${
                        stickerStyle === 'price_tag' 
                          ? 'w-[200px] h-[130px] p-2 border-slate-300' 
                          : stickerStyle === 'shelf_big'
                          ? 'w-[260px] h-[160px] p-3 border-2 border-double border-slate-900'
                          : 'w-[160px] h-[90px] p-1.5 border-dashed border-slate-200'
                      }`}
                      style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}
                    >
                      {/* Logo or Mall title */}
                      <div className="text-[9px] uppercase tracking-wide text-slate-400 font-extrabold flex items-center gap-1">
                        <Tag size={8} />
                        <span>{customTitle || (language === 'ar' ? 'داي تو نايت مول' : 'Day To Night Mall')}</span>
                      </div>

                      {/* Name Header */}
                      <div className="w-full text-center space-y-0.5 my-1">
                        <h4 className="text-xs font-black text-slate-900 leading-tight line-clamp-1">
                          {language === 'ar' ? item.product.nameAr : item.product.nameEn}
                        </h4>
                        {stickerStyle === 'shelf_big' && (
                          <div className="text-[9px] text-slate-500 font-medium line-clamp-1">
                            {language === 'ar' ? item.product.nameEn : item.product.nameAr}
                          </div>
                        )}
                      </div>

                      {/* Barcode Vector Grid */}
                      <div className="transform scale-[0.85] w-full flex justify-center -my-1">
                        <BarcodeRenderer 
                          value={bcValue} 
                          width={stickerStyle === 'shelf_big' ? 1.4 : 1.1} 
                          height={stickerStyle === 'shelf_big' ? 44 : 32} 
                          showText={stickerStyle !== 'simple_barcode'} 
                        />
                      </div>

                      {/* Retail Selling Price Block */}
                      {stickerStyle !== 'simple_barcode' && (
                        <div className="w-full flex justify-between items-center text-slate-900 border-t border-slate-100 pt-1.5 mt-1 font-mono">
                          <span className="text-[8px] font-bold text-slate-400">
                            {item.barcodeType === 'additional' ? (language === 'ar' ? 'باركود إضافي' : 'ALT BAR') : (language === 'ar' ? 'أساسي' : 'MAIN')}
                          </span>
                          <span className="text-sm font-black text-[#004a99] shrink-0">
                            {item.product.sellPrice.toFixed(2)} <span className="text-[10px] font-black">{language === 'ar' ? 'ج.م' : 'EGP'}</span>
                          </span>
                        </div>
                      )}
                    </div>
                  ));
                })}
              </div>
            </div>

            {/* Global Custom CSS rules injected to page explicitly at print phase */}
            <style dangerouslySetInnerHTML={{ __html: `
              @media print {
                body * {
                  visibility: hidden;
                }
                #print-sheet-fullscreen, #print-sheet-fullscreen * {
                  visibility: visible;
                }
                #print-sheet-fullscreen {
                  position: absolute;
                  left: 0;
                  top: 0;
                  width: 100%;
                  background: white !important;
                  color: black !important;
                  box-shadow: none !important;
                  padding: 0 !important;
                }
                .print\\:hidden {
                  display: none !important;
                }
                .print\\:border-0 {
                  border: none !important;
                }
                #barcode-print-view-grid {
                  display: grid !important;
                  grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
                  gap: 12px !important;
                  width: 100% !important;
                  margin: 0 !important;
                  padding: 0 !important;
                }
                .page-break-avoid {
                  page-break-inside: avoid !important;
                  break-inside: avoid !important;
                }
              }
            ` }} />
          </div>
        )}
      </AnimatePresence>

      {/* CHANNELS CONTROL MODAL SCREEN */}
      <div id="barcode_printer_modal_backdrop" className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto">
        <motion.div
          id="barcode_printer_modal_card"
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="bg-white rounded-2xl shadow-2xl border border-slate-200/90 w-full max-w-4xl overflow-hidden flex flex-col my-8 max-h-[85vh]"
        >
          {/* Main Top Banner */}
          <div className="bg-gradient-to-r from-[#004a99] to-indigo-900 px-6 py-4 flex items-center justify-between text-white">
            <div className="flex items-center gap-2.5">
              <span className="p-1.5 bg-white/10 rounded-lg text-emerald-300">
                <Printer size={18} className="animate-bounce" />
              </span>
              <div>
                <h2 className="text-base font-extrabold tracking-tight">
                  {language === 'ar' ? 'مركز طباعة ملصقات الباركود والأسعار 🏷️🖨️' : 'Smart Retail Barcode & Price Tag Printing Hub'}
                </h2>
                <p className="text-[10px] text-blue-100 font-medium">
                  {language === 'ar' 
                    ? 'أنشئ واطبع ملصقات رفوف مخصصة، باركود الأسعار المجمعة، أو الباركود الإضافي لمنتجاتك بكفاءة' 
                    : 'Configure mass price tags, standalone barcodes, and alt labels instantly.'}
                </p>
              </div>
            </div>
            <button 
              onClick={onClose}
              className="p-1.5 hover:bg-white/10 rounded-full text-blue-100 hover:text-white transition-all cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>

          {/* Core Settings / Split Layout */}
          <div className="p-6 overflow-y-auto flex-1 bg-slate-50/50 grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-0">
            
            {/* Left Side: Parameters / Choices (col-span-12 or col-span-5) */}
            <div className="lg:col-span-5 space-y-4">
              
              {/* Sticker Design Customization */}
              <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm space-y-3">
                <h3 className="text-xs font-black text-[#004a99] border-b border-slate-100 pb-2 flex items-center gap-1.5">
                  <LayoutGrid size={13} />
                  <span>{language === 'ar' ? 'نموذج وملصق الطباعة:' : 'Label Template:'}</span>
                </h3>

                {/* Templates Selector Grid */}
                <div className="grid grid-cols-3 gap-2">
                  <button
                    onClick={() => setStickerStyle('price_tag')}
                    className={`p-2.5 text-center rounded-lg border flex flex-col items-center gap-1 transition-all cursor-pointer ${
                      stickerStyle === 'price_tag'
                        ? 'border-[#004a99] bg-blue-50/40 text-[#004a99]'
                        : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                    }`}
                  >
                    <Tag size={16} />
                    <span className="text-[9px] font-black">{language === 'ar' ? 'ملصق سعر ومسمى' : 'Standard Tag'}</span>
                  </button>

                  <button
                    onClick={() => setStickerStyle('shelf_big')}
                    className={`p-2.5 text-center rounded-lg border flex flex-col items-center gap-1 transition-all cursor-pointer ${
                      stickerStyle === 'shelf_big'
                        ? 'border-[#004a99] bg-blue-50/40 text-[#004a99]'
                        : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                    }`}
                  >
                    <Layers size={16} />
                    <span className="text-[9px] font-black">{language === 'ar' ? 'بطاقة رف كبيرة' : 'Shelf Card'}</span>
                  </button>

                  <button
                    onClick={() => setStickerStyle('simple_barcode')}
                    className={`p-2.5 text-center rounded-lg border flex flex-col items-center gap-1 transition-all cursor-pointer ${
                      stickerStyle === 'simple_barcode'
                        ? 'border-[#004a99] bg-blue-50/40 text-[#004a99]'
                        : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                    }`}
                  >
                    <Barcode size={16} />
                    <span className="text-[9px] font-black">{language === 'ar' ? 'باركود فقط صغير' : 'Barcode Only'}</span>
                  </button>
                </div>

                {/* Custom Mall Title */}
                <div>
                  <label className="block text-[10px] text-slate-400 font-extrabold uppercase mb-1">{language === 'ar' ? 'العنوان العلوي للملصق:' : 'Label Top Header Text:'}</label>
                  <input
                    type="text"
                    value={customTitle}
                    onChange={(e) => setCustomTitle(e.target.value)}
                    placeholder={language === 'ar' ? 'داي تو نايت مول' : 'Day To Night Mall'}
                    className="w-full text-xs font-bold px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#004a99]"
                  />
                </div>
              </div>

              {/* Instant Bulk Preset Buttons */}
              <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm space-y-3">
                <h3 className="text-xs font-black text-[#004a99] border-b border-slate-100 pb-2 flex items-center gap-1.5">
                  <Sparkles size={13} className="text-amber-500" />
                  <span>{language === 'ar' ? 'اختصارات التجهيز السريع:' : 'Quick Presets Selection:'}</span>
                </h3>
                <div className="flex flex-col gap-2">
                  <button
                    onClick={selectAllProductsForMassPrint}
                    className="w-full text-right text-xs font-bold bg-[#004a99]/10 hover:bg-[#004a99]/15 text-[#004a99] px-3 py-2 border border-[#004a99]/20 rounded-lg flex items-center justify-between transition-colors cursor-pointer"
                  >
                    <span>🎯 {language === 'ar' ? 'تجهيز الأسعار مجمع (كل المنتجات الأسخن)' : 'Select all products for mass tags'}</span>
                    <span className="bg-[#004a99] text-white text-[10px] font-bold px-2 py-0.5 rounded-full">{products.length}</span>
                  </button>

                  <button
                    onClick={selectAlternativeBarcodesForPrint}
                    className="w-full text-right text-xs font-bold bg-emerald-500/10 hover:bg-emerald-500/15 text-emerald-800 px-3 py-2 border border-emerald-500/25 rounded-lg flex items-center justify-between transition-colors cursor-pointer"
                  >
                    <span>🏷️ {language === 'ar' ? 'طباعة الباركود الإضافي فقط' : 'Select only additional barcodes'}</span>
                    <span className="bg-emerald-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                      {products.filter(p => !!p.additionalBarcode).length}
                    </span>
                  </button>
                </div>
              </div>

              {/* Help & Instruction Box */}
              <div className="p-3 bg-sky-50 text-sky-850 rounded-xl border border-sky-100 text-[10px] leading-relaxed flex items-start gap-2">
                <Info size={14} className="text-sky-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <span className="font-extrabold block">{language === 'ar' ? 'نصيحة الطباعة الورقية:' : 'Label Placement Tip:'}</span>
                  <p>
                    {language === 'ar' 
                      ? 'عند فتح نافذة الطباعة التابعة للمتصفح، يرجى تفعيل خيار "إزالة الرأس والتذييل" (Remove Headers and Footers) وإعداد الهوامش إلى Minimal أو None من أجل مطابقة مقاس الاستيكرات تماماً.'
                      : 'To match rolls & sheets precisely, check "Remove Headers and Footers" toggled in your chrome print dialog pane.'}
                  </p>
                </div>
              </div>

            </div>

            {/* Right Side: Selected Items Ledger with Search capability (col-span-12 or col-span-7) */}
            <div className="lg:col-span-7 flex flex-col h-full space-y-3 min-h-0">
              
              {/* Product picker search */}
              <div className="bg-white rounded-xl border p-3 flex items-center gap-2.5 shadow-xs shrink-0">
                <Search size={15} className="text-slate-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder={language === 'ar' ? 'ابحث باسم البضاعة أو باركودها لإضافتها لقائمة الطباعة...' : 'Search for products to include...'}
                  className="w-full bg-transparent text-xs focus:outline-none border-0 p-0 text-slate-700 font-bold placeholder-slate-400"
                />
                {searchTerm && (
                  <button onClick={() => setSearchTerm('')} className="text-slate-400 hover:text-slate-600 text-xs font-black">
                    ✕
                  </button>
                )}
              </div>

              {/* Search dropdown suggestions list when search is typed */}
              {searchTerm && (
                <div className="bg-white border rounded-xl shadow-lg max-h-[220px] overflow-y-auto divide-y shrink-0 z-30">
                  {filteredProducts.length === 0 ? (
                    <div className="p-3 text-center text-xs text-slate-400 font-semibold">
                      {language === 'ar' ? 'لا توجد نتائج مطابقة لبحثك' : 'No matching items in cache.'}
                    </div>
                  ) : (
                    filteredProducts.map(p => {
                      const hasAddbc = !!p.additionalBarcode;
                      return (
                        <div key={p.id} className="p-2.5 flex items-center justify-between text-xs hover:bg-slate-50/70">
                          <div>
                            <h4 className="font-bold text-slate-800">{language === 'ar' ? p.nameAr : p.nameEn}</h4>
                            <div className="text-[10px] space-x-2 text-slate-400 font-mono">
                              <span>EAN: {p.barcode}</span>
                              {hasAddbc && <span className="text-emerald-600 font-bold">| {language === 'ar' ? `بديل:` : `ALT:`} {p.additionalBarcode}</span>}
                            </div>
                          </div>
                          
                          <div className="flex gap-1.5">
                            <button
                              onClick={() => {
                                toggleProductSelection(p, 'main');
                                setSearchTerm('');
                              }}
                              className="px-2.5 py-1 bg-slate-100 hover:bg-[#004a99] hover:text-white rounded text-[10px] font-black cursor-pointer transition-all"
                            >
                              + {language === 'ar' ? 'الأساسي' : 'Main'}
                            </button>
                            {hasAddbc && (
                              <button
                                onClick={() => {
                                  toggleProductSelection(p, 'additional');
                                  setSearchTerm('');
                                }}
                                className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-600 hover:text-white text-emerald-800 rounded text-[10px] font-black cursor-pointer transition-all"
                              >
                                + {language === 'ar' ? 'الإضافي' : 'Alternate'}
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              )}

              {/* Items in printing queue ledger */}
              <div className="bg-white border text-xs text-slate-700 rounded-xl flex-1 flex flex-col min-h-0 overflow-hidden shadow-sm">
                <div className="bg-slate-50 px-4 py-2.5 border-b flex justify-between items-center text-[10px] text-slate-500 font-bold uppercase shrink-0">
                  <span>{language === 'ar' ? 'قائمة الاستيكرات الحالية المجهزة للطباعة' : 'Live Stickers Queue Ledger'}</span>
                  <span>{selectedItems.length} {language === 'ar' ? 'صنف(أصناف)' : 'items selected'}</span>
                </div>

                {selectedItems.length === 0 ? (
                  <div className="flex-1 flex flex-col items-center justify-center text-center p-8 text-slate-400 space-y-3">
                    <Printer size={32} className="text-slate-300 animate-pulse" />
                    <p className="font-bold text-xs max-w-sm">
                      {language === 'ar' 
                        ? 'القائمة فارغة حالياً! ابحث في الأعلى وأضف بضائع يدوياً، أو استخدم أزرار الاختصارات للتجهيز التلقائي مجمعاً.' 
                        : 'Print queue queue is empty. Choose a quick preset or search catalogue manually.'}
                    </p>
                  </div>
                ) : (
                  <div className="flex-1 overflow-y-auto divide-y divide-slate-150">
                    {selectedItems.map((item, idx) => {
                      const bcValue = item.barcodeType === 'additional' && item.product.additionalBarcode
                        ? item.product.additionalBarcode
                        : item.product.barcode;
                      
                      return (
                        <div key={`${item.product.id}-${item.barcodeType}`} className="p-3 hover:bg-slate-50/40 flex items-center justify-between gap-3">
                          <div className="flex-1 space-y-1">
                            <div className="flex items-center gap-1.5">
                              <span className="text-[10px] text-slate-400 font-bold">#{idx + 1}</span>
                              <h4 className="font-extrabold text-slate-800 leading-tight">
                                {language === 'ar' ? item.product.nameAr : item.product.nameEn}
                              </h4>
                            </div>
                            
                            <div className="flex flex-wrap items-center gap-2 text-[10px] font-mono text-slate-500">
                              <span className="bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-bold">
                                {language === 'ar' ? item.product.category : item.product.category}
                              </span>
                              <span className="text-slate-400">|</span>
                              <span>EAN: {bcValue}</span>
                              <span className="text-slate-400">|</span>
                              <span className="text-blue-700 font-extrabold">{item.product.sellPrice} ج.م</span>
                            </div>
                          </div>

                          {/* Toggle between Main / Additional if product has both */}
                          <div className="flex items-center gap-4 shrink-0">
                            {item.product.additionalBarcode && (
                              <div className="flex bg-slate-150 p-0.5 rounded-lg border text-[10px] font-bold">
                                <button
                                  type="button"
                                  onClick={() => handleBarcodeTypeSelect(idx, 'main')}
                                  className={`px-2 py-1 rounded-md transition-all cursor-pointer ${
                                    item.barcodeType === 'main'
                                      ? 'bg-[#004a99] text-white shadow-xs'
                                      : 'text-slate-600 hover:text-slate-900'
                                  }`}
                                >
                                  {language === 'ar' ? 'الأساسي' : 'Main'}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleBarcodeTypeSelect(idx, 'additional')}
                                  className={`px-2 py-1 rounded-md transition-all cursor-pointer ${
                                    item.barcodeType === 'additional'
                                      ? 'bg-emerald-600 text-white shadow-xs'
                                      : 'text-slate-600 hover:text-slate-900'
                                  }`}
                                >
                                  {language === 'ar' ? 'الإضافي' : 'Alt'}
                                </button>
                              </div>
                            )}

                            {/* Qty count control sticker repeater count */}
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => handleQtyChange(idx, -1)}
                                className="p-1 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-md cursor-pointer-none border border-slate-200"
                              >
                                <Minus size={11} />
                              </button>
                              <span className="font-bold text-xs w-6 text-center text-slate-800 font-mono">
                                {item.quantity}
                              </span>
                              <button
                                onClick={() => handleQtyChange(idx, 1)}
                                className="p-1 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-md cursor-pointer-none border border-slate-200"
                              >
                                <Plus size={11} />
                              </button>
                            </div>

                            {/* Remove row button */}
                            <button
                              onClick={() => toggleProductSelection(item.product, item.barcodeType)}
                              className="p-1 text-slate-300 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors font-bold text-xs"
                            >
                              ✕
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Ledger metrics footer */}
                <div className="bg-slate-50 border-t px-4 py-2.5 flex items-center justify-between text-[11px] text-slate-500 font-bold shrink-0">
                  <div>
                    {language === 'ar' ? 'إجمالي الاستيكرات المقررة:' : 'Total stickers count:'}{' '}
                    <span className="text-[#004a99] font-black text-xs font-mono">
                      {selectedItems.reduce((acc, current) => acc + current.quantity, 0)}
                    </span>
                  </div>
                  <button
                    onClick={() => setSelectedItems([])}
                    disabled={selectedItems.length === 0}
                    className="text-rose-600 hover:text-rose-800 disabled:opacity-50 text-[10px] uppercase font-black cursor-pointer"
                  >
                    🗑️ {language === 'ar' ? 'تفريغ القائمة بالكامل' : 'Reset List'}
                  </button>
                </div>
              </div>

            </div>

          </div>

          {/* Footer Controls */}
          <div className="border-t bg-slate-50 px-6 py-4 flex items-center justify-between shrink-0">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-slate-200 rounded-lg hover:bg-slate-100 text-slate-600 text-xs font-bold transition-all"
            >
              {language === 'ar' ? 'إلغاء وإغلاق' : 'Close Setup'}
            </button>

            <button
              onClick={handlePrintTrigger}
              disabled={selectedItems.length === 0}
              className="px-6 py-2.5 bg-[#004a99] hover:bg-blue-700 disabled:opacity-50 disabled:hover:scale-100 text-white font-black rounded-lg shadow-md flex items-center gap-1.5 hover:scale-[1.01] transition-all text-xs cursor-pointer"
            >
              <Printer size={15} />
              <span>
                {language === 'ar' 
                  ? `أرسل الاستيكرات للمعاينة (${selectedItems.reduce((acc, curr) => acc + curr.quantity, 0)}) 🖨️` 
                  : `Review labels to print (${selectedItems.reduce((acc, curr) => acc + curr.quantity, 0)}) 🖨️`}
              </span>
            </button>
          </div>
        </motion.div>
      </div>
    </>
  );
};
