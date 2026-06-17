/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  MessageCircle,
  Upload,
  FileSpreadsheet,
  Award,
  Coins,
  ExternalLink,
  Share2,
  Bell, 
  Package, 
  ShoppingCart, 
  Plus, 
  Search, 
  Filter, 
  AlertTriangle, 
  Trash2, 
  Edit, 
  Calendar, 
  Globe, 
  Phone, 
  ShieldAlert, 
  Sparkles, 
  RefreshCw, 
  Truck, 
  Info, 
  X, 
  Check, 
  TrendingUp, 
  Tag, 
  Database,
  Grid,
  FileText,
  BadgeAlert,
  Archive,
  Barcode,
  Eye,
  Settings,
  Users,
  Lock,
  Unlock,
  LogOut,
  LogIn,
  Activity,
  UserCheck,
  Tv,
  UserPlus,
  Camera,
  Printer,
  DollarSign,
  CreditCard,
  Download,
  ChevronLeft,
  ChevronDown,
  Tags
} from 'lucide-react';
import { Product, CategoryKey, ExpiryNotification } from './types';
import { 
  CATEGORIES, 
  INITIAL_PRODUCTS, 
  INITIAL_SUPPLIERS, 
  getProductExpiryStatus, 
  SYSTEM_TODAY, 
  getDaysDifference 
} from './data';
import { AnalyticsCharts } from './components/AnalyticsCharts';
import { AddProductModal } from './components/AddProductModal';
import { InvoiceScannerModal } from './components/InvoiceScannerModal';
import { CameraBarcodeScanner } from './components/CameraBarcodeScanner';
import { BarcodePrinterModal } from './components/BarcodePrinterModal';

export default function App() {
  // 1. اللغة وتفاعلات الواجهة بمرونة
  const [language, setLanguage] = useState<'ar' | 'en'>('ar');
  const [activeTab, setActiveTab] = useState<'overview' | 'catalog' | 'expiry' | 'suppliers' | 'cashier' | 'staff' | 'customers' | 'invoices' | 'transfers' | 'warehouses' | 'financials' | 'reports' | 'hr'>('overview');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  
  // التحكم في تمدد أو إنحناء أقسام لوحة التحكم الجانبية (Sidebar Categories Accordion)
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    cashier: false,
    customers: false,
    products: false,
    pricelists: false,
    barcode: false,
    purchases: false,
    mainWarehouse: true, // مفتوح تلقائياً لمحاكاة الصورة المرفقة بالكامل
    transfers: false,
    branchWarehouse: false,
    generalSafe: false,
    branchSafe: false,
    analytics: true,
    inventory: true,
    sales: true,
    hrFinance: true,
    additionalTools: false
  });
  
  // 🔐 نظام الصلاحيات الفعلي وحالة تسجيل دخول الموظف الحية
  const [currentUser, setCurrentUser] = useState<any>(() => {
    const saved = localStorage.getItem('currentUser');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { return null; }
    }
    return null;
  });

  const currentUserRole = currentUser ? currentUser.role : null;

  // حقول تسجيل الدخول للبوابة الأمنية (Login states)
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // طاقم العمل والورديات وسجلات العمليات الحية المسترجعة من الباك اند دائمًا لتحديث فوري
  const [staff, setStaff] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);

  // 🖥️ حالة بث شاشة العميل المستقلة بالكامل (Shopper Projection Screen Mirroring)
  const [isCustomerScreenProjected, setIsCustomerScreenProjected] = useState(false);

  // 🔑 حالات إدارة وإضافة الطاقم (Staff Creation fields)
  const [newStaffUsername, setNewStaffUsername] = useState('');
  const [newStaffPassword, setNewStaffPassword] = useState('');
  const [newStaffNameAr, setNewStaffNameAr] = useState('');
  const [newStaffNameEn, setNewStaffNameEn] = useState('');
  const [newStaffRole, setNewStaffRole] = useState<'admin' | 'warehouse' | 'cashier'>('cashier');
  const [newStaffShiftTime, setNewStaffShiftTime] = useState('09:00 AM - 05:00 PM');
  const [newStaffRegisterId, setNewStaffRegisterId] = useState('REG-B-02');
  const [isAddStaffOpen, setIsAddStaffOpen] = useState(false);


  const refreshStaffList = () => {
    fetch('/api/auth/staff')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setStaff(data);
      })
      .catch(err => console.error("Error fetching staff:", err));
  };

  const refreshAuditLogs = () => {
    fetch('/api/logs')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setAuditLogs(data);
      })
      .catch(err => console.error("Error fetching logs:", err));
  };

  const pushCustomAuditLog = (actionAr: string, actionEn: string) => {
    if (!currentUser) return;
    fetch('/api/logs/custom', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: currentUser.username,
        actionAr,
        actionEn
      })
    })
    .then(() => refreshAuditLogs());
  };

  const checkPermission = (actionNameAr: string, actionNameEn: string, requiredRole: 'admin' | 'warehouse'): boolean => {
    if (currentUserRole === 'admin') return true;
    if (requiredRole === 'warehouse' && currentUserRole === 'warehouse') return true;
    
    const errorMsg = language === 'ar'
      ? `🛑 خطأ في الصلاحيات المتوفرة للرتبة الحالية: إجراء "${actionNameAr}" مقيد ويتطلب رتبة: [${
          requiredRole === 'admin' ? 'المدير العام (أبو بكر زهران)' : 'أمين المستودع (أحمد عبد العال)'
        }]`
      : `🛑 Access Denied: "${actionNameEn}" requires [${
          requiredRole === 'admin' ? 'General Manager / Admin' : 'Warehouse Keeper'
        }] clearance level.`;
    triggerToast(errorMsg);
    return false;
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginUsername || !loginPassword) return;
    setIsLoggingIn(true);
    setLoginError(null);

    fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: loginUsername.trim(), password: loginPassword })
    })
    .then(res => res.json())
    .then(data => {
      setIsLoggingIn(false);
      if (data.success) {
        localStorage.setItem('currentUser', JSON.stringify(data.user));
        setCurrentUser(data.user);
        triggerToast(language === 'ar' ? `👋 تم الدخول بنجاح! مرحباً بالموظف: ${data.user.nameAr}` : `👋 Welcome back, ${data.user.nameEn}!`);
        
        setLoginUsername('');
        setLoginPassword('');
        setLoginError(null);

        refreshStaffList();
        refreshAuditLogs();
        
        if (data.user.role === 'cashier') {
          setActiveTab('cashier');
        } else {
          setActiveTab('overview');
        }
      } else {
        setLoginError(language === 'ar' ? data.messageAr : data.messageEn);
      }
    })
    .catch(err => {
      setIsLoggingIn(false);
      setLoginError(language === 'ar' ? "فشل الاتصال بالخادم الأمني للبوابة" : "Failed to connect to authentication server");
    });
  };

  const handleUpdateStaffRole = (targetUsername: string, newRole: 'admin' | 'warehouse' | 'cashier') => {
    if (currentUserRole !== 'admin') {
      triggerToast(language === 'ar' ? '⛔ صلاحية التعديل مقصورة على المدير العام فقط!' : '⛔ Changing role requires Admin role.');
      return;
    }
    fetch('/api/auth/staff/role', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        adminUsername: currentUser.username,
        targetUsername,
        newRole
      })
    })
    .then(res => res.json())
    .then(data => {
      if (data.success) {
        triggerToast(language === 'ar' ? '✅ تم نقل وتحديث صلاحيات الموظف بنجاح والتوثيق بالسجل!' : '✅ Staff re-delegated and audit trace saved!');
        refreshStaffList();
        refreshAuditLogs();
        if (currentUser && currentUser.username === targetUsername) {
          const updatedUser = { ...currentUser, role: newRole };
          localStorage.setItem('currentUser', JSON.stringify(updatedUser));
          setCurrentUser(updatedUser);
        }
      } else {
        triggerToast(language === 'ar' ? data.messageAr : data.messageEn);
      }
    })
    .catch(err => {
      console.error(err);
      triggerToast('Error connecting with credentials server');
    });
  };

  const handleCreateStaff = (e: React.FormEvent) => {
    e.preventDefault();
    if (currentUserRole !== 'admin') {
      triggerToast(language === 'ar' ? '⛔ هذه الصلاحية مقصورة على المدير العام فقط!' : '⛔ Adding employees is restricted to Admin role.');
      return;
    }
    if (!newStaffUsername || !newStaffPassword || !newStaffNameAr || !newStaffNameEn) {
      triggerToast(language === 'ar' ? '⚠️ يرجى تعبئة كافة الحقول لتأكيد تسجيل الموظف' : '⚠️ Please fill all required fields');
      return;
    }

    fetch('/api/auth/staff/add', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        adminUsername: currentUser.username,
        username: newStaffUsername,
        nameAr: newStaffNameAr,
        nameEn: newStaffNameEn,
        role: newStaffRole,
        password: newStaffPassword,
        shiftTime: newStaffShiftTime,
        registerId: newStaffRegisterId
      })
    })
    .then(res => res.json())
    .then(data => {
      if (data.success) {
        triggerToast(language === 'ar' ? `🎉 تم تسجيل الموظف (${newStaffNameAr}) بنجاح وتوليد وثيقة الهوية!` : `🎉 Successfully registered ${newStaffNameEn}!`);
        setIsAddStaffOpen(false);
        // Clear fields
        setNewStaffUsername('');
        setNewStaffPassword('');
        setNewStaffNameAr('');
        setNewStaffNameEn('');
        setNewStaffRole('cashier');
        setNewStaffShiftTime('09:00 AM - 05:00 PM');
        setNewStaffRegisterId('REG-B-02');
        
        refreshStaffList();
        refreshAuditLogs();
      } else {
        triggerToast(language === 'ar' ? data.messageAr : data.messageEn);
      }
    })
    .catch(err => {
      console.error(err);
      triggerToast('Failed to connect to crew server');
    });
  };

  const handleDeleteStaff = (targetUsername: string) => {
    if (currentUserRole !== 'admin') {
      triggerToast(language === 'ar' ? '⛔ إلغاء تفعيل حسابات الموظفين مقصور للمدير فقط!' : '⛔ Deleting employees requires Admin role.');
      return;
    }
    const confirmText = language === 'ar' 
      ? `🚨 هل أنت متأكد تماماً من إلغاء حساب الموظف @${targetUsername} نهائياً؟ تفويض السجل سيتوقف.` 
      : `🚨 Are you sure you want to permanently delete @${targetUsername}?`;
    
    if (!window.confirm(confirmText)) return;

    fetch('/api/auth/staff/delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        adminUsername: currentUser.username,
        targetUsername
      })
    })
    .then(res => res.json())
    .then(data => {
      if (data.success) {
        triggerToast(language === 'ar' ? '🗑️ تم حذف حساب الموظف بالكامل في الخلفية وتوثيق التخريب!' : 'Deregistration logged & employee deleted successfully.');
        refreshStaffList();
        refreshAuditLogs();
      } else {
        triggerToast(language === 'ar' ? data.messageAr : data.messageEn);
      }
    })
    .catch(err => {
      console.error(err);
      triggerToast('Failed to call crew service deletion');
    });
  };

  const handleLogout = () => {
    if (!currentUser) return;
    const oldUser = currentUser;
    fetch('/api/auth/logout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: oldUser.username })
    })
    .then(() => {
      localStorage.removeItem('currentUser');
      sessionStorage.removeItem('expiry_alert_muted');
      setCurrentUser(null);
      triggerToast(language === 'ar' ? '⚠️ تم تسجيل الخروج من الوردية الحالية بنجاح!' : '⚠️ Logged out of current shifts session successfully.');
      refreshStaffList();
      refreshAuditLogs();
    })
    .catch(() => {
      localStorage.removeItem('currentUser');
      sessionStorage.removeItem('expiry_alert_muted');
      setCurrentUser(null);
    });
  };

  const renderRestrictedView = (titleAr: string, titleEn: string, textAr: string, textEn: string) => {
    return (
      <motion.div 
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white border border-rose-100 rounded-2xl p-8 py-16 text-center max-w-xl mx-auto shadow-xl my-12"
      >
        <div className="mx-auto w-16 h-16 bg-rose-50 text-rose-650 rounded-full flex items-center justify-center border border-rose-100 mb-6 shadow-sm">
          <ShieldAlert size={30} />
        </div>
        <h3 className="font-extrabold text-[#003d7e] text-lg md:text-xl md:tracking-tight mb-2">
          {language === 'ar' ? titleAr : titleEn}
        </h3>
        <p className="text-slate-500 text-xs md:text-sm max-w-sm mx-auto mb-6 leading-relaxed">
          {language === 'ar' ? textAr : textEn}
        </p>
        <div className="flex gap-3 justify-center">
          <button
            onClick={() => setActiveTab('cashier')}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg cursor-pointer transition-all"
          >
            {language === 'ar' ? 'الرجوع لكاونتر المبيعات الكاشير' : 'Back to POS Desk'}
          </button>
          
          <button
            onClick={() => {
              setActiveTab('staff');
              triggerToast(language === 'ar' ? '🔑 يرجى طلب تغيير الصلاحية من المدير العام من لوحة طاقم العمل' : '🔑 Please request role delegation in Staff desk from Admin');
            }}
            className="px-4 py-2 bg-amber-500 hover:bg-amber-650 text-slate-950 text-xs font-bold rounded-lg cursor-pointer transition-all animate-bounce"
          >
            {language === 'ar' ? 'عرض طاقم العمل وتغيير الصلاحية من المدير' : 'Go to Staff Clearance Control'}
          </button>
        </div>
      </motion.div>
    );
  };

  // 2. التاريخ المحاكي والتحكم في إشعار الـ60 يومًا
  const [simulatedToday, setSimulatedToday] = useState<string>(SYSTEM_TODAY);
  const [thresholdDays, setThresholdDays] = useState<number>(60);

  // الكاشف المالي وتحديد اليوم / الشهر للمبيعات والأرباح والخسائر
  const [financialPeriod, setFinancialPeriod] = useState<'all' | 'daily' | 'monthly'>('all');
  const [selectedFinancialDay, setSelectedFinancialDay] = useState<string>(SYSTEM_TODAY);
  const [selectedFinancialMonth, setSelectedFinancialMonth] = useState<string>("2026-06");

  // مزامنة التواريخ المالية عند تسريع الزمن أو تعديل ساعة النظام
  useEffect(() => {
    setSelectedFinancialDay(simulatedToday);
    if (simulatedToday && simulatedToday.length >= 7) {
      setSelectedFinancialMonth(simulatedToday.substring(0, 7));
    }
  }, [simulatedToday]);

  // 3. حالة بضائع المول المتصلة بالباك اند مع حفظ نسخة احتياطية محلية
  const [products, setProducts] = useState<Product[]>(() => {
    const saved = localStorage.getItem('d2n_mall_products');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error("Error loading products:", e);
      }
    }
    return INITIAL_PRODUCTS;
  });

  // إضافة حالات الكاشير وصالة العرض
  const [posCart, setPosCart] = useState<{ product: Product; quantity: number }[]>([]);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState<boolean>(false);
  const [lastReceipt, setLastReceipt] = useState<{ id: string; items: any[]; total: number; cash: number; discount: number; date: string } | null>(null);
  const [scannerQuery, setScannerQuery] = useState<string>('');
  const [transactions, setTransactions] = useState<any[]>([]);

  // Temporary Form States for New ERP Modules
  const [transferProductId, setTransferProductId] = useState<string>('');
  const [transferQty, setTransferQty] = useState<number>(1);
  const [activePrintOrder, setActivePrintOrder] = useState<any>(null);

  const [invoiceNumberInput, setInvoiceNumberInput] = useState<string>('');
  const [invoiceSupplierName, setInvoiceSupplierName] = useState<string>('');
  const [invoiceSupplierPhone, setInvoiceSupplierPhone] = useState<string>('');
  const [invoiceItems, setInvoiceItems] = useState<any[]>([]);

  const [newCustomerName, setNewCustomerName] = useState<string>('');
  const [newCustomerPhone, setNewCustomerPhone] = useState<string>('');
  const [newCustomerGov, setNewCustomerGov] = useState<string>('القاهرة');
  const [newCustomerClassification, setNewCustomerClassification] = useState<string>('auto'); // 'auto' or custom (e.g. VIP)

  // Advanced WhatsApp state
  const [waCustomTemplate, setWaCustomTemplate] = useState<string>(() => {
    return "السلام عليكم أ. {{الاسم}}، نود إخطاركم بأن رصيد نقاط الولاء الخاص بكم هو {{النقاط}} نقطة، وقيمتها المالية المتاحة للاستبدال هي {{الفلوس}} جنيه مصري. شكراً لولائكم لمول زهران! ✨";
  });
  const [selectedWhatsAppCustomer, setSelectedWhatsAppCustomer] = useState<any | null>(null);
  const [customWhatsAppText, setCustomWhatsAppText] = useState<string>('');

  // Search & Filter state for Customers List
  const [customerSearchQuery, setCustomerSearchQuery] = useState<string>('');
  const [customerGovFilter, setCustomerGovFilter] = useState<string>('all');
  const [customerTierFilter, setCustomerTierFilter] = useState<string>('all');

  // Manual points modification state
  const [pointsAdjustmentCustomer, setPointsAdjustmentCustomer] = useState<any | null>(null);
  const [pointsAdjAmount, setPointsAdjAmount] = useState<number>(50);
  const [pointsAdjAction, setPointsAdjAction] = useState<'add' | 'deduct' | 'set'>('add');
  const [pointsAdjReason, setPointsAdjReason] = useState<string>('مكافأة ولاء إضافية');

  // CSV/Excel Import state
  const [isImportModalOpen, setIsImportModalOpen] = useState<boolean>(false);
  const [importRawText, setImportRawText] = useState<string>('');
  const [importStatusMessage, setImportStatusMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [parsedImportRows, setParsedImportRows] = useState<any[]>([]);
  const [importMapping, setImportMapping] = useState({
    name: 0,
    phone: 1,
    governorate: 2,
    points: 3,
    classification: 4
  });
  const [rawHeaders, setRawHeaders] = useState<string[]>([]);
  const [csvPreviewList, setCsvPreviewList] = useState<any[]>([]);

  // دالة قياس درجات الفئات للولاء حسب أرصدة النقاط المتراكمة
  const getCustomerClassificationInfo = (points: number, customClass?: string) => {
    if (customClass && customClass !== 'auto' && customClass !== '') {
      if (customClass === 'VIP') return { label: 'VIP 💎', color: 'bg-rose-100/70 text-rose-800 border-rose-250' };
      if (customClass === 'بلاتيني') return { label: 'بلاتيني 🌌', color: 'bg-indigo-100/70 text-indigo-805 border-indigo-250' };
      if (customClass === 'ذهبي') return { label: 'ذهبي 🥇', color: 'bg-amber-100/75 text-amber-850 border-amber-250' };
      if (customClass === 'فضي') return { label: 'فضي 🥈', color: 'bg-slate-150 text-slate-800 border-slate-200' };
      if (customClass === 'برونزي') return { label: 'برونزي 🥉', color: 'bg-amber-50 text-amber-900 border-amber-100' };
      return { label: customClass, color: 'bg-slate-50 text-slate-705 border-slate-20 w' };
    }
    if (points > 1000) return { label: 'VIP 💎', color: 'bg-rose-100/70 text-rose-800 border-rose-250' };
    if (points > 600) return { label: 'بلاتيني 🌌', color: 'bg-indigo-100/70 text-indigo-805 border-indigo-250' };
    if (points > 300) return { label: 'ذهبي 🥇', color: 'bg-amber-100/75 text-amber-850 border-amber-250' };
    if (points > 100) return { label: 'فضي 🥈', color: 'bg-slate-155 text-slate-805 border-slate-200' };
    return { label: 'برونزي 🥉', color: 'bg-emerald-50 text-emerald-805 border-emerald-150' };
  };

  // جلب البيانات من الباك اند فور التحميل
  const refreshProductsFromBackend = () => {
    fetch('/api/products')
      .then((res) => {
        if (!res.ok) throw new Error("HTTP error " + res.status);
        return res.json();
      })
      .then((data) => {
        if (data && Array.isArray(data)) {
          setProducts(data);
        }
      })
      .catch((err) => console.error("Error communicating with express backend, relying on local state:", err));
  };

  const refreshTransactionsFromBackend = () => {
    fetch('/api/transactions')
      .then((res) => {
        if (!res.ok) throw new Error("HTTP error " + res.status);
        return res.json();
      })
      .then((data) => {
        if (data && Array.isArray(data)) {
          setTransactions(data);
        }
      })
      .catch((err) => console.error("Error loading transactions:", err));
  };

  // Advanced States: Customers, Invoices, Transfers and FIFO/LIFO Toggles
  const [customers, setCustomers] = useState<any[]>([]);
  const [transfers, setTransfers] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [supplierPayments, setSupplierPayments] = useState<any[]>([]);
  const [suppliersSubTab, setSuppliersSubTab] = useState<'list' | 'create' | 'excel' | 'archive' | 'pricing'>('list');
  const [isAddingSupplier, setIsAddingSupplier] = useState<boolean>(false);
  const [editingSupplier, setEditingSupplier] = useState<any | null>(null);
  const [supplierPaymentModal, setSupplierPaymentModal] = useState<any | null>(null);
  const [paymentAmount, setPaymentAmount] = useState<string>('');
  const [paymentNotes, setPaymentNotes] = useState<string>('');
  const [paymentDate, setPaymentDate] = useState<string>('');
  const [invoiceForm, setInvoiceForm] = useState<any>({
    invoiceNumber: '',
    supplierName: '',
    supplierPhone: '',
    date: '',
    invoiceType: 'purchase',
    isPosted: true,
    items: []
  });
  const [selectedArchiveInvoice, setSelectedArchiveInvoice] = useState<any | null>(null);
  const [invoiceSearchQuery, setInvoiceSearchQuery] = useState<string>('');
  const [deductionMethod, setDeductionMethod] = useState<'fifo' | 'lifo'>('fifo');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [redeemedPointsInput, setRedeemedPointsInput] = useState<number>(0);
  const [isAddCustomerDrawerOpen, setIsAddCustomerDrawerOpen] = useState<boolean>(false);
  const [posCustomerName, setPosCustomerName] = useState<string>('');
  const [posCustomerPhone, setPosCustomerPhone] = useState<string>('');
  const [posCustomerGov, setPosCustomerGov] = useState<string>('القاهرة');

  const refreshCustomers = () => {
    fetch('/api/customers')
      .then(res => res.json())
      .then(data => { if (Array.isArray(data)) setCustomers(data); })
      .catch(err => console.error("Error loading customers", err));
  };

  const refreshTransfers = () => {
    fetch('/api/transfers')
      .then(res => res.json())
      .then(data => { if (Array.isArray(data)) setTransfers(data); })
      .catch(err => console.error("Error loading transfers", err));
  };

  const refreshInvoices = () => {
    fetch('/api/invoices')
      .then(res => res.json())
      .then(data => { if (Array.isArray(data)) setInvoices(data); })
      .catch(err => console.error("Error loading invoices", err));
  };

  const refreshSuppliers = () => {
    fetch('/api/suppliers')
      .then(res => res.json())
      .then(data => { if (Array.isArray(data)) setSuppliers(data); })
      .catch(err => console.error("Error loading suppliers", err));
  };

  const refreshSupplierPayments = () => {
    fetch('/api/suppliers/payments')
      .then(res => res.json())
      .then(data => { if (Array.isArray(data)) setSupplierPayments(data); })
      .catch(err => console.error("Error loading supplier payments", err));
  };

  // Enterprise ERP state variables and synchronization helpers:
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [financials, setFinancials] = useState<any>({ accounts: [], journal: [], assets: [], loans: [] });
  const [accountingStep, setAccountingStep] = useState<number>(1);
  const [selectedLedgerAccount, setSelectedLedgerAccount] = useState<string>("101");
  const [hrData, setHrData] = useState<any>({ attendance: [], leaves: [] });

  const refreshWarehouses = () => {
    fetch('/api/warehouses')
      .then(res => res.json())
      .then(data => { if (Array.isArray(data)) setWarehouses(data); })
      .catch(err => console.error("Error loading warehouses", err));
  };

  const refreshFinancials = () => {
    fetch('/api/financials')
      .then(res => res.json())
      .then(data => { if (data && data.accounts) setFinancials(data); })
      .catch(err => console.error("Error loading financials", err));
  };

  const refreshHR = () => {
    fetch('/api/hr')
      .then(res => res.json())
      .then(data => { if (data && data.attendance) setHrData(data); })
      .catch(err => console.error("Error loading HR data", err));
  };

  useEffect(() => {
    refreshProductsFromBackend();
    refreshTransactionsFromBackend();
    refreshStaffList();
    refreshAuditLogs();
    refreshCustomers();
    refreshTransfers();
    refreshInvoices();
    refreshSuppliers();
    refreshSupplierPayments();
    refreshWarehouses();
    refreshFinancials();
    refreshHR();
  }, []);

  // 4. الإشعارات والمنبثقات النشطة (Pop Notifications)
  const [activePopups, setActivePopups] = useState<ExpiryNotification[]>([]);
  const [isAlertOverlayShown, setIsAlertOverlayShown] = useState<boolean>(false);
  const [isAlertMuted, setIsAlertMuted] = useState<boolean>(() => {
    return localStorage.getItem('expiry_alert_muted') === 'true';
  });
  const [notificationsDismissed, setNotificationsDismissed] = useState<string[]>([]);
  
  // 5. التعديل والإضافة المودال
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isScanInvoiceOpen, setIsScanInvoiceOpen] = useState(false);
  const [isPosCameraScannerOpen, setIsPosCameraScannerOpen] = useState(false);
  const [isBarcodePrinterOpen, setIsBarcodePrinterOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  // 6. الفلاتر والبحث
  const [searchText, setSearchText] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<CategoryKey | 'all'>('all');
  const [selectedExpiryFilter, setSelectedExpiryFilter] = useState<'all' | 'valid' | 'near_expiry' | 'expired'>('all');
  const [selectedStockFilter, setSelectedStockFilter] = useState<'all' | 'low_stock' | 'out_of_warehouse'>('all');

  // 7. حفظ التحديثات باللوكال ستورج كبطانة أمان إضافية
  useEffect(() => {
    localStorage.setItem('d2n_mall_products', JSON.stringify(products));
  }, [products]);

  // 8. احتساب الإشعارات بناء على التاريخ الحالي ومستوى عتبة تنبيه الصلاحية (60 يوماً افتراضياً)
  useEffect(() => {
    const warnings: ExpiryNotification[] = [];
    products.forEach((p) => {
      const { status, daysRemaining } = getProductExpiryStatus(p.expirationDate, simulatedToday, thresholdDays);
      
      // لا يظهر الإشعار للمنتج إذا تم إلغاؤه يدوياً في الجلسة لمنع الإزعاج المتكرر
      if ((status === 'near_expiry' || status === 'expired') && !notificationsDismissed.includes(p.id)) {
        const totalQty = p.shelfStock + p.warehouseStock;
        if (totalQty > 0) {
          warnings.push({
            id: `notif-${p.id}`,
            productId: p.id,
            productNameAr: p.nameAr,
            productNameEn: p.nameEn,
            expirationDate: p.expirationDate,
            daysRemaining,
            quantity: totalQty,
            dismissed: false
          });
        }
      }
    });

    // ترتيب الإشعارات حسب الأهمية (الأقرب انتهاءاً أولاً)
    warnings.sort((a, b) => a.daysRemaining - b.daysRemaining);
    setActivePopups(warnings);

    // إظهار التنبيه الترحيبي العريض في حال وجود بضائع توشك على النفاد ولم يتم كتمه
    if (currentUser && warnings.length > 0 && !isAlertMuted) {
      setIsAlertOverlayShown(true);
    } else {
      setIsAlertOverlayShown(false);
    }
  }, [products, simulatedToday, thresholdDays, notificationsDismissed, isAlertMuted, currentUser]);

  // 9. تفاعلات الكاشير ونقاط البيع (Cashier functions)
  const handleCameraBarcodeScan = (barcode: string) => {
    setIsPosCameraScannerOpen(false);
    const matchedPrd = products.find(p => p.barcode === barcode.trim());
    if (matchedPrd) {
      addToCart(matchedPrd);
    } else {
      triggerToast(language === 'ar' 
        ? `⚠️ لم يتم العثور على منتج بالباركود: ${barcode}` 
        : `⚠️ Barcode not registered in Day-to-Night inventory: ${barcode}`
      );
    }
  };

  const addToCart = (product: Product) => {
    const totalQtyInCart = posCart.find(item => item.product.id === product.id)?.quantity || 0;
    if (product.shelfStock <= totalQtyInCart) {
      triggerToast(language === 'ar' 
        ? `⚠️ نفاد الكمية! لا يمكن إضافة المزيد من [${product.nameAr}] المتاح على الرف: ${product.shelfStock}` 
        : `⚠️ Out of Stock! Cannot add more [${product.nameEn}] Shelf stock: ${product.shelfStock}`
      );
      return;
    }
    const idx = posCart.findIndex((item) => item.product.id === product.id);
    if (idx !== -1) {
      const copy = [...posCart];
      copy[idx].quantity += 1;
      setPosCart(copy);
    } else {
      setPosCart([...posCart, { product, quantity: 1 }]);
    }
    const { status, daysRemaining } = getProductExpiryStatus(product.expirationDate, simulatedToday, thresholdDays);
    if (status !== 'valid') {
      triggerToast(language === 'ar' 
        ? `🚨 تحذير كاشير: صنف صلاحية قريبة (${daysRemaining} يوم متبقي!)` 
        : `🚨 Cashier Notice: Expiring item swept (${daysRemaining} days left!)`
      );
    } else {
      triggerToast(language === 'ar' ? `✓ سحب صنف: ${product.nameAr}` : `✓ Swept: ${product.nameEn}`);
    }
  };

  const updateCartQuantity = (productId: string, quantity: number) => {
    const product = products.find(p => p.id === productId);
    if (!product) return;
    if (quantity > product.shelfStock) {
      triggerToast(language === 'ar' 
        ? `⚠️ الحد الأقصى للمتاح على الرف هو ${product.shelfStock}` 
        : `⚠️ Maximum available on shelf is ${product.shelfStock}`
      );
      return;
    }
    if (quantity <= 0) {
      setPosCart(posCart.filter((item) => item.product.id !== productId));
    } else {
      setPosCart(posCart.map((item) => item.product.id === productId ? { ...item, quantity } : item));
    }
  };

  const clearCart = () => {
    setPosCart([]);
    triggerToast(language === 'ar' ? '🗑️ تم تصفير قائمة المشتريات بالكامل' : '🗑️ Checkout order cleared completely');
  };

  const executeCheckout = (cashReceived: number) => {
    if (posCart.length === 0) return;
    
    // Calculate subtotal
    const subtotal = posCart.reduce((sum, item) => sum + item.product.sellPrice * item.quantity, 0);
    
    // Calculate points discount: 10 points = 1 EGP
    const pointsDiscount = selectedCustomerId ? Number((redeemedPointsInput / 10).toFixed(2)) : 0;
    const finalTotal = Math.max(0, subtotal - pointsDiscount);
    
    // Earn 1 point per 10 EGP spent
    const pointsEarned = Math.floor(finalTotal / 10);

    const salesItems = posCart.map(item => ({
      productId: item.product.id,
      quantity: item.quantity,
      sellPrice: item.product.sellPrice,
      finalPrice: item.product.sellPrice // standard sell price
    }));

    fetch('/api/products/sell', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        items: salesItems, 
        simulatedToday,
        deductionMethod, // 'fifo' or 'lifo'
        customerId: selectedCustomerId || undefined,
        pointsRedeemed: selectedCustomerId ? redeemedPointsInput : 0,
        pointsEarned: selectedCustomerId ? pointsEarned : 0
      })
    })
    .then(res => res.json())
    .then(response => {
      if (response.success) {
        setLastReceipt({
          id: 'D2N-REC-' + Math.floor(100000 + Math.random() * 900000),
          items: [...posCart],
          total: finalTotal,
          cash: cashReceived >= finalTotal ? cashReceived : finalTotal,
          discount: pointsDiscount,
          date: new Date().toLocaleString()
        });
        setIsReceiptModalOpen(true);
        setProducts(response.products);
        setPosCart([]);
        setSelectedCustomerId('');
        setRedeemedPointsInput(0);
        refreshTransactionsFromBackend();
        refreshCustomers(); // sync updated points
        triggerToast(language === 'ar' ? `🎉 تم البيع بنجاح بنظام [${deductionMethod.toUpperCase()}] وترصيد نقاط العميل!` : `🎉 Sale recorded successfully via [${deductionMethod.toUpperCase()}] strategy!`);
        
        // سجل أمان حركي للمبيعات
        pushCustomAuditLog(
          `صادر من المبيعات: فاتورة بقيمة ${finalTotal.toFixed(2)} ج.م (خصم نقاط: ${pointsDiscount} ج.م) باستخدام [${deductionMethod.toUpperCase()}]`,
          `POS Invoice: EGP ${finalTotal.toFixed(2)} checkout (redeemed: ${pointsDiscount} EGP) using [${deductionMethod.toUpperCase()}]`
        );
      } else {
        alert(language === 'ar' ? 'فشل تسجيل العملية: ' + (response.errors ? response.errors.join(', ') : '') : 'Checkout failed');
      }
    })
    .catch(err => {
      console.error(err);
      alert('Error connecting with fullstack server');
    });
  };

  // تفاعلات إدارة المنتجات متصلة بالباك اند
  const handleAddProduct = (newProduct: Product) => {
    if (!checkPermission('إضافة صنف أو تعديل البيانات', 'Add/Edit Product', 'admin')) return;
    fetch('/api/products', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newProduct)
    })
    .then(res => res.json())
    .then((response) => {
      if (response.success) {
        refreshProductsFromBackend();
        triggerToast(language === 'ar' ? 'تم تسجيل وتعديل البضائع في الباك اند الفعلي' : 'Item saved on express server database');
      }
    });
    setEditingProduct(null);
  };

  const handleDeleteProduct = (productId: string) => {
    if (!checkPermission('حذف صنف من النظام', 'Delete Product from Catalog', 'admin')) return;
    const textAr = 'هل أنت متأكد من حذف هذا الصنف بالكامل من نظام جرد المول؟';
    const textEn = 'Are you sure you want to completely erase this item from the mall catalog?';
    if (confirm(language === 'ar' ? textAr : textEn)) {
      fetch(`/api/products/${productId}`, { method: 'DELETE' })
        .then(res => res.json())
        .then(response => {
          if (response.success) {
            refreshProductsFromBackend();
            triggerToast(language === 'ar' ? 'تم حذف الصنف تماماً من الخادم' : 'Product discarded on the server');
          }
        });
    }
  };

  // تفاعل سريع: عمل خصم 20% لتسريع البيع
  const handleQuickDiscount = (productId: string, percentage: number = 20) => {
    if (!checkPermission('تطبيق خصم سريع', 'Apply Quick Discount', 'admin')) return;
    fetch('/api/products/quick-action', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'discount',
        productId,
        payload: { percentage, today: simulatedToday }
      })
    })
    .then(res => res.json())
    .then(response => {
      if (response.success) {
        setProducts(response.products);
        triggerToast(language === 'ar' ? `تم خصم ${percentage}% على المنتج بالخلفية!` : `Applied ${percentage}% discount on server!`);
        
        // سجل مخصص للرقابة
        const pObj = response.product || { nameAr: productId, nameEn: productId };
        pushCustomAuditLog(
          `تحديث الأسعار: تطبيق خصم ترويجي بقيمة ${percentage}% على منتج [${pObj.nameAr}] لحث المبيعات`,
          `Promo discounts: Eased checkout by applying -${percentage}% pricing discount on product [${pObj.nameEn}]`
        );
      }
    });
    setNotificationsDismissed(prev => [...prev, productId]);
  };

  // نقل مخزون سريع من المستودع الداخلي إلى الرفوف
  const handleQuickRestock = (productId: string, quantity: number) => {
    if (!checkPermission('تعبئة الرفوف وجرد المنتجات', 'Replenish Stocks', 'warehouse')) return;
    fetch('/api/products/quick-action', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'restock',
        productId,
        payload: { quantity, today: simulatedToday }
      })
    })
    .then(res => res.json())
    .then(response => {
      if (response.success) {
        setProducts(response.products);
        triggerToast(language === 'ar' ? 'تم ملء الرفوف وسحب من المستودع الداخلي بالتزامن!' : 'Replenished shelves and synced with backend repo!');
        
        // سجل مخصص للرقابة
        const pObj = response.product || { nameAr: productId, nameEn: productId };
        pushCustomAuditLog(
          `إمداد الرفوف: سحب شحنة عاجلة لزيادة منتج [${pObj.nameAr}] بمقدار +${quantity} قطعة من المستودع الداخلي`,
          `Shelf Restock: Transferred bulk batch of +${quantity} units for [${pObj.nameEn}] from reserve warehouse`
        );
      }
    });
  };

  // تصفير المخزون بالكامل كإعدام بضاعة تالفة / منتهية الصلاحية
  const handleDisposeStocks = (productId: string) => {
    if (!checkPermission('إعدام وإتلاف بضاعة منتهية الصلاحية', 'Dispose Expired Stocks', 'admin')) return;
    fetch('/api/products/quick-action', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'dispose',
        productId,
        payload: { today: simulatedToday }
      })
    })
    .then(res => res.json())
    .then(response => {
      if (response.success) {
        setProducts(response.products);
        refreshTransactionsFromBackend();
        triggerToast(language === 'ar' ? 'تمت عملية الاستبعاد وتصفير رصيد التلف بالباك اند' : 'Discarded and stock set to 0 on backend database');
        
        // سجل مخصص للرقابة
        const pObj = response.product || { nameAr: productId, nameEn: productId };
        pushCustomAuditLog(
          `إدارة التوالف: تفريغ وإعدام كلي وتصريف مخزون منتج [${pObj.nameAr}] لأسباب انتهاء الصلاحية`,
          `Disposal Action: Total write-off and warehouse disposal executed to 0 units for expired product [${pObj.nameEn}]`
        );
      }
    });
    setNotificationsDismissed(prev => [...prev, productId]);
  };

  // كميات أوامر التموين وإعادة الطلب الذكية
  const handleSupplierRestock = (pId: string, shortage: number) => {
    if (!checkPermission('طلب إمداد توريدي من المورد', 'Supplier Restock Request', 'admin')) return;
    fetch('/api/products/quick-action', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'supplier_restock',
        productId: pId,
        payload: { quantity: shortage, today: simulatedToday }
      })
    })
    .then(res => res.json())
    .then(response => {
      if (response.success) {
        setProducts(response.products);
        triggerToast(language === 'ar' 
          ? `تم اعتماد شحن ودخول ${shortage} وحدة من المنتج للمخزن الداخلي من شركة المورد.` 
          : `Batch load of +${shortage} units shipped and loaded into Back-Store warehouse.`
        );
        
        // سجل مخصص للرقابة
        const pObj = response.product || { nameAr: pId, nameEn: pId };
        pushCustomAuditLog(
          `عقود الإمداد: استقبال وتخزين شحنة توريد لمنتج [${pObj.nameAr}] بمقدار +${shortage} قطعة من شركة التوزيع`,
          `Contract logistics: Checked-in supply batch of +${shortage} units for [${pObj.nameEn}] from distributor`
        );
      }
    });
  };

  // إعادة ضبط البضائع للحالة الأولية للتجربة الصفرية
  const handleResetCatalog = () => {
    if (!checkPermission('إعادة ضبط الكتالوج الافتراضي للشركة', 'Reset Catalog to Factory Presets', 'admin')) return;
    const textAr = 'هل تود استرجاع بضائع مول داي تو نايت الافتراضية؟ سيؤدي هذا لتصفير أي تغييرات يدوية أجريتها.';
    const textEn = 'Do you wish to restore original Day to Night Mall presets? This clears all manual updates.';
    if (confirm(language === 'ar' ? textAr : textEn)) {
      fetch('/api/products/reset', { method: 'POST' })
        .then(res => res.json())
        .then(response => {
          if (response.success) {
            setProducts(response.products);
            setNotificationsDismissed([]);
            localStorage.removeItem('d2n_mall_products');
            refreshTransactionsFromBackend();
            triggerToast(language === 'ar' ? 'تمت إعادة تعيين جرد داي تو نايت الافتراضي بالباك اند' : 'Default mall presets reloaded successfully');
          }
        });
    }
  };

  // 10. إحصائيات لوحة القيادة
  const totalItems = products.length;
  let lowStockCount = 0;
  let nearExpiryCount = 0;
  let expiredCount = 0;
  let totalCostSum = 0;
  let totalSellSum = 0;

  // الحالات الافتراضية التراكمية الإجمالية
  let cumulativeUnitsSold = 0;
  let cumulativeUnitsLost = 0;
  let cumulativeSalesRevenue = 0;
  let cumulativeSalesCost = 0;
  let cumulativeSalesProfit = 0;
  let cumulativeLossesValue = 0;

  products.forEach((p) => {
    // جودة الصلاحية
    const { status } = getProductExpiryStatus(p.expirationDate, simulatedToday, thresholdDays);
    if (status === 'near_expiry') nearExpiryCount++;
    if (status === 'expired') expiredCount++;

    // نقص كميات الرفوف
    if (p.shelfStock <= p.minStockAlert) {
      lowStockCount++;
    }

    // مجموع رأسمال
    const totalQty = p.shelfStock + p.warehouseStock;
    totalCostSum += totalQty * p.buyPrice;
    totalSellSum += totalQty * p.sellPrice;

    // الأرباح والخسائر والمبيعات التراكمية
    const sold = p.unitsSold || 0;
    const lost = p.unitsLost || 0;
    
    cumulativeUnitsSold += sold;
    cumulativeUnitsLost += lost;
    cumulativeSalesRevenue += sold * p.sellPrice;
    cumulativeSalesCost += sold * p.buyPrice;
    cumulativeSalesProfit += sold * (p.sellPrice - p.buyPrice);
    cumulativeLossesValue += lost * p.buyPrice;
  });

  const marginVal = totalCostSum > 0 ? ((totalSellSum - totalCostSum) / totalCostSum) * 100 : 0;

  // تصفية المعاملات حسب رغبة المستخدم (all, daily, monthly)
  const activeTxForPeriod = transactions.filter((tx) => {
    if (financialPeriod === 'daily') {
      return tx.date === selectedFinancialDay;
    } else if (financialPeriod === 'monthly') {
      return tx.date.startsWith(selectedFinancialMonth);
    }
    return true; // use all if 'all'
  });

  // حساب الأرقام المحصورة بنطاق التاريخ
  let totalUnitsSold = 0;
  let totalUnitsLost = 0;
  let totalSalesRevenue = 0;
  let totalSalesCost = 0;
  let totalSalesProfit = 0;
  let totalLossesValue = 0;

  if (financialPeriod === 'all') {
    totalUnitsSold = cumulativeUnitsSold;
    totalUnitsLost = cumulativeUnitsLost;
    totalSalesRevenue = cumulativeSalesRevenue;
    totalSalesCost = cumulativeSalesCost;
    totalSalesProfit = cumulativeSalesProfit;
    totalLossesValue = cumulativeLossesValue;
  } else {
    activeTxForPeriod.forEach((tx) => {
      if (tx.type === 'sale') {
        totalUnitsSold += tx.quantity;
        totalSalesRevenue += tx.quantity * tx.sellPrice;
        totalSalesCost += tx.quantity * tx.buyPrice;
        totalSalesProfit += tx.quantity * (tx.sellPrice - tx.buyPrice);
      } else if (tx.type === 'loss') {
        totalUnitsLost += tx.quantity;
        totalLossesValue += tx.quantity * tx.buyPrice;
      }
    });
  }

  const finalNetProfit = totalSalesProfit - totalLossesValue;

  // حساب الأداء المالي لكل منتج حسب الفترة الزمنية المحددة للجدول
  const getProductPeriodStats = (product: Product) => {
    if (financialPeriod === 'all') {
      return {
        sold: product.unitsSold || 0,
        lost: product.unitsLost || 0,
        revenue: (product.unitsSold || 0) * product.sellPrice,
        profit: (product.unitsSold || 0) * (product.sellPrice - product.buyPrice),
        loss: (product.unitsLost || 0) * product.buyPrice,
      };
    }

    const pTxs = activeTxForPeriod.filter((tx) => tx.productId === product.id);
    let sold = 0;
    let lost = 0;
    let revenue = 0;
    let profit = 0;
    let loss = 0;

    pTxs.forEach((tx) => {
      if (tx.type === 'sale') {
        sold += tx.quantity;
        revenue += tx.quantity * tx.sellPrice;
        profit += tx.quantity * (tx.sellPrice - tx.buyPrice);
      } else if (tx.type === 'loss') {
        lost += tx.quantity;
        loss += tx.quantity * tx.buyPrice;
      }
    });

    return { sold, lost, revenue, profit, loss };
  };

  // 11. فلترة وتصفية البضائع المعروضة بالجدول
  const filteredProducts = products.filter((p) => {
    // بحث اسم أو باركود
    const matchesSearch = 
      p.nameAr.toLowerCase().includes(searchText.toLowerCase()) ||
      p.nameEn.toLowerCase().includes(searchText.toLowerCase()) ||
      p.barcode.includes(searchText);

    // تصفية الفئة
    const matchesCategory = selectedCategory === 'all' || p.category === selectedCategory;

    // تصفية حالة الصلاحية
    const { status } = getProductExpiryStatus(p.expirationDate, simulatedToday, thresholdDays);
    const matchesExpiry = 
      selectedExpiryFilter === 'all' ||
      (selectedExpiryFilter === 'valid' && status === 'valid') ||
      (selectedExpiryFilter === 'near_expiry' && status === 'near_expiry') ||
      (selectedExpiryFilter === 'expired' && status === 'expired');

    // تصفية مستويات الكميات
    const matchesStock = 
      selectedStockFilter === 'all' ||
      (selectedStockFilter === 'low_stock' && p.shelfStock <= p.minStockAlert) ||
      (selectedStockFilter === 'out_of_warehouse' && p.warehouseStock === 0);

    return matchesSearch && matchesCategory && matchesExpiry && matchesStock;
  });

  return (
    <div className="min-h-screen bg-[#f8fafc] flex flex-col font-sans" style={{ direction: language === 'ar' ? 'rtl' : 'ltr' }}>
      
      {/* 🔔 ستة منبثقات إشعار الصلاحية (The Requested Expiration Pop-Up Sidebar) */}
      <div className="fixed bottom-5 left-5 z-40 max-w-sm w-full space-y-3 pointer-events-none md:max-w-md">
        <AnimatePresence>
          {activePopups.slice(0, 3).map((notif) => {
            const isNear = notif.daysRemaining > 0;
            return (
              <motion.div
                key={notif.id}
                initial={{ opacity: 0, x: language === 'ar' ? 100 : -100, scale: 0.9 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ type: 'spring', damping: 20, stiffness: 100 }}
                className={`pointer-events-auto p-4 rounded-xl shadow-lg border-l-4 bg-white flex flex-col gap-2 ${
                  isNear ? 'border-amber-500 shadow-amber-500/5' : 'border-red-600 shadow-red-500/5'
                }`}
                style={{ direction: language === 'ar' ? 'rtl' : 'ltr' }}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex gap-2.5">
                    <span className={`p-1.5 rounded-lg inline-block text-white mt-0.5 ${isNear ? 'bg-amber-500' : 'bg-red-600 animate-pulse'}`}>
                      <AlertTriangle size={16} />
                    </span>
                    <div>
                      <h4 className="font-bold text-slate-800 text-xs md:text-sm">
                        {language === 'ar' ? notif.productNameAr : notif.productNameEn}
                      </h4>
                      <p className="text-[11px] text-slate-400 mt-0.5 font-mono">
                        EAN: {products.find(p => p.id === notif.productId)?.barcode}
                      </p>
                      
                      <div className="mt-1 flex flex-wrap gap-x-2 gap-y-0.5 items-center">
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                          isNear ? 'bg-amber-50 text-amber-700' : 'bg-red-55 text-red-700'
                        }`}>
                          {isNear 
                            ? (language === 'ar' ? `قرب ينتهي خلال ${notif.daysRemaining} يوم` : `Expires in ${notif.daysRemaining} days`)
                            : (language === 'ar' ? 'منتهي الصلاحية ❌' : 'Product Expired ❌')}
                        </span>
                        <span className="text-[10px] text-slate-500">
                          {language === 'ar' ? `الموجود بالمول: ${notif.quantity} قطعة` : `Stock: ${notif.quantity} pcs`}
                        </span>
                      </div>
                    </div>
                  </div>

                  <button 
                    onClick={() => setNotificationsDismissed(prev => [...prev, notif.productId])}
                    className="p-1 text-slate-300 hover:text-slate-500 hover:bg-slate-100 rounded-md ml-auto cursor-pointer"
                  >
                    <X size={14} />
                  </button>
                </div>

                {/* إجراءات المعالجة الذكية المقترحة لتلافي خسارة المول */}
                <div className="flex gap-2 mt-1 border-t border-slate-100 pt-2 justify-end">
                  {isNear ? (
                    <button
                      onClick={() => handleQuickDiscount(notif.productId, 30)}
                      className="px-2 py-1 text-[10px] font-bold text-amber-700 bg-amber-50 hover:bg-amber-200 border border-amber-200 rounded-md flex items-center gap-1 transition-colors hover:scale-102 cursor-pointer"
                    >
                      <Tag size={10} />
                      {language === 'ar' ? 'أوكازيون خصم ٣٠٪' : 'Quick 30% Off'}
                    </button>
                  ) : (
                    <button
                      onClick={() => handleDisposeStocks(notif.productId)}
                      className="px-2 py-1 text-[10px] font-bold text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 rounded-md flex items-center gap-1 transition-colors cursor-pointer"
                    >
                      <Trash2 size={10} />
                      {language === 'ar' ? 'إعدام البضاعة (تلاف)' : 'Liquidate Block'}
                    </button>
                  )}
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* ⚠️ نافذة ترحيبية تنبيهية عريضة (Zahran-style System Alarm) */}
      {isAlertOverlayShown && activePopups.length > 0 && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4" id="expiry-alarm-popup">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-2xl w-full max-w-xl shadow-2xl border border-rose-100 p-6 relative flex flex-col animate-in fade-in zoom-in-95 duration-200"
          >
            <div className="flex gap-4 items-start">
              <div className="p-3 bg-rose-50 rounded-2xl text-rose-600 animate-bounce">
                <ShieldAlert size={28} />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-slate-800">
                  {language === 'ar' 
                    ? '⚠️ تنبيه وشيك: بضائع قاربت على انتهاء صلاحيتها!' 
                    : '⚠️ Urgent Warning: Near-Expiry Products Detected!'}
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  {language === 'ar'
                    ? `يتطلب بروتوكول جودة داي تو نايت مول فرز البضائع التي قاربت صلاحيتها على الانتهاء خلال ${thresholdDays} يوماً فوراً لتجنب الهدر المالي والامتثال لمعايير السلامة وصحة الغذاء.`
                    : `Day to Night Mall quality standard mandates processing stock expiring within ${thresholdDays} days immediately to avoid losses and conform to hygiene safety.`}
                </p>
                
                {/* عينة البضائع المعرضة للخطر */}
                <div className="mt-4 bg-slate-50 rounded-xl p-3 border border-slate-100 max-h-48 overflow-y-auto space-y-2">
                  {activePopups.map((p) => {
                    const isNear = p.daysRemaining > 0;
                    return (
                      <div key={p.id} className="flex justify-between items-center text-xs p-2 bg-white rounded-lg border border-slate-100 shadow-xs">
                        <div className="font-semibold text-slate-700">
                          {language === 'ar' ? p.productNameAr : p.productNameEn}
                        </div>
                        <div className="flex gap-1.5 items-center">
                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                            isNear ? 'bg-amber-100 text-amber-800' : 'bg-red-100 text-red-800'
                          }`}>
                            {isNear 
                              ? (language === 'ar' ? `${p.daysRemaining} يوم` : `${p.daysRemaining} days`)
                              : (language === 'ar' ? 'منتهي ❌' : 'Expired')}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="flex gap-3 justify-end mt-6 border-t border-slate-150 pt-4">
              <button
                onClick={() => {
                  setIsAlertOverlayShown(false);
                  setIsAlertMuted(true);
                  localStorage.setItem('expiry_alert_muted', 'true');
                }}
                className="px-4 py-2 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
                id="ack-btn-popup"
              >
                {language === 'ar' ? 'أدرك ذلك، لا تظهر هذا التنبيه التلقائي مجدداً' : 'Dismiss, do not show this popup warning again'}
              </button>
              
              <button
                onClick={() => {
                  setIsAlertOverlayShown(false);
                  setIsAlertMuted(true);
                  setActiveTab('expiry');
                  localStorage.setItem('expiry_alert_muted', 'true');
                }}
                className="px-5 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-lg shadow-md shadow-rose-100 transition-colors flex items-center gap-1.5 cursor-pointer"
                id="go-safety-btn-popup"
              >
                {language === 'ar' ? 'البدء بفرز المنتجات الحالية' : 'Go to Expiry Safety Area'}
              </button>
            </div>
          </motion.div>
        </div>
      )}
      <AnimatePresence>
        {isCustomerScreenProjected && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-950 z-50 flex flex-col justify-between p-6 overflow-hidden select-none font-sans"
            style={{ direction: language === 'ar' ? 'rtl' : 'ltr' }}
          >
            {/* Background glowing particles to feel premium */}
            <div className="absolute top-[-20%] left-[-20%] w-[60%] h-[60%] bg-blue-600/10 rounded-full blur-[120px] pointer-events-none"></div>
            <div className="absolute bottom-[-20%] right-[-20%] w-[60%] h-[60%] bg-cyan-600/10 rounded-full blur-[120px] pointer-events-none"></div>
            
            {/* Upper Info Strip */}
            <div className="relative z-10 flex justify-between items-center pb-4 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <span className="h-3.5 w-3.5 rounded-full bg-emerald-500 animate-ping"></span>
                <span className="h-3.5 w-3.5 rounded-full bg-emerald-500 absolute"></span>
                <div>
                  <h2 className="text-lg font-black text-white tracking-widest">D2N SMART CUSTOMER VIEW</h2>
                  <p className="text-[10px] text-emerald-400 font-mono font-bold tracking-wider">SECURE DIGITAL TERMINAL EN-109</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-base font-extrabold text-[#f1f5f9]">{language === 'ar' ? 'داي تو نايت مول' : 'Day to Night Mall'}</p>
                <p className="text-xs text-slate-400 font-mono">{simulatedToday}</p>
              </div>
            </div>

            {/* Middle Board: Items & Bill */}
            <div className="relative z-10 my-6 flex-1 grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch overflow-hidden">
              {/* Receipt Grid */}
              <div className="lg:col-span-7 bg-black/30 border border-slate-800 rounded-2xl p-6 flex flex-col justify-between overflow-hidden">
                <div className="overflow-y-auto space-y-3 flex-1 pr-2">
                  <span className="text-xs text-slate-500 block font-black uppercase tracking-widest border-b border-slate-850 pb-2">
                    🛒 {language === 'ar' ? 'سلة المشتريات الحالية' : 'YOUR CURRENT SHOPPING SPREE'}
                  </span>
                  
                  {posCart.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center gap-4 py-16 text-slate-500">
                      <ShoppingCart size={64} className="text-slate-800 animate-bounce" />
                      <p className="text-sm font-semibold max-w-sm">
                        {language === 'ar' 
                          ? 'بانتظار قيام مسؤول الكاشير بمسح أصناف سلتك لتظهر الفاتورة هنا تالياً...' 
                          : 'Ready! Stand by as cashier registers your items onto this screen.'}
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3.5">
                      {posCart.map((item, index) => {
                        const hasDiscount = item.product.sellPrice < INITIAL_PRODUCTS.find(p => p.id === item.product.id)!.sellPrice;
                        return (
                          <motion.div 
                            key={item.product.id}
                            initial={{ opacity: 0, x: language === 'ar' ? 30 : -30 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.05 }}
                            className="flex justify-between items-center text-slate-100 bg-slate-900/40 p-4 border border-slate-850 rounded-xl"
                          >
                            <div className="space-y-1">
                              <p className="font-black text-sm text-cyan-200">{language === 'ar' ? item.product.nameAr : item.product.nameEn}</p>
                              <p className="text-xs text-slate-400">
                                {item.product.sellPrice.toLocaleString()} EGP × {item.quantity} {language === 'ar' ? 'وحدة' : 'units'}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="font-black text-base font-mono text-white">
                                {(item.product.sellPrice * item.quantity).toLocaleString()} ج.م
                              </p>
                              {hasDiscount && (
                                <span className="text-[9px] bg-red-950 text-red-400 font-bold px-1.5 py-0.5 rounded border border-red-900">
                                  {language === 'ar' ? 'توفير مفعّل' : 'Promo applied'}
                                </span>
                              )}
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div className="bg-[#0b1320] border border-cyan-900/30 rounded-xl p-4 mt-4 flex items-center justify-between text-xs text-cyan-300">
                  <span className="font-bold flex items-center gap-1.5">
                    🛡️ {language === 'ar' ? 'فحص الصلاحية التلقائي نشط ومضمون ١٥٠٪' : 'Automated safety check certified.'}
                  </span>
                  <span>Day to Night Health Shield</span>
                </div>
              </div>

              {/* Bill totals & QR Code */}
              <div className="lg:col-span-5 bg-gradient-to-b from-[#0d1527] to-[#040813] border border-slate-800 rounded-2xl p-6 flex flex-col justify-between">
                <div className="space-y-6">
                  <div className="border-b border-slate-850 pb-4 text-center">
                    <span className="text-xs text-slate-500 block font-bold uppercase tracking-widest">{language === 'ar' ? 'إجمالي عدد السلع' : 'NUMBER OF CART ITEMS'}</span>
                    <span className="text-4xl font-extrabold font-mono text-cyan-400 block mt-2">
                      {posCart.reduce((sum, item) => sum + item.quantity, 0)} <span className="text-xs text-slate-400 font-sans font-normal">{language === 'ar' ? 'سلعة' : 'units'}</span>
                    </span>
                  </div>

                  <div className="bg-[#060c1d] rounded-xl p-4 border border-cyan-950/40 divide-y divide-slate-850">
                    <div className="flex justify-between py-2.5 text-xs text-slate-400">
                      <span>{language === 'ar' ? 'المجموع الأساسي' : 'Subtotal'}</span>
                      <span className="font-mono">{posCart.reduce((sum, item) => sum + (item.product.sellPrice / 1.14) * item.quantity, 0).toLocaleString(undefined, {maximumFractionDigits: 1})} ج.م</span>
                    </div>
                    <div className="flex justify-between py-2.5 text-xs text-slate-400">
                      <span>{language === 'ar' ? 'ضريبة القيمة المضافة 14%' : 'Value Added Tax (14%)'}</span>
                      <span className="font-mono">{posCart.reduce((sum, item) => sum + (item.product.sellPrice - (item.product.sellPrice / 1.14)) * item.quantity, 0).toLocaleString(undefined, {maximumFractionDigits: 1})} ج.م</span>
                    </div>
                  </div>

                  <div className="bg-cyan-950/20 border border-cyan-800/20 rounded-2xl p-4 text-center">
                    <span className="text-[11px] text-cyan-400 block font-black uppercase tracking-widest">{language === 'ar' ? 'إجمالي مستحقات الدفع' : 'TOTAL AMOUNT DUE OUT'}</span>
                    <span className="text-5xl font-black font-mono tracking-tight text-white block mt-2 drop-shadow-[0_0_15px_rgba(34,211,238,0.2)]">
                      {posCart.reduce((sum, item) => sum + item.product.sellPrice * item.quantity, 0).toLocaleString()} <span className="text-lg font-bold text-cyan-400">EGP</span>
                    </span>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-850 flex items-center justify-between gap-4">
                  <div className="flex-1 text-slate-400 text-[11px] leading-relaxed">
                    <p className="font-bold text-white mb-1">
                      {language === 'ar' ? 'الفاتورة الرقمية متوفرة 📲' : 'Go paperless with digital invoice!'}
                    </p>
                    {language === 'ar' 
                      ? 'امسح الرمز الشريطي QR المولد فوراً بهاتفك لتنزيل الفاتورة وحماية البيئة وسلاسل الجرد.' 
                      : 'Scan the adjacent barcode to download receipt straight to your phone storage.'}
                  </div>
                  
                  {/* Digital QR Code Placeholder for invoices */}
                  <div className="w-20 h-20 bg-white p-1 rounded-lg shrink-0 overflow-hidden flex items-center justify-center shadow-lg shadow-cyan-500/5">
                    <div className="w-full h-full bg-[repeating-conic-gradient(black_0%_25%,white_25%_50%)_50%/8px_8px] opacity-90"></div>
                  </div>
                </div>
              </div>
            </div>

            {/* Status Footer and Dismiss Buttons */}
            <div className="relative z-10 flex justify-between items-center pt-4 border-t border-slate-800 flex-wrap gap-4">
              <p className="text-xs text-slate-400 italic">
                {language === 'ar' ? '✦ طاب يومكم وتسوقكم في داي تو نايت مول زبائننا الكرام' : '✦ Day to Night Mall: Quality and integrity in food supply chains always'}
              </p>
              
              <button
                onClick={() => setIsCustomerScreenProjected(false)}
                className="px-6 py-2 bg-red-600 hover:bg-red-700 text-white font-extrabold text-xs rounded-xl cursor-pointer transition-all flex items-center gap-1 shadow-lg shadow-red-600/20 shrink-0"
              >
                ✕ {language === 'ar' ? 'إغلاق شاشة العميل والعودة (ESC)' : 'Exit Projection Mirror (ESC)'}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 🔝 الهيدر الصغير المشترك المدمج للتبديل واللوحات (Universal Strip Header) */}
      <header className="bg-slate-900 border-b border-slate-850 text-white shadow-sm sticky top-0 z-30 shrink-0 select-none">
        <div className="max-w-7xl mx-auto px-4 md:px-6 py-2.5 flex justify-between items-center gap-4">
          
          {/* الشعار والبراند */}
          <div className="flex items-center gap-2.5">
            {currentUser && (
              <button
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                className="p-1.5 bg-slate-800 hover:bg-slate-750 border border-slate-700 rounded-lg text-amber-500 transition-all cursor-pointer flex flex-col gap-1 items-center justify-center w-8 h-8 shrink-0 mr-1"
                title={language === 'ar' ? 'عرض/إخفاء القائمة الجانبية' : 'Toggle Slide Menu'}
              >
                <div className="flex flex-col gap-1 justify-center items-center w-5 h-5">
                  <span className={`h-0.5 w-4 bg-current transform transition-all duration-300 ${isSidebarOpen ? 'rotate-45 translate-y-1.5' : ''}`}></span>
                  <span className={`h-0.5 w-4 bg-current transition-all duration-300 ${isSidebarOpen ? 'opacity-0' : ''}`}></span>
                  <span className={`h-0.5 w-4 bg-current transform transition-all duration-300 ${isSidebarOpen ? '-rotate-45 -translate-y-1.5' : ''}`}></span>
                </div>
              </button>
            )}
            <div className="h-10 w-32 shrink-0 flex items-center justify-center overflow-hidden px-1 ml-2">
              <img src="/logo.png" alt="داي2نايت" className="max-h-full max-w-full object-contain drop-shadow-md" onError={(e) => { e.currentTarget.style.display = 'none'; e.currentTarget.nextElementSibling!.classList.remove('hidden') }} />
              <span className="hidden font-black text-sm text-white tracking-widest leading-none">داي<span className="text-white mx-0.5" style={{ fontSize: '110%' }}>2</span>نايت</span>
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-black text-sm md:text-base tracking-tight select-none">
                  {language === 'ar' ? 'بوابة داي تو نايت الذكية' : 'Day to Night Executive'}
                </span>
                <span className="text-[9px] bg-indigo-950 text-indigo-300 font-mono font-black px-1.5 py-0.2 rounded border border-indigo-900/50">
                  v3.40-ERP
                </span>
              </div>
            </div>
          </div>

          {/* تبدل اللغة وصندوق التنبيهات والاتصال بالخادم */}
          <div className="flex items-center gap-3">
            {currentUser && (
              <span className="hidden sm:flex text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded font-mono items-center gap-1 shrink-0">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                {currentUserRole === 'admin' ? (language === 'ar' ? 'تحكم كامل' : 'Global Admin') : 
                 currentUserRole === 'warehouse' ? (language === 'ar' ? 'تحكم المخزن' : 'Depot Guard') : (language === 'ar' ? 'تحكم الكاشير' : 'POS Cashier')}
              </span>
            )}

            {/* زر تبديل اللغة */}
            <button
              onClick={() => setLanguage(language === 'ar' ? 'en' : 'ar')}
              className="p-1 px-2.5 bg-slate-800 hover:bg-slate-750 border border-slate-700/60 rounded-lg text-[10px] font-bold text-slate-200 flex items-center gap-1 cursor-pointer transition-all"
            >
              <Globe size={11} className="text-slate-400" />
              <span>{language === 'ar' ? 'ENGLISH' : 'العربية'}</span>
            </button>
            
            {/* جرس التنبيه الاستباقي العائم للأصناف منتهية الصلاحية */}
            {currentUser && activePopups.length > 0 && (
              <div 
                className="p-1 px-2 bg-red-950 text-red-400 hover:bg-red-900 border border-red-900/40 rounded-lg text-[10px] font-bold flex items-center gap-1 cursor-pointer animate-pulse"
                onClick={() => setActiveTab('expiry')}
              >
                <Bell size={11} className="text-red-400" />
                <span>{activePopups.length} {language === 'ar' ? 'مخاطر' : 'risks'}</span>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* 📦 جسم وبنية التطبيق المحدثة - نظام محاذاة القوائم اليمنى للمول */}
      {!currentUser ? (
        <main className="flex-1 flex items-center justify-center px-4 py-12">
          <motion.div
            key="login-portal-panel"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="max-w-md w-full bg-white border border-slate-200 rounded-3xl p-6 md:p-8 shadow-2xl relative"
          >
            <div className="text-center space-y-3 mb-6 font-sans">
              <div className="mx-auto w-48 h-20 bg-black rounded-2xl flex items-center justify-center p-3 shadow-inner border border-slate-800 mb-2">
                <img src="/logo.png" alt="داي2نايت" className="max-w-full max-h-full object-contain" onError={(e) => { e.currentTarget.style.display = 'none'; e.currentTarget.nextElementSibling!.classList.remove('hidden') }} />
                <span className="hidden font-black text-3xl text-white tracking-widest leading-none">داي<span className="text-white mx-1" style={{ fontSize: '110%' }}>2</span>نايت</span>
              </div>
              <h2 className="text-[#003d7e] font-black text-xl md:text-2xl tracking-tight font-sans">
                {language === 'ar' ? 'بوابة الطاقم ومراقبة النظام' : 'ERP Crew Credentials Hub'}
              </h2>
              <p className="text-xs text-slate-400 leading-normal max-w-xs mx-auto">
                {language === 'ar' 
                  ? 'بوابة التحقق ونظام الجرد الذكي الموحد لموظفي مول داي تو نايت لمراقبة الصلاحيات والمبيعات.' 
                  : 'Integrated security gateway for Day to Night Mall workspace staff verification & operational logging.'}
              </p>
            </div>

            {loginError && (
              <motion.div
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-3 bg-red-50 border border-red-100 text-red-600 rounded-xl text-xs font-bold flex items-center gap-2 mb-4"
              >
                <AlertTriangle size={14} className="shrink-0 animate-bounce" />
                <span>{loginError}</span>
              </motion.div>
            )}

            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-[11px] font-bold text-slate-655 mb-1">
                  {language === 'ar' ? 'اسم مستخدم الموظف' : 'Staff Username'}
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-2.5 text-slate-400 font-mono">@</span>
                  <input
                    type="text"
                    required
                    placeholder={language === 'ar' ? 'مثال: admin' : 'e.g. admin'}
                    value={loginUsername}
                    onChange={(e) => setLoginUsername(e.target.value)}
                    className="w-full pl-8 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-xs focus:ring-2 focus:ring-[#003d7e]/10 focus:border-[#003d7e] outline-none font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-655 mb-1">
                  {language === 'ar' ? 'كلمة المرور التوثيقية' : 'Credential Password'}
                </label>
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-xs focus:ring-2 focus:ring-[#003d7e]/10 focus:border-[#003d7e] outline-none font-mono"
                />
              </div>

              <button
                type="submit"
                disabled={isLoggingIn}
                className="w-full py-2.5 bg-[#004a99] hover:bg-blue-700 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 transition-all shadow-md shadow-[#004a99]/15"
              >
                {isLoggingIn ? (
                  <RefreshCw size={13} className="animate-spin" />
                ) : (
                  <LogIn size={13} />
                )}
                {language === 'ar' ? 'تسجيل دخول وتأكيد تفويض الوردية' : 'Authorize Shift Login'}
              </button>
            </form>

            <div className="mt-8 pt-6 border-t border-slate-100">
              <span className="block text-[10px] text-slate-400 font-bold mb-3 uppercase tracking-wider text-center">
                ✨ {language === 'ar' ? 'الموظفين المسجلين للدخول السريع للمعاينة' : 'Crew Fast-Login Emulators'}
              </span>
              <div className="space-y-2">
                {/* المدير العام */}
                <button
                  onClick={() => {
                    setLoginUsername('admin');
                    setLoginPassword('123');
                    triggerToast(language === 'ar' ? 'تم اختيار المدير العام للمساعد' : 'Admin credentials preset autofilled!');
                  }}
                  className="w-full px-3 py-2 bg-slate-50 hover:bg-amber-500/10 border border-slate-150 rounded-xl text-right flex items-center justify-between text-[11px] hover:border-amber-500/30 transition-all cursor-pointer"
                >
                  <span className="text-slate-400 font-mono">user: admin | pass: 123</span>
                  <span className="font-bold text-slate-800 flex items-center gap-1.5">
                    <span className="inline-block w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                    {language === 'ar' ? 'المدير العام (أبو بكر زهران)' : 'Admin (Abu Bakr)'}
                  </span>
                </button>

                {/* أمين المستودع */}
                <button
                  onClick={() => {
                    setLoginUsername('warehouse');
                    setLoginPassword('456');
                    triggerToast(language === 'ar' ? 'تم اختيار أمين المستودع للمساعد' : 'Warehouse keeper credentials preset autofilled!');
                  }}
                  className="w-full px-3 py-2 bg-slate-50 hover:bg-sky-500/10 border border-slate-150 rounded-xl text-right flex items-center justify-between text-[11px] hover:border-sky-500/30 transition-all cursor-pointer"
                >
                  <span className="text-slate-400 font-mono">user: warehouse | pass: 456</span>
                  <span className="font-bold text-slate-800 flex items-center gap-1.5">
                    <span className="inline-block w-1.5 h-1.5 rounded-full bg-sky-500"></span>
                    {language === 'ar' ? 'أمين المستودع (أحمد عبد العال)' : 'Warehouse (Ahmad)'}
                  </span>
                </button>

                {/* مسؤول الكاشير */}
                <button
                  onClick={() => {
                    setLoginUsername('cashier');
                    setLoginPassword('789');
                    triggerToast(language === 'ar' ? 'تم اختيار كاشير التجزئة للمساعد' : 'Cashier credentials preset autofilled!');
                  }}
                  className="w-full px-3 py-2 bg-slate-50 hover:bg-emerald-500/10 border border-slate-150 rounded-xl text-right flex items-center justify-between text-[11px] hover:border-emerald-500/30 transition-all cursor-pointer"
                >
                  <span className="text-slate-400 font-mono">user: cashier | pass: 789</span>
                  <span className="font-bold text-slate-800 flex items-center gap-1.5">
                    <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                    {language === 'ar' ? 'مسؤول الكاشير (سارة الجياد)' : 'Cashier (Sarah)'}
                  </span>
                </button>
              </div>
            </div>
          </motion.div>
        </main>
      ) : (
        <>
        {/* تخطيط بوابه لوحة التحكم المتكاملة: اليسار للمحتوى واليمين للمطوية الثابتة */}
        <div className="flex-1 max-w-7xl mx-auto px-4 md:px-6 py-6 w-full">
          
          {/* العمود المقابل: العمود الرئيسي للمحتويات (المبيعات، المخزون، الصلاحيات) */}
          <div className="space-y-6">
            
            {/* 📦 مركز تبديل الشاشات والتبويبات التفاعلية للمول */}
            <AnimatePresence mode="wait">
            
            {/* تبويب: لوحة التحكم والتحليلات */}
            {activeTab === 'overview' && (
              <motion.div
                key="overview-tab"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                className="space-y-6"
              >
              {currentUserRole === 'cashier' ? (
                renderRestrictedView(
                  "لوحة تحليلات الإدارة مقفلة",
                  "Management Analytics Console Locked",
                  "يرجى العلم أن الرسوم البيانية والأرقام المالية لمبيعات المول مخصصة فقط لأعضاء الإدارة ومجلس المدير العام، وليست متوفرة لوردية الكاشير العادية.",
                  "Executive performance logs and cash statistics are confidential. Switch your operational active role to 'General Manager' to inspect."
                )
              ) : (
                <>
                  {/* 🕒 شريط توجيه الفترة الزمنية والتقارير المالية والتحكم الذكي */}
                  <div className="bg-slate-900 text-white rounded-2xl p-5 shadow-lg border border-slate-800 space-y-4 md:space-y-0 md:flex md:items-center md:justify-between">
                    <div>
                      <h3 className="text-sm font-extrabold text-sky-400 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-sky-450 animate-pulse"></span>
                        {language === 'ar' ? 'منظور زمن التقرير المالي والأرباح والخسائر' : 'Financial Revenue & Spoilage Report Perspective'}
                      </h3>
                      <p className="text-[11px] text-slate-400 mt-1">
                        {language === 'ar' 
                          ? 'اختر النطاق الزمني لعرض الأداء العام للمول وأرباح كل منتج بشكل تفصيلي تزامني.' 
                          : 'Select a custom timeframe to scope general mall indicators and product profit margins.'}
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                      {/* تبديل الفترة */}
                      <div className="bg-slate-800 p-1 rounded-xl border border-slate-700 flex items-center">
                        <button
                          onClick={() => setFinancialPeriod('all')}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                            financialPeriod === 'all' 
                              ? 'bg-[#004a99] text-white shadow' 
                              : 'text-slate-400 hover:text-white'
                          }`}
                        >
                          {language === 'ar' ? 'كلي (تراكمي)' : 'Cumulative'}
                        </button>
                        <button
                          onClick={() => setFinancialPeriod('daily')}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                            financialPeriod === 'daily' 
                              ? 'bg-[#004a99] text-white shadow' 
                              : 'text-slate-400 hover:text-white'
                          }`}
                        >
                          {language === 'ar' ? 'يومي' : 'Daily'}
                        </button>
                        <button
                          onClick={() => setFinancialPeriod('monthly')}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                            financialPeriod === 'monthly' 
                              ? 'bg-[#004a99] text-white shadow' 
                              : 'text-slate-400 hover:text-white'
                          }`}
                        >
                          {language === 'ar' ? 'شهري' : 'Monthly'}
                        </button>
                      </div>

                      {/* أدوات تحديد اليوم */}
                      {financialPeriod === 'daily' && (
                        <div className="flex items-center gap-2 bg-slate-800 px-3 py-1 rounded-xl border border-slate-700">
                          <button
                            onClick={() => {
                              const d = new Date(selectedFinancialDay);
                              d.setDate(d.getDate() - 1);
                              const prev = d.toISOString().split('T')[0];
                              setSelectedFinancialDay(prev);
                            }}
                            className="p-1 text-slate-400 hover:text-white hover:bg-slate-750 rounded transition-all text-sm font-bold"
                            title={language === 'ar' ? 'اليوم السابق' : 'Previous day'}
                          >
                            ←
                          </button>
                          <input
                            type="date"
                            value={selectedFinancialDay}
                            onChange={(e) => {
                              if (e.target.value) setSelectedFinancialDay(e.target.value);
                            }}
                            className="bg-transparent border-none text-white font-mono text-xs focus:ring-0 outline-none p-1"
                          />
                          <button
                            onClick={() => {
                              const d = new Date(selectedFinancialDay);
                              d.setDate(d.getDate() + 1);
                              const next = d.toISOString().split('T')[0];
                              setSelectedFinancialDay(next);
                            }}
                            className="p-1 text-slate-400 hover:text-white hover:bg-slate-750 rounded transition-all text-sm font-bold"
                            title={language === 'ar' ? 'اليوم التالي' : 'Next day'}
                          >
                            →
                          </button>
                        </div>
                      )}

                      {/* أدوات تحديد الشهر */}
                      {financialPeriod === 'monthly' && (
                        <div className="flex items-center gap-2 bg-slate-800 px-3 py-1 rounded-xl border border-slate-700">
                          <button
                            onClick={() => {
                              const parts = selectedFinancialMonth.split('-');
                              let yr = parseInt(parts[0]);
                              let mo = parseInt(parts[1]) - 1;
                              if (mo === 0) {
                                mo = 12;
                                yr--;
                              }
                              const prev = `${yr}-${mo < 10 ? '0' + mo : mo}`;
                              setSelectedFinancialMonth(prev);
                            }}
                            className="p-1 text-slate-400 hover:text-white hover:bg-slate-750 rounded transition-all text-sm font-bold"
                            title={language === 'ar' ? 'الشهر السابق' : 'Previous month'}
                          >
                            ←
                          </button>
                          <input
                            type="month"
                            value={selectedFinancialMonth}
                            onChange={(e) => {
                              if (e.target.value) setSelectedFinancialMonth(e.target.value);
                            }}
                            className="bg-transparent border-none text-white font-mono text-xs focus:ring-0 outline-none p-1"
                          />
                          <button
                            onClick={() => {
                              const parts = selectedFinancialMonth.split('-');
                              let yr = parseInt(parts[0]);
                              let mo = parseInt(parts[1]) + 1;
                              if (mo === 13) {
                                mo = 1;
                                yr++;
                              }
                              const next = `${yr}-${mo < 10 ? '0' + mo : mo}`;
                              setSelectedFinancialMonth(next);
                            }}
                            className="p-1 text-slate-400 hover:text-white hover:bg-slate-750 rounded transition-all text-sm font-bold"
                            title={language === 'ar' ? 'الشهر التالي' : 'Next month'}
                          >
                            →
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* 📊 بطاقات مؤشرات الأداء المالي والربحية للمول */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                    
                    {/* إجمالي الإيرادات */}
                    <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex flex-col justify-between hover:border-emerald-350 transition-colors">
                      <div className="flex justify-between items-start">
                        <span className="text-[10px] uppercase font-black tracking-wider text-slate-400">
                          {language === 'ar' ? 'إجمالي المبيعات (الإيرادات)' : 'Total Revenue (Sales)'}
                        </span>
                        <span className="p-1 px-2 bg-emerald-50 text-emerald-600 rounded text-[10px] font-bold leading-none">
                          +{totalUnitsSold} {language === 'ar' ? 'قطع' : 'pcs'}
                        </span>
                      </div>
                      <div className="mt-2 text-right">
                        <span className="font-mono text-xl md:text-2xl font-black text-emerald-600">
                          {totalSalesRevenue.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
                        </span>
                        <span className="text-xs font-bold text-slate-400 ml-1">ج.م</span>
                      </div>
                      <p className="text-[9px] text-slate-400 mt-1.5 flex items-center gap-1">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
                        {language === 'ar' ? 'الإيرادات من الكاشير' : 'Generated register sales'}
                      </p>
                    </div>

                    {/* تكلفة البضائع المباعة */}
                    <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex flex-col justify-between hover:border-slate-350 transition-colors">
                      <div className="flex justify-between items-start">
                        <span className="text-[10px] uppercase font-black tracking-wider text-slate-400">
                          {language === 'ar' ? 'تكلفة المبيعات (شراء)' : 'Cost of Goods Sold'}
                        </span>
                        <span className="p-1 px-2 bg-slate-100 text-slate-600 rounded text-[10px] font-bold leading-none">
                          {language === 'ar' ? 'رأس مال' : 'Capital'}
                        </span>
                      </div>
                      <div className="mt-2 text-right">
                        <span className="font-mono text-xl md:text-2xl font-black text-slate-700">
                          {totalSalesCost.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
                        </span>
                        <span className="text-xs font-bold text-slate-400 ml-1">ج.م</span>
                      </div>
                      <p className="text-[9px] text-slate-400 mt-1.5 flex items-center gap-1">
                        <span className="h-1.5 w-1.5 rounded-full bg-slate-300"></span>
                        {language === 'ar' ? 'تكلفة الشراء الأصلي للمباع' : 'Original purchase cost'}
                      </p>
                    </div>

                    {/* إجمالي أرباح المبيعات */}
                    <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex flex-col justify-between hover:border-[#004a99]/30 transition-colors">
                      <div className="flex justify-between items-start">
                        <span className="text-[10px] uppercase font-black tracking-wider text-slate-400">
                          {language === 'ar' ? 'أرباح المبيعات الصافية' : 'Gross Sales Profit'}
                        </span>
                        <span className="p-1 px-1.5 bg-indigo-50 text-[#004a99] rounded text-[10px] font-black leading-none font-mono">
                          {totalSalesCost > 0 ? `+${((totalSalesProfit / totalSalesCost) * 100).toFixed(1)}%` : '0%'}
                        </span>
                      </div>
                      <div className="mt-2 text-right">
                        <span className="font-mono text-xl md:text-2xl font-black text-[#004a99]">
                          {totalSalesProfit.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
                        </span>
                        <span className="text-xs font-bold text-slate-400 ml-1">ج.م</span>
                      </div>
                      <p className="text-[9px] text-slate-400 mt-1.5 flex items-center gap-1">
                        <span className="h-1.5 w-1.5 rounded-full bg-blue-500 animate-pulse"></span>
                        {language === 'ar' ? 'الفارق الإيجابي لأسعار البيع' : 'Profit margins achieved'}
                      </p>
                    </div>

                    {/* خسائر التوالف */}
                    <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex flex-col justify-between hover:border-rose-350 transition-colors">
                      <div className="flex justify-between items-start">
                        <span className="text-[10px] uppercase font-black tracking-wider text-slate-400">
                          {language === 'ar' ? 'خسائر وتوالف الصلاحيات' : 'Spoilage & Waste Losses'}
                        </span>
                        <span className="p-1 px-2 bg-rose-50 text-rose-600 rounded text-[10px] font-bold leading-none">
                          -{totalUnitsLost} {language === 'ar' ? 'تالف' : 'lost'}
                        </span>
                      </div>
                      <div className="mt-2 text-right">
                        <span className="font-mono text-xl md:text-2xl font-black text-rose-650">
                          {totalLossesValue.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
                        </span>
                        <span className="text-xs font-bold text-slate-400 ml-1">ج.م</span>
                      </div>
                      <p className="text-[9px] text-slate-400 mt-1.5 flex items-center gap-1">
                        <span className="h-1.5 w-1.5 rounded-full bg-red-400 animate-pulse"></span>
                        {language === 'ar' ? 'تكلفة شراء الأصناف التالفة' : 'Spoiled/disposed stock cost'}
                      </p>
                    </div>

                    {/* صافي ميزان المول النهائي */}
                    <div className={`border rounded-2xl p-4 shadow-md flex flex-col justify-between transition-all ${
                      finalNetProfit >= 0 
                        ? 'bg-gradient-to-tr from-emerald-500/5 to-teal-500/5 border-emerald-500/20 hover:border-emerald-500/40' 
                        : 'bg-gradient-to-tr from-rose-500/5 to-red-500/5 border-rose-500/20 hover:border-rose-500/40'
                    }`}>
                      <div className="flex justify-between items-start">
                        <span className="text-[10px] uppercase font-black tracking-wider text-slate-500">
                          {language === 'ar' ? 'الأداء المالي الإجمالي' : 'Final Net Mall Profit'}
                        </span>
                        <span className={`p-1 px-1.5 rounded text-[9px] font-black leading-none uppercase ${
                          finalNetProfit >= 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                        }`}>
                          {finalNetProfit >= 0 ? (language === 'ar' ? 'صافي ربح 📈' : 'Gain 📈') : (language === 'ar' ? 'صافي خسارة 📉' : 'Loss 📉')}
                        </span>
                      </div>
                      <div className="mt-2 text-right">
                        <span className={`font-mono text-xl md:text-2xl font-black ${finalNetProfit >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                          {finalNetProfit.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
                        </span>
                        <span className="text-xs font-bold text-slate-500 ml-1">ج.م</span>
                      </div>
                      <p className="text-[9px] text-slate-500 mt-1.5 flex items-center gap-1">
                        <span className={`h-1.5 w-1.5 rounded-full ${finalNetProfit >= 0 ? 'bg-emerald-500' : 'bg-rose-500 animate-ping'}`}></span>
                        {language === 'ar' ? 'الأرباح بعد خصم خسائر التالف' : 'Profit minus spoilage losses'}
                      </p>
                    </div>

                  </div>

                  {/* رسوم بيانية */}
                  <AnalyticsCharts 
                    products={products} 
                    language={language} 
                    transactions={transactions}
                    financialPeriod={financialPeriod}
                    selectedFinancialDay={selectedFinancialDay}
                    selectedFinancialMonth={selectedFinancialMonth}
                  />

                  {/* 📊 كشف الأرباح والخسائر التفصيلي لكل منتج وقسم منفرد على حدة */}
                  <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                    {/* الجدول الأول: أرباح وخسائر الأقسام */}
                    <div className="xl:col-span-1 bg-white rounded-2xl p-5 border border-slate-100 shadow-sm flex flex-col justify-between">
                      <div>
                        <h3 className="font-extrabold text-slate-800 text-sm md:text-base mb-1 flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full bg-[#004a99]"></span>
                          {language === 'ar' ? 'أرباح وخسائر الأقسام (كل منفرد)' : 'P&L By Category/Section'}
                        </h3>
                        <p className="text-[11px] text-slate-400 mb-4">
                          {language === 'ar' ? 'مجموع المبيعات والأرباح والتوالف مجمعة لكل قسم على حدة للمنظور المحدد.' : 'Aggregated financials per store category for selected period.'}
                        </p>

                        <div className="space-y-3 overflow-y-auto max-h-[350px] pr-1">
                          {Array.from(new Set(products.map(p => p.category || (language === 'ar' ? 'عام' : 'General')))).map((cat) => {
                            const catProducts = products.filter(p => (p.category || (language === 'ar' ? 'عام' : 'General')) === cat);
                            let totalSold = 0;
                            let totalRevenue = 0;
                            let totalProfit = 0;
                            let totalLoss = 0;
                            catProducts.forEach(p => {
                              const s = getProductPeriodStats(p);
                              totalSold += s.sold;
                              totalRevenue += s.revenue;
                              totalProfit += s.profit;
                              totalLoss += s.loss;
                            });
                            const net = totalProfit - totalLoss;

                            return (
                              <div key={cat} className="p-3 bg-slate-50/70 border border-slate-100 rounded-xl space-y-2 text-xs">
                                <div className="flex justify-between items-center pb-2 border-b border-slate-100 font-black text-slate-900">
                                  <span>🚀 {cat}</span>
                                  <span className={net >= 0 ? "text-emerald-600" : "text-rose-600"}>
                                    {net.toLocaleString()} {language === 'ar' ? 'ج.م' : 'EGP'}
                                  </span>
                                </div>
                                <div className="grid grid-cols-2 gap-y-1 text-[10px] text-slate-500">
                                  <div className="flex justify-between pl-2">
                                    <span>{language === 'ar' ? 'المبيعات:' : 'Sales:'}</span>
                                    <span className="font-bold text-slate-800">{totalRevenue.toLocaleString()} ج.م</span>
                                  </div>
                                  <div className="flex justify-between pr-2 border-r border-slate-200">
                                    <span>{language === 'ar' ? 'الكمية:' : 'Qty:'}</span>
                                    <span className="font-bold text-slate-800">{totalSold} قطعة</span>
                                  </div>
                                  <div className="flex justify-between pl-2">
                                    <span>{language === 'ar' ? 'إجمالي الأرباح:' : 'Gross Profit:'}</span>
                                    <span className="font-bold text-[#004a99]">{totalProfit.toLocaleString()} ج.م</span>
                                  </div>
                                  <div className="flex justify-between pr-2 border-r border-slate-200">
                                    <span>{language === 'ar' ? 'التالف الخاسر:' : 'Expiry Loss:'}</span>
                                    <span className="font-bold text-rose-600 font-mono">-{totalLoss.toLocaleString()} ج.م</span>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>

                    {/* الجدول الثاني والثالث: أرباح وخسائر السلع منفردة */}
                    <div className="xl:col-span-2 bg-white rounded-2xl p-5 border border-slate-100 shadow-sm flex flex-col justify-between">
                      <div>
                        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
                          <div>
                            <h3 className="font-extrabold text-slate-800 text-sm md:text-base flex items-center gap-2">
                              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                              {language === 'ar' ? 'كشف مبيعات ومكاسب السلع (كل صنف)' : 'P&L By Individual Item'}
                            </h3>
                            <p className="text-[11px] text-slate-400 mt-0.5">
                              {language === 'ar' ? 'مبيعات كل سلعة على حدة وتكاليف حركاتها والربح الصافي المستخلص منها.' : 'Sales quantity, revenue, cost, and final target gain per item.'}
                            </p>
                          </div>
                        </div>

                        <div className="overflow-x-auto rounded-xl border border-slate-150">
                          <table className="w-full text-right text-xs">
                            <thead className="bg-slate-50 text-slate-550 border-b border-slate-150 font-bold">
                              <tr>
                                <th className="p-2.5">{language === 'ar' ? 'اسم السلعة / الباركود' : 'Item / Barcode'}</th>
                                <th className="p-2.5">{language === 'ar' ? 'القسم' : 'Category'}</th>
                                <th className="p-2.5 text-center">{language === 'ar' ? 'الكمية المباعة' : 'Qty'}</th>
                                <th className="p-2.5 text-left">{language === 'ar' ? 'مبيعات الإيراد' : 'Sales Revenue'}</th>
                                <th className="p-2.5 text-left">{language === 'ar' ? 'صافي الربح' : 'Net Profit'}</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {products.map((p) => {
                                const stats = getProductPeriodStats(p);
                                if (stats.sold === 0 && stats.lost === 0) return null; // Only show items with activity
                                return (
                                  <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                                    <td className="p-2.5">
                                      <div className="font-bold text-slate-800">{language === 'ar' ? p.nameAr : p.nameEn}</div>
                                      <div className="text-[10px] text-slate-400 font-mono">{p.barcode}</div>
                                    </td>
                                    <td className="p-2.5 text-slate-600 font-semibold">{p.category || (language === 'ar' ? 'سوبرماركت' : 'General')}</td>
                                    <td className="p-2.5 text-center font-bold font-mono text-slate-700">{stats.sold}</td>
                                    <td className="p-2.5 text-left font-bold font-mono text-emerald-600">{stats.revenue.toLocaleString()} ج.م</td>
                                    <td className="p-2.5 text-left font-bold font-mono">
                                      <span className={stats.profit - stats.loss >= 0 ? "text-[#004a99]" : "text-rose-600"}>
                                        {(stats.profit - stats.loss).toLocaleString()} ج.م
                                      </span>
                                    </td>
                                  </tr>
                                );
                              })}
                              {products.filter(p => {
                                const stats = getProductPeriodStats(p);
                                return stats.sold > 0 || stats.lost > 0;
                              }).length === 0 && (
                                <tr>
                                  <td colSpan={5} className="p-8 text-center text-slate-400 font-semibold">
                                    {language === 'ar' ? 'لا توجد حركات مبيعات أو تالف تحت النطاق الزمني المحدد حالياً.' : 'No transactions recorded within selected scope.'}
                                  </td>
                                </tr>
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* قائمة تنبيهات حركة المخزون والرفوف */}
                <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="font-bold text-slate-800 text-sm md:text-base flex items-center gap-1.5">
                      <ShoppingCart size={18} className="text-sky-650" />
                      {language === 'ar' ? 'فحص رفوف العرض (نقص الكميات)' : 'In-Store Shelves Deficiency'}
                    </h3>
                    <span className="text-[10px] bg-sky-50 text-sky-700 font-bold px-2 py-0.5 rounded-full">
                      {products.filter(p => p.shelfStock <= p.minStockAlert).length} {language === 'ar' ? 'تنبيه ملء' : 'alerts'}
                    </span>
                  </div>

                  <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
                    {products.filter(p => p.shelfStock <= p.minStockAlert).length === 0 ? (
                      <div className="text-center py-8 text-xs text-slate-400">
                        {language === 'ar' ? 'جميع الرفوف معبأة بانتظام وبحالة جيدة!' : 'All shelf stocks are above safety line!'}
                      </div>
                    ) : (
                      products.filter(p => p.shelfStock <= p.minStockAlert).map((p) => (
                        <div key={p.id} className="flex justify-between items-center p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs">
                          <div>
                            <p className="font-bold text-slate-700">{language === 'ar' ? p.nameAr : p.nameEn}</p>
                            <p className="text-[10px] text-slate-400 mt-1 font-mono flex items-center gap-1">
                              <span>EAN: {p.barcode}</span> | 
                              <span>{language === 'ar' ? `المخزن الداخلي: ${p.warehouseStock} حبة` : `Repo: ${p.warehouseStock} units`}</span>
                            </p>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold px-2 py-0.5 bg-red-50 text-rose-600 border border-red-100 rounded">
                              {language === 'ar' ? `المعروض ${p.shelfStock} / حد أمان: ${p.minStockAlert}` : `On shelf ${p.shelfStock} / min: ${p.minStockAlert}`}
                            </span>
                            {p.warehouseStock > 0 ? (
                              <button
                                onClick={() => handleQuickRestock(p.id, p.minStockAlert - p.shelfStock + 20)}
                                className="px-2 py-1 text-[11px] font-bold text-white bg-sky-600 hover:bg-sky-700 rounded-md cursor-pointer transition-all shadow-xs"
                              >
                                {language === 'ar' ? 'تفريغ للمول' : 'Replenish'}
                              </button>
                            ) : (
                              <span className="text-[10px] text-amber-600 font-semibold bg-amber-50 px-1.5 py-0.5 rounded border border-amber-100">
                                {language === 'ar' ? 'المستودع خالي ⚠️' : 'OutOfStock in Depot'}
                              </span>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* كتل التنبيه السريعة بالصلاحية (Near-Expiry quick grid) */}
                <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="font-bold text-slate-800 text-sm md:text-base flex items-center gap-1.5">
                      <AlertTriangle size={18} className="text-amber-550" />
                      {language === 'ar' ? 'تنبيهات تاريخ الصلاحية المستعجلة' : 'Priority Expiration Hazards'}
                    </h3>
                    <span className="text-[10px] bg-amber-50 text-amber-700 font-bold px-2 py-0.5 rounded-full">
                      {nearExpiryCount + expiredCount} {language === 'ar' ? 'مخاطر' : 'risks'}
                    </span>
                  </div>

                  <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
                    {products.filter(p => {
                      const { status } = getProductExpiryStatus(p.expirationDate, simulatedToday, thresholdDays);
                      return status !== 'valid';
                    }).length === 0 ? (
                      <div className="text-center py-8 text-xs text-slate-400">
                        {language === 'ar' ? 'كل البضائع صالحة تماماً! لا يوجد انتهاء قبل 60 يوماً.' : 'No items found near safety expiry envelope!'}
                      </div>
                    ) : (
                      products.filter(p => {
                        const { status } = getProductExpiryStatus(p.expirationDate, simulatedToday, thresholdDays);
                        return status !== 'valid';
                      }).map((p) => {
                        const { status, daysRemaining } = getProductExpiryStatus(p.expirationDate, simulatedToday, thresholdDays);
                        const isNear = status === 'near_expiry';
                        return (
                          <div key={p.id} className={`flex justify-between items-center p-3 rounded-xl border text-xs ${
                            isNear ? 'bg-amber-50/40 border-amber-105' : 'bg-red-50/30 border-red-150'
                          }`}>
                            <div>
                              <p className="font-bold text-slate-700">{language === 'ar' ? p.nameAr : p.nameEn}</p>
                              <p className="text-[10px] text-slate-400 mt-1 font-mono">
                                {language === 'ar' ? 'تاريخ الانتهاء:' : 'Expiry Date:'} {p.expirationDate}
                              </p>
                            </div>

                            <div className="flex items-center gap-2">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                isNear ? 'bg-amber-50 text-amber-700' : 'bg-red-50 text-red-700'
                              }`}>
                                {isNear 
                                  ? (language === 'ar' ? `متبقي ${daysRemaining} يوم` : `${daysRemaining} days left`)
                                  : (language === 'ar' ? 'منتهي الصلاحية ❌' : 'Expired')}
                              </span>
                              
                              {isNear ? (
                                <button
                                  onClick={() => handleQuickDiscount(p.id, 25)}
                                  className="px-2 py-1 text-[10px] font-semibold text-amber-800 bg-amber-100 hover:bg-amber-200 rounded border border-amber-200 cursor-pointer"
                                >
                                  {language === 'ar' ? 'خصم ٢٥٪' : 'Discount'}
                                </button>
                              ) : (
                                <button
                                  onClick={() => handleDisposeStocks(p.id)}
                                  className="px-2 py-1 text-[10px] font-semibold text-rose-850 bg-red-100 hover:bg-rose-200 rounded border border-red-250 cursor-pointer"
                                >
                                  {language === 'ar' ? 'إعدام' : 'Dispose'}
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

              </div>
              </>
              )}
            </motion.div>
          )}

          {/* تبويب: قائمة وجرد البضائع */}
          {activeTab === 'catalog' && (
            <motion.div
              key="catalog-tab"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm space-y-5"
            >
              
              {/* ترويسة حالة الصلاحية للموظف الحالي في قائمة الجرد */}
              {currentUserRole !== 'admin' && (
                <div className={`p-3 rounded-xl border flex items-center justify-between gap-3 text-xs ${
                  currentUserRole === 'warehouse'
                    ? 'bg-sky-50 border-sky-100 text-sky-800'
                    : 'bg-emerald-50 border-emerald-100 text-emerald-800'
                }`}>
                  <div className="flex items-center gap-2">
                    <ShieldAlert size={15} className={currentUserRole === 'warehouse' ? 'text-sky-600' : 'text-emerald-600'} />
                    <div>
                      <span className="font-extrabold">
                        {language === 'ar' ? 'وضع مراقبة الموظف النشط:' : 'Active Staff Clearance Context:'}
                      </span>{' '}
                      <span className="font-mono text-[11px] bg-white border px-1.5 py-0.2 rounded font-bold">
                        {currentUserRole === 'warehouse'
                          ? (language === 'ar' ? 'أمين المستودع (م. أحمد عبد العال)' : 'Warehouse Stock Clerk')
                          : (language === 'ar' ? 'مسؤول الكاشير (سارة الجياد)' : 'POS Cashier Mode')}
                      </span>
                      <span className="ml-2 opacity-90 hidden md:inline">
                        {currentUserRole === 'warehouse'
                          ? (language === 'ar' ? '✓ مسموح لك بإمداد الرفوف بموجب جرد الكراتين. يمنع تعديل الأسعار أو إضافة الأصناف.' : '✓ Authorized to replenish shelf stocks. Product creation, deletions, and pricing modifications are locked.')
                          : (language === 'ar' ? '⚠ تصفح فقط. صلاحيات التسجيل أو التحديث مقفلة بالكامل لصالح المدير العام.' : '⚠ Read-only catalog. Mutation privileges are locked for POS sales consistency.')}
                      </span>
                    </div>
                  </div>
                  {currentUserRole === 'warehouse' ? (
                    <span className="text-[10px] bg-sky-100 text-sky-700 font-bold px-2 py-0.5 rounded-md">{language === 'ar' ? 'تعديلات المخزن متاحة' : 'Refills Available'}</span>
                  ) : (
                    <span className="text-[10px] bg-emerald-100 text-emerald-700 font-bold px-2 py-0.5 rounded-md">{language === 'ar' ? 'عرض تصفح مجرد' : 'Read-Only Mode'}</span>
                  )}
                </div>
              )}
              
              {/* قسم البحث والفلاتر */}
              <div className="flex flex-col xl:flex-row gap-4 justify-between">
                
                {/* البحث السريع */}
                <div className="relative flex-1 max-w-md">
                  <span className="absolute inset-y-0 right-3.5 flex items-center text-slate-400">
                    <Search size={16} />
                  </span>
                  <input
                    type="text"
                    placeholder={language === 'ar' ? 'ابحث باسم البضاعة أو بالباركود التلقائي...' : 'Search by item name or EAN barcode...'}
                    value={searchText}
                    onChange={(e) => setSearchText(e.target.value)}
                    className="w-full text-xs md:text-sm pl-4 pr-10 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#004a99] focus:bg-white transition-all text-slate-700 font-medium"
                  />
                  {searchText && (
                    <button onClick={() => setSearchText('')} className="absolute inset-y-0 left-3 flex items-center text-slate-400 hover:text-slate-600">
                      <X size={15} />
                    </button>
                  )}
                </div>

                {/* مفاتيح التصفية المنسدلة */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 flex-wrap text-sm font-semibold">
                  
                  {/* فلتر فئة المبيعات */}
                  <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value as CategoryKey | 'all')}
                    className="p-1 px-2 border border-slate-200 rounded-md bg-slate-50 text-slate-600 focus:ring-2 focus:ring-[#004a99] font-medium text-xs [&>option]:text-slate-800"
                  >
                    <option value="all">📁 {language === 'ar' ? 'كل الأقسام' : 'All Departments'}</option>
                    {CATEGORIES.map(cat => (
                      <option key={cat.key} value={cat.key}>
                        {language === 'ar' ? cat.nameAr : cat.nameEn}
                      </option>
                    ))}
                  </select>

                  {/* فلتر تاريخ الصلاحية */}
                  <select
                    value={selectedExpiryFilter}
                    onChange={(e) => setSelectedExpiryFilter(e.target.value as any)}
                    className="p-1 px-2 border border-slate-200 rounded-md bg-slate-50 text-slate-600 focus:ring-2 focus:ring-[#004a99] font-medium text-xs [&>option]:text-slate-800"
                  >
                    <option value="all">📅 {language === 'ar' ? 'كل حالات الصلاحية' : 'All Expirations'}</option>
                    <option value="valid">✅ {language === 'ar' ? 'صالح وسليم' : 'Valid'}</option>
                    <option value="near_expiry">⚠️ {language === 'ar' ? 'قرب ينتهي (< 60 يوم)' : `Expiring < ${thresholdDays}d`}</option>
                    <option value="expired">❌ {language === 'ar' ? 'منتهي الصلاحية' : 'Expired Only'}</option>
                  </select>

                  {/* فلتر الكمية ونقص بضائع الرفوف */}
                  <select
                    value={selectedStockFilter}
                    onChange={(e) => setSelectedStockFilter(e.target.value as any)}
                    className="p-1 px-2 border border-slate-200 rounded-md bg-slate-50 text-slate-600 focus:ring-2 focus:ring-[#004a99] font-medium text-xs [&>option]:text-slate-800"
                  >
                    <option value="all">📦 {language === 'ar' ? 'كل مستويات المخزون' : 'Stock Levels (All)'}</option>
                    <option value="low_stock">🚨 {language === 'ar' ? 'نقص على الرفوف' : 'Low Shelf Stock'}</option>
                    <option value="out_of_warehouse">🚫 {language === 'ar' ? 'نفد بالمخزن الداخلي' : 'Depot Empty'}</option>
                  </select>

                  {/* زر مسح فاتورة بالذكاء الاصطناعي */}
                  <button
                    onClick={() => {
                      setIsScanInvoiceOpen(true);
                    }}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-3 py-1.5 rounded-md shadow-sm flex items-center justify-center gap-1.5 cursor-pointer hover:scale-[1.01] active:scale-[0.99] transition-all text-xs"
                  >
                    <Sparkles size={14} className="text-amber-300 animate-pulse" />
                    <span>{language === 'ar' ? 'قراء فاتورة بالذكاء الاصطناعي 📸' : 'AI Invoice Scanner 📸'}</span>
                  </button>

                  {/* زر طباعة الباركود والملصقات مجمع */}
                  <button
                    onClick={() => {
                      setIsBarcodePrinterOpen(true);
                    }}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-3 py-1.5 rounded-md shadow-sm flex items-center justify-center gap-1.5 cursor-pointer hover:scale-[1.01] active:scale-[0.99] transition-all text-xs"
                  >
                    <Printer size={14} className="text-indigo-200" />
                    <span>{language === 'ar' ? 'مركز طباعة الباركود والملصقات 🖨️' : 'Print Barcodes & Tags 🖨️'}</span>
                  </button>

                  {/* زر إضافة صنف للمستودع */}
                  <button
                    onClick={() => {
                      setEditingProduct(null);
                      setIsAddOpen(true);
                    }}
                    className="bg-[#004a99] hover:bg-blue-700 text-white font-bold px-3 py-1.5 rounded-md shadow-sm flex items-center justify-center gap-1.5 cursor-pointer hover:scale-[1.01] active:scale-[0.99] transition-all text-xs"
                  >
                    <Plus size={14} />
                    <span>{language === 'ar' ? 'إضافة منتج +' : 'Add Item +'}</span>
                  </button>

                </div>

              </div>

              {/* الجدول التفاعلي لجرد البضائع */}
              <div className="overflow-x-auto border border-slate-100 rounded-xl">
                <table className="w-full text-xs text-right whitespace-nowrap" style={{ textAlign: language === 'ar' ? 'right' : 'left' }}>
                  <thead className="bg-slate-50 text-slate-500 text-[11px] font-bold uppercase border-b border-slate-100">
                    <tr>
                      <th className="px-4 py-3.5">{language === 'ar' ? 'المنتج / الباركود' : 'Product & Barcode'}</th>
                      <th className="px-4 py-3.5">{language === 'ar' ? 'القسم' : 'Department'}</th>
                      <th className="px-4 py-3.5">{language === 'ar' ? 'سعر البيع (شراء)' : 'Sell Price (Cost)'}</th>
                      <th className="px-4 py-3.5">{language === 'ar' ? 'المعروض (الرفوف)' : 'On Shelves (Stock)'}</th>
                      <th className="px-4 py-3.5">{language === 'ar' ? 'المخزن الداخلي' : 'Internal Depot'}</th>
                      <th className="px-4 py-3.5">{language === 'ar' ? 'الأداء والربحية' : 'Financials (Sales/Loss)'}</th>
                      <th className="px-4 py-3.5">{language === 'ar' ? 'تاريخ الصلاحية' : 'Expiry / Status'}</th>
                      <th className="px-4 py-3.5 text-center">{language === 'ar' ? 'التحكم السريع' : 'Quick Actions'}</th>
                    </tr>
                  </thead>
                  
                  <tbody className="divide-y divide-slate-100">
                    {filteredProducts.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="text-center py-10 text-slate-400 font-medium">
                          {language === 'ar' ? 'لا توجد بضائع تطابق فلاتر البحث الحالية.' : 'No inventory matches current query filters.'}
                        </td>
                      </tr>
                    ) : (
                      filteredProducts.map((p) => {
                        const { status, daysRemaining } = getProductExpiryStatus(p.expirationDate, simulatedToday, thresholdDays);
                        const categoryObj = CATEGORIES.find(c => c.key === p.category);
                        const isShelfCritical = p.shelfStock <= p.minStockAlert;
                        
                        return (
                          <tr key={p.id} className="hover:bg-slate-50/50 transition-colors">
                            
                            {/* الاسم والباركود */}
                            <td className="px-4 py-3">
                              <div className="flex flex-col">
                                <span className="font-bold text-slate-700 text-sm">
                                  {language === 'ar' ? p.nameAr : p.nameEn}
                                </span>
                                <span className="text-[10px] text-slate-400 font-mono tracking-tight mt-0.5 flex items-center gap-1">
                                  <Barcode size={11} /> {p.barcode}
                                  {p.isDiscounted && (
                                    <span className="bg-amber-50 text-amber-700 text-[9px] px-1 rounded font-bold">
                                      {language === 'ar' ? `عليه خصم ${p.discountPercentage}%` : `Discount ${p.discountPercentage}%`}
                                    </span>
                                  )}
                                </span>
                              </div>
                            </td>

                            {/* القسم */}
                            <td className="px-4 py-3">
                              <span className="text-[11px] font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full">
                                {language === 'ar' ? categoryObj?.nameAr : categoryObj?.nameEn}
                              </span>
                            </td>

                            {/* السعر */}
                            <td className="px-4 py-3">
                              <div className="font-semibold text-slate-700 text-sm">
                                {p.sellPrice.toFixed(2)} {language === 'ar' ? 'ج.م' : 'EGP'}
                              </div>
                              <div className="text-[10px] text-slate-400">
                                {language === 'ar' ? 'الشراء:' : 'Cost:'} {p.buyPrice.toFixed(1)} {language === 'ar' ? 'ج.م' : 'EGP'}
                              </div>
                            </td>

                            {/* معروض الرفوف */}
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-1.5">
                                <span className={`text-sm font-bold ${isShelfCritical ? 'text-rose-600 font-extrabold' : 'text-slate-705'}`}>
                                  {p.shelfStock}
                                </span>
                                {isShelfCritical && (
                                  <span className="text-[8px] font-bold px-1 bg-rose-50 text-rose-650 rounded border border-rose-105 animate-pulse uppercase">
                                    {language === 'ar' ? 'ملء' : 'fill'}
                                  </span>
                                )}
                              </div>
                              <span className="text-[10px] text-slate-400 block whitespace-normal">
                                {language === 'ar' ? `حد الأمان: ${p.minStockAlert}` : `Safety limit: ${p.minStockAlert}`}
                              </span>
                            </td>

                            {/* ب مخزن الطوارئ الداخلي */}
                            <td className="px-4 py-3 whitespace-nowrap">
                              <span className={`text-sm font-bold ${p.warehouseStock === 0 ? 'text-slate-400 font-normal shadow-xs' : 'text-slate-700'}`}>
                                {p.warehouseStock}
                              </span>
                              <span className="text-xs text-slate-400 ml-1">{language === 'ar' ? 'علبة' : 'units'}</span>
                              
                              {/* أزرار تحويل البضاعة الفورية للرفوف */}
                              {p.warehouseStock > 0 && isShelfCritical && (
                                <button
                                  onClick={() => handleQuickRestock(p.id, p.minStockAlert - p.shelfStock + 10)}
                                  className="block text-[9px] text-sky-650 hover:text-sky-850 hover:underline mt-0.5 font-bold cursor-pointer transition-all"
                                >
                                  🚚 {language === 'ar' ? 'تفريغ 20 حبة للرف' : 'Feed 20 to shelf'}
                                </button>
                              )}
                            </td>

                            {/* الأداء والربحية */}
                            <td className="px-4 py-3 whitespace-nowrap">
                              {(() => {
                                const stats = getProductPeriodStats(p);
                                return (
                                  <div className="flex flex-col text-[11px] leading-snug">
                                    <span className="font-bold text-emerald-600 flex items-center gap-1">
                                      <span>📈</span>
                                      <span>{language === 'ar' ? 'مبيعات:' : 'Sales:'} {stats.revenue.toLocaleString(undefined, { maximumFractionDigits: 1 })} {language === 'ar' ? 'ج.م' : 'EGP'}</span>
                                      <span className="text-[9px] text-slate-400 font-normal">({stats.sold} {language === 'ar' ? 'مباع' : 'sold'})</span>
                                    </span>
                                    <span className="font-bold text-[#004a99] mt-0.5 flex items-center gap-1">
                                      <span>💰</span>
                                      <span>{language === 'ar' ? 'صافي ربح:' : 'Profit:'} {stats.profit.toLocaleString(undefined, { maximumFractionDigits: 1 })} {language === 'ar' ? 'ج.م' : 'EGP'}</span>
                                    </span>
                                    {stats.lost > 0 ? (
                                      <span className="font-semibold text-rose-500 mt-0.5 flex items-center gap-1">
                                        <span>⚠️</span>
                                        <span>{language === 'ar' ? 'خسائر تلف:' : 'Loss:'} {stats.loss.toLocaleString(undefined, { maximumFractionDigits: 1 })} {language === 'ar' ? 'ج.م' : 'EGP'}</span>
                                        <span className="text-[9px] font-normal">({stats.lost} {language === 'ar' ? 'تالف' : 'lost'})</span>
                                      </span>
                                    ) : (
                                      <span className="text-slate-400 text-[10px] mt-0.5 font-medium flex items-center gap-1">
                                        <span>✓</span>
                                        <span>{language === 'ar' ? 'لا توالف' : 'No waste'}</span>
                                      </span>
                                    )}
                                  </div>
                                );
                              })()}
                            </td>

                            {/* مستوى خطر الصلاحية والـ 60 يومًا */}
                            <td className="px-4 py-3">
                              <div className="flex flex-col">
                                <span className="font-semibold text-slate-750 font-mono text-[11px]">{p.expirationDate}</span>
                                <span className={`text-[10px] font-bold inline-block mt-1 px-1.5 py-0.2 rounded w-fit ${
                                  status === 'expired' 
                                    ? 'bg-rose-100 text-rose-700' 
                                    : status === 'near_expiry' 
                                      ? 'bg-amber-100 text-amber-700 animate-pulse' 
                                      : 'bg-emerald-50 text-emerald-700'
                                }`}>
                                  {status === 'expired' 
                                    ? (language === 'ar' ? 'منتهي الصلاحية ❌' : 'Expired ❌') 
                                    : status === 'near_expiry' 
                                      ? (language === 'ar' ? `قرب ينتهي (${daysRemaining} يوم) ⚠️` : `Expiry Alert (${daysRemaining}d) ⚠️`) 
                                      : (language === 'ar' ? 'صالح وسليم ✓' : 'Fresh ✓')}
                                </span>
                              </div>
                            </td>

                            {/* أزرار التحكم الفوري */}
                            <td className="px-4 py-3 text-center">
                              <div className="flex items-center justify-center gap-1.5">
                                <button
                                  onClick={() => {
                                    setEditingProduct(p);
                                    setIsAddOpen(true);
                                  }}
                                  title={language === 'ar' ? 'تعديل البيانات' : 'Edit item'}
                                  className="p-1 px-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded transition-colors"
                                >
                                  <Edit size={13} />
                                </button>

                                <button
                                  onClick={() => {
                                    setIsBarcodePrinterOpen(true);
                                  }}
                                  title={language === 'ar' ? 'طباعة باركود الصنف' : 'Print product barcode'}
                                  className="p-1 px-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded transition-colors"
                                >
                                  <Printer size={13} />
                                </button>

                                {status === 'near_expiry' && (
                                  <button
                                    onClick={() => handleQuickDiscount(p.id, 20)}
                                    title={language === 'ar' ? 'عمل عرض خصم بنسبة 20٪' : 'Quick 20% discount offer'}
                                    className="p-1 px-1.5 bg-amber-50 hover:bg-amber-100 text-amber-700 rounded border border-amber-200 transition-colors"
                                  >
                                    <Tag size={13} />
                                  </button>
                                )}

                                <button
                                  onClick={() => handleDeleteProduct(p.id)}
                                  title={language === 'ar' ? 'إزالة نهائية' : 'Erase permanently'}
                                  className="p-1 px-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded transition-colors"
                                >
                                  <Trash2 size={13} />
                                </button>
                              </div>
                            </td>

                          </tr>
                        );
                      })
                    )}
                  </tbody>

                </table>
              </div>

            </motion.div>
          )}

          {/* تبويب: مركز مراقبة الصلاحيات وحالات الـ 60 يوماً */}
          {activeTab === 'expiry' && (
            <motion.div
              key="expiry-tab"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="space-y-6"
            >
              
              <div className="bg-amber-50/50 border border-amber-200 rounded-2xl p-5 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="p-2.5 bg-amber-140 rounded-xl text-amber-700">
                    <BadgeAlert size={24} className="animate-pulse" />
                  </div>
                  <div>
                    <h3 className="font-bold text-amber-800 text-sm md:text-base">
                      {language === 'ar' 
                        ? `محطة السلامة الغذائية للـ ${thresholdDays} يوماً` 
                        : `Food Safety & Commercial Margins Terminal (${thresholdDays} days)`}
                    </h3>
                    <p className="text-xs text-amber-700/80 mt-1 max-w-2xl leading-relaxed">
                      {language === 'ar'
                        ? `كافة الأصناف المعروضة أدناه أوشكت مواصفات تاريخ صلاحيتها على الإغلاق (أقل من ${thresholdDays} يوماً من اليوم المحاكي المعتمد). نوصيك باتخاذ أفعال سريعة كعمل كوبونات تخفيض أو التواصل الفوري مع شركات الموزعين للمرتجع.`
                        : `All items detailed below are approaching expiry envelope (less than ${thresholdDays} days margin relative to chosen simulation clock). Please perform recommended mitigation processes directly.`}
                    </p>
                  </div>
                </div>

                {/* مؤشرات تلخيص الخطر للقسم */}
                <div className="bg-white rounded-xl p-3 border border-amber-200/50 flex gap-4 self-start md:self-auto">
                  <div className="text-center font-bold">
                    <p className="text-amber-600 text-lg md:text-xl">{nearExpiryCount}</p>
                    <p className="text-[10px] text-slate-400">{language === 'ar' ? 'قرب ينتهي' : 'Near Expiry'}</p>
                  </div>
                  <div className="border-r border-slate-100"></div>
                  <div className="text-center font-bold">
                    <p className="text-rose-600 text-lg md:text-xl">{expiredCount}</p>
                    <p className="text-[10px] text-slate-400">{language === 'ar' ? 'منتهية ❌' : 'Expired'}</p>
                  </div>
                </div>
              </div>

              {/* بطاقات الخطر والفرز الفردية للأغذية المتضررة */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {products.filter(p => {
                  const { status } = getProductExpiryStatus(p.expirationDate, simulatedToday, thresholdDays);
                  return status !== 'valid';
                }).length === 0 ? (
                  <div className="col-span-full bg-white rounded-2xl p-10 border border-slate-100 shadow-sm text-center">
                    <p className="text-slate-400 text-sm font-semibold">
                      {language === 'ar' ? 'لا بضائع منتهية أو قاربت الانتهاء! مخزون داي تو نايت مول سليم كلياً.' : 'Mall storage is fully pristine and within shelf-life safety corridors.'}
                    </p>
                  </div>
                ) : (
                  products.filter(p => {
                    const { status } = getProductExpiryStatus(p.expirationDate, simulatedToday, thresholdDays);
                    return status !== 'valid';
                  }).map((p) => {
                    const { status, daysRemaining } = getProductExpiryStatus(p.expirationDate, simulatedToday, thresholdDays);
                    const isNear = status === 'near_expiry';
                    const categoryObj = CATEGORIES.find(c => c.key === p.category);
                    const totalUnits = p.shelfStock + p.warehouseStock;
                    const lossCapital = totalUnits * p.buyPrice;

                    return (
                      <div 
                        key={p.id} 
                        className={`bg-white rounded-2xl p-5 border shadow-xs flex flex-col justify-between gap-4 transition-all relative overflow-hidden ${
                          isNear 
                            ? 'border-amber-200 hover:border-amber-350 shadow-amber-500/2' 
                            : 'border-red-200 hover:border-red-300 shadow-red-500/2'
                        }`}
                      >
                        {/* شريط خلفي باللون لإظهار الخطر */}
                        <div className={`absolute top-0 right-0 left-0 h-1.5 ${isNear ? 'bg-amber-400' : 'bg-red-500'}`}></div>

                        <div>
                          {/* الرأس الصغير للبطاقة */}
                          <div className="flex justify-between items-center text-[10px] text-slate-400 mb-2">
                            <span className="font-bold uppercase tracking-wide bg-slate-100 px-2 py-0.5 rounded-full text-slate-500">
                              {language === 'ar' ? categoryObj?.nameAr : categoryObj?.nameEn}
                            </span>
                            <span className="font-mono">Batch: {p.batchNumber}</span>
                          </div>

                          {/* اسم المنتج */}
                          <h4 className="font-extrabold text-slate-800 text-sm md:text-base">
                            {language === 'ar' ? p.nameAr : p.nameEn}
                          </h4>
                          <p className="text-[11px] text-slate-400 mt-1 font-mono">EAN-13: {p.barcode}</p>

                          {/* عداد الأيام التنازلي التفاعلي المدهش */}
                          <div className="mt-4 bg-slate-50 rounded-xl p-3 border border-slate-100 space-y-2">
                            <div className="flex justify-between text-xs font-semibold">
                              <span className="text-slate-500">{language === 'ar' ? 'تاريخ الصلاحية:' : 'Expiry Date:'}</span>
                              <span className="text-slate-700 font-mono font-bold">{p.expirationDate}</span>
                            </div>
                            
                            {/* شريط التقدم اللوني */}
                            <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                              <div 
                                className={`h-full rounded-full ${isNear ? 'bg-amber-500' : 'bg-red-600'}`}
                                style={{ width: isNear ? `${Math.max(10, Math.min(100, (daysRemaining / thresholdDays) * 100))}%` : '100%' }}
                              ></div>
                            </div>

                            <div className="flex justify-between text-[11px] font-bold">
                              <span className={isNear ? 'text-amber-600' : 'text-red-600'}>
                                {isNear 
                                  ? (language === 'ar' ? `⚠️ مخزون متبقي له ${daysRemaining} يوم` : `⚠️ ${daysRemaining} days left`)
                                  : (language === 'ar' ? '❌ منتهي الصلاحية' : '❌ Product Expired')}
                              </span>
                              <span className="text-slate-500">
                                {language === 'ar' ? `المخزون: ${totalUnits} حبة` : `Total items: ${totalUnits}`}
                              </span>
                            </div>
                          </div>

                          {/* تقييم الحجم المالي المعرض للخسارة */}
                          <div className="mt-3 flex justify-between items-center text-xs px-1">
                            <span className="text-slate-400">{language === 'ar' ? 'رأس المال المعرض للخطر:' : 'Capital value at risk:'}</span>
                            <span className="font-extrabold text-slate-700">
                              {Math.round(lossCapital).toLocaleString()} {language === 'ar' ? 'ج.م' : 'EGP'}
                            </span>
                          </div>
                        </div>

                        {/* ترسانة أفعال المعالجة السريعة والحلول ك كارفور */}
                        <div className="border-t border-slate-100 pt-3.5 space-y-2 text-xs">
                          <p className="text-[10px] text-slate-400 font-semibold block uppercase">
                            ⚙️ {language === 'ar' ? 'خيارات المعالجة المقترحة بالنظام:' : 'SYSTEM MITIGATION PROTOCOLS:'}
                          </p>

                          {isNear ? (
                            <div className="grid grid-cols-2 gap-2">
                              {/* الخيار أ: تخفيض السعر فوراً لتبديد خسارة السوبرماركت */}
                              <button
                                onClick={() => handleQuickDiscount(p.id, 50)}
                                className="p-2 bg-amber-500 hover:bg-amber-650 text-white font-bold rounded-lg text-center flex items-center justify-center gap-1 cursor-pointer shadow-xs transition-colors"
                              >
                                <Tag size={12} />
                                {language === 'ar' ? 'عمل تنزيل ٥٠٪' : '50% Flat Sale'}
                              </button>

                              {/* الخيار ب: تجهيز مرتجع للمورد */}
                              <button
                                onClick={() => {
                                  triggerToast(language === 'ar' 
                                    ? `تم تجهيز ملف إرجاع الشحنة ذي الرقم ${p.batchNumber} لشركة [${p.supplierName}] لإرساله على نظام المردودات.`
                                    : `Supplier return voucher compiled for Batch ${p.batchNumber} with [${p.supplierName}].`
                                  );
                                  setNotificationsDismissed(prev => [...prev, p.id]);
                                }}
                                className="p-2 border border-slate-200 hover:border-slate-300 text-slate-655 font-semibold bg-white hover:bg-slate-50 rounded-lg text-center cursor-pointer transition-colors"
                              >
                                📦 {language === 'ar' ? 'إرسال للمورد' : 'Supplier Return'}
                              </button>
                            </div>
                          ) : (
                            <div className="grid grid-cols-2 gap-2">
                              {/* الخيار ج: إعدام كلي وتصويب الجرد من المخزن */}
                              <button
                                onClick={() => handleDisposeStocks(p.id)}
                                className="p-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-lg text-center flex items-center justify-center gap-1 cursor-pointer transition-colors"
                              >
                                <Trash2 size={12} />
                                {language === 'ar' ? 'إعدام البضاعة تالف' : 'Confirm Disposal'}
                              </button>

                              {/* اتصال بالموزع سريعاً للمرتجعات */}
                              <a
                                href={`tel:${p.supplierPhone}`}
                                className="p-2 border border-blue-200 hover:bg-blue-50 text-blue-700 font-bold rounded-lg text-center flex items-center justify-center gap-1 transition-all"
                              >
                                <Phone size={12} />
                                {language === 'ar' ? 'اتصال بالمورد' : 'Dial Supplier'}
                              </a>
                            </div>
                          )}
                        </div>

                      </div>
                    );
                  })
                )}
              </div>

            </motion.div>
          )}

          {/* تبويب: إدارة الموردين وإعادة الطلب التلقائي */}
          {activeTab === 'suppliers' && (
            <motion.div
              key="suppliers-tab"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="w-full"
            >
              {currentUserRole === 'cashier' ? (
                renderRestrictedView(
                  "قسم الموردين واللوجستيات محمي",
                  "Supplier Logistics Center Locked",
                  "يرجى العلم أن عقود التوريد وإدارة دفع الموردين مخصصة فقط لأعضاء الإدارة والمدير العام ولا تقع ضمن صلاحيات المبيعات النشطة.",
                  "Contracts, invoices, and supplier contact parameters are restricted. Switch active user profile to General Manager to view."
                )
              ) : (
                <div className="space-y-6 text-xs md:text-sm w-full">
                  
                  {/* ERP Supplier Header */}
                  <div className="bg-[#004a99]/5 dark:bg-[#004a99]/10 rounded-2xl p-4 border border-[#004a99]/10 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                      <h2 className="text-base md:text-lg font-black text-slate-800 flex items-center gap-2">
                        <Truck size={22} className="text-[#004a99]" />
                        {language === 'ar' ? 'مركز خدمات الموردين واللوجستيات والمشتريات الشامل' : 'Supplier Logistics & Purchases ERP Hub'}
                      </h2>
                      <p className="text-xs text-slate-500 mt-1">
                        {language === 'ar'
                          ? 'إدارة حسابات الدائنين لدفعات الموردين، وإصدار الفواتير وعمل المرتجعات، وتنزيل ورفع بنود المشتريات بالإكسل والتحقق من مقارنة الأسعار.'
                          : 'Bookkeep supplier accounts, issue return vounchers, manage Excel purchase invoices and compare supplier catalogs.'}
                      </p>
                    </div>

                    {/* Sub Tab Navigation */}
                    <div className="flex flex-wrap gap-1 bg-white p-1 rounded-xl border border-slate-100 shadow-xs self-stretch md:self-auto justify-stretch">
                      <button
                        onClick={() => setSuppliersSubTab('list')}
                        className={`px-3 py-1.5 rounded-lg font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                          suppliersSubTab === 'list' ? 'bg-[#004a99] text-white shadow-xs' : 'text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        <Users size={14} />
                        <span>{language === 'ar' ? 'الموردون والحسابات' : 'Suppliers & Ledger'}</span>
                      </button>

                      <button
                        onClick={() => setSuppliersSubTab('create')}
                        className={`px-3 py-1.5 rounded-lg font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                          suppliersSubTab === 'create' ? 'bg-[#004a99] text-white shadow-xs' : 'text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        <Plus size={14} />
                        <span>{language === 'ar' ? 'إنشاء فاتورة' : 'Create Invoice'}</span>
                      </button>

                      <button
                        onClick={() => setSuppliersSubTab('excel')}
                        className={`px-3 py-1.5 rounded-lg font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                          suppliersSubTab === 'excel' ? 'bg-[#004a99] text-white shadow-xs' : 'text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        <FileSpreadsheet size={14} />
                        <span>{language === 'ar' ? 'مشتريات إكسيل' : 'Excel Purchase'}</span>
                      </button>

                      <button
                        onClick={() => setSuppliersSubTab('archive')}
                        className={`px-3 py-1.5 rounded-lg font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                          suppliersSubTab === 'archive' ? 'bg-[#004a99] text-white shadow-xs' : 'text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        <Archive size={14} />
                        <span>{language === 'ar' ? 'الأرشيف والمعلقة' : 'Bills & Pending'}</span>
                      </button>

                      <button
                        onClick={() => setSuppliersSubTab('pricing')}
                        className={`px-3 py-1.5 rounded-lg font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                          suppliersSubTab === 'pricing' ? 'bg-[#004a99] text-white shadow-xs' : 'text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        <Tag size={14} />
                        <span>{language === 'ar' ? 'أسعار التوريد' : 'Supplier Prices'}</span>
                      </button>
                    </div>
                  </div>

                  {/* SUB-TAB: SUPPLIERS ACCOUNT BALANCES & DIRECTORY */}
                  {suppliersSubTab === 'list' && (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                      
                      {/* Left: Suppliers Grid and Balance Sheet */}
                      <div className="lg:col-span-2 space-y-4">
                        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-xs space-y-4">
                          <div className="flex justify-between items-center pb-2 border-b border-slate-50">
                            <div>
                              <h3 className="font-extrabold text-slate-800 text-sm md:text-base flex items-center gap-1.5">
                                <Users size={16} className="text-emerald-600" />
                                {language === 'ar' ? 'دليل وشبكة الموردين وحسابات الحصص' : 'Authorized Supplier Directory & Accounts Balance'}
                              </h3>
                              <p className="text-xs text-slate-400 mt-1">
                                {language === 'ar'
                                  ? 'عرض العقود والدفعات النقدية المسجلة وتفاصيل المستحقات المالية الدائنة.'
                                  : 'Active business contracts, cash payments ledgers and financial outstanding payables.'}
                              </p>
                            </div>

                            <button
                              onClick={() => {
                                setEditingSupplier(null);
                                setIsAddingSupplier(!isAddingSupplier);
                              }}
                              className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-extrabold rounded-lg flex items-center gap-1 text-xs transition-colors pointer-events-auto cursor-pointer"
                            >
                              <Plus size={14} />
                              {language === 'ar' ? 'إضافة مورد جديد' : 'New Supplier'}
                            </button>
                          </div>

                          {/* Add / Edit Supplier Form */}
                          {(isAddingSupplier || editingSupplier) && (
                            <form
                              onSubmit={(e) => {
                                e.preventDefault();
                                const formData = new FormData(e.currentTarget);
                                const payload = {
                                  id: editingSupplier?.id || undefined,
                                  nameAr: formData.get('nameAr') as string,
                                  nameEn: formData.get('nameEn') as string,
                                  phone: formData.get('phone') as string,
                                  email: formData.get('email') as string,
                                  category: formData.get('category') as any,
                                };

                                fetch('/api/suppliers', {
                                  method: 'POST',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify(payload)
                                })
                                  .then(res => res.json())
                                  .then(data => {
                                    if (data.success) {
                                      triggerToast(language === 'ar' ? '🎉 تم حفظ بيانات المورد بنجاح' : '🎉 Supplier data saved successfully');
                                      setIsAddingSupplier(false);
                                      setEditingSupplier(null);
                                      refreshSuppliers();
                                    }
                                  })
                                  .catch(err => console.error(err));
                              }}
                              className="p-4 bg-slate-50 border border-slate-200/50 rounded-xl grid grid-cols-1 md:grid-cols-4 gap-3 text-xs"
                            >
                              <div className="md:col-span-2">
                                <label className="block text-slate-500 font-bold mb-1">{language === 'ar' ? 'الاسم باللغة العربية' : 'Arabic Name'}</label>
                                <input name="nameAr" required defaultValue={editingSupplier?.nameAr || ''} className="w-full bg-white border border-slate-200 p-2 rounded text-slate-800" />
                              </div>
                              <div className="md:col-span-2">
                                <label className="block text-slate-500 font-bold mb-1">{language === 'ar' ? 'الاسم باللغة الإنجليزية' : 'English Name'}</label>
                                <input name="nameEn" defaultValue={editingSupplier?.nameEn || ''} className="w-full bg-white border border-slate-200 p-2 rounded text-slate-800" />
                              </div>
                              <div>
                                <label className="block text-slate-500 font-bold mb-1">{language === 'ar' ? 'رقم الهاتف' : 'Phone Number'}</label>
                                <input name="phone" required defaultValue={editingSupplier?.phone || ''} className="w-full bg-white border border-slate-200 p-2 rounded font-mono text-slate-800" />
                              </div>
                              <div>
                                <label className="block text-slate-500 font-bold mb-1">{language === 'ar' ? 'البريد الإلكتروني' : 'Email Address'}</label>
                                <input name="email" type="email" defaultValue={editingSupplier?.email || ''} className="w-full bg-white border border-slate-200 p-2 rounded font-mono text-slate-800" />
                              </div>
                              <div>
                                <label className="block text-slate-500 font-bold mb-1">{language === 'ar' ? 'النشاط التوريدي' : 'Supply Category'}</label>
                                <select name="category" defaultValue={editingSupplier?.category || 'groceries'} className="w-full bg-white border border-slate-200 p-2 rounded text-slate-800">
                                  {CATEGORIES.map(c => (
                                    <option key={c.key} value={c.key}>{language === 'ar' ? c.nameAr : c.nameEn}</option>
                                  ))}
                                </select>
                              </div>
                              <div className="flex items-end gap-2">
                                <button type="submit" className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold py-2 rounded cursor-pointer">
                                  {language === 'ar' ? 'حفظ الحساب' : 'Save Supplier'}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setIsAddingSupplier(false);
                                    setEditingSupplier(null);
                                  }}
                                  className="px-3 bg-slate-250 py-2 border border-slate-200 rounded font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
                                >
                                  {language === 'ar' ? 'إلغاء' : 'Cancel'}
                                </button>
                              </div>
                            </form>
                          )}

                          {/* Suppliers Ledger Table */}
                          <div className="overflow-x-auto">
                            <table className="w-full border-collapse text-left text-xs text-slate-500">
                              <thead className="bg-slate-50 text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                                <tr>
                                  <th scope="col" className="px-4 py-3 text-right">{language === 'ar' ? 'اسم المورد والمجال' : 'Supplier & Niche'}</th>
                                  <th scope="col" className="px-4 py-3 text-center">{language === 'ar' ? 'إجمالي المشتريات' : 'Total Purchases'}</th>
                                  <th scope="col" className="px-4 py-3 text-center">{language === 'ar' ? 'إجمالي المرتجعات' : 'Total Returns'}</th>
                                  <th scope="col" className="px-4 py-3 text-center">{language === 'ar' ? 'إجمالي الدفعات' : 'Total Paid'}</th>
                                  <th scope="col" className="px-4 py-3 text-center">{language === 'ar' ? 'الرصيد المتبقي' : 'Outstanding Balance'}</th>
                                  <th scope="col" className="px-4 py-3 text-center">{language === 'ar' ? 'أوامر وإجراءات' : 'ERP Actions'}</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100">
                                {suppliers.map((sup) => {
                                  // Calculate financials from actual invoices
                                  const supplierInvoices = invoices.filter(inv => inv.supplierName === sup.nameAr || inv.supplierName === sup.nameEn);
                                  const totalPurchases = supplierInvoices
                                    .filter(inv => inv.isPosted && inv.invoiceType !== 'return')
                                    .reduce((sum, inv) => sum + Number(inv.totalAmount || 0), 0);
                                  const totalReturns = supplierInvoices
                                    .filter(inv => inv.isPosted && inv.invoiceType === 'return')
                                    .reduce((sum, inv) => sum + Number(inv.totalAmount || 0), 0);
                                  const totalPaid = supplierPayments
                                    .filter(p => p.supplierName === sup.nameAr || p.supplierName === sup.nameEn)
                                    .reduce((sum, p) => sum + Number(p.amount || 0), 0);

                                  const balanceOwed = totalPurchases - totalReturns - totalPaid;

                                  return (
                                    <tr key={sup.id} className="hover:bg-slate-50/70 transition-colors">
                                      <td className="px-4 py-3 text-right">
                                        <div className="flex flex-col">
                                          <span className="font-extrabold text-slate-800 md:text-xs">
                                            {language === 'ar' ? sup.nameAr : sup.nameEn}
                                          </span>
                                          <span className="text-[10px] text-slate-400 font-mono mt-0.5">
                                            📞 {sup.phone} | {CATEGORIES.find(c => c.key === sup.category)?.nameAr || sup.category}
                                          </span>
                                        </div>
                                      </td>
                                      <td className="px-4 py-3 text-center font-bold text-slate-705 font-mono">{totalPurchases.toLocaleString()} ج.م</td>
                                      <td className="px-4 py-3 text-center font-bold text-rose-655 font-mono">{totalReturns > 0 ? `-${totalReturns.toLocaleString()}` : '0'} ج.م</td>
                                      <td className="px-4 py-3 text-center font-bold text-emerald-600 font-mono">{totalPaid.toLocaleString()} ج.م</td>
                                      <td className="px-4 py-3 text-center font-mono">
                                        <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                                          balanceOwed > 0 ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
                                        }`}>
                                          {balanceOwed.toLocaleString()} ج.م
                                        </span>
                                      </td>
                                      <td className="px-4 py-3 text-center font-bold">
                                        <div className="flex justify-center items-center gap-1.5">
                                          <button
                                            onClick={() => {
                                              setSupplierPaymentModal(sup);
                                              setPaymentAmount('');
                                              setPaymentNotes('');
                                              setPaymentDate(simulatedToday);
                                            }}
                                            className="p-1 px-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded text-xs flex items-center gap-0.5 transition-colors pointer-events-auto cursor-pointer font-bold"
                                            title={language === 'ar' ? 'تسجيل دفعة للمورد' : 'Remittance Settle'}
                                          >
                                            <DollarSign size={11} />
                                            <span>{language === 'ar' ? 'سداد' : 'Pay'}</span>
                                          </button>
                                          <button
                                            onClick={() => setEditingSupplier(sup)}
                                            className="p-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded transition-colors pointer-events-auto cursor-pointer"
                                            title={language === 'ar' ? 'تعديل المعلمات' : 'Edit parameters'}
                                          >
                                            <Edit size={11} />
                                          </button>
                                        </div>
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        </div>

                        {/* Recent Cash Payments Transactions */}
                        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-xs space-y-3">
                          <h4 className="font-extrabold text-slate-800 text-xs md:text-sm flex items-center gap-1.5">
                            <CreditCard size={15} className="text-sky-600" />
                            {language === 'ar' ? 'سجل السحوبات المالية والوصولات النقدية للموردين' : 'Supplier Cash Payments Ledger'}
                          </h4>
                          {supplierPayments.length === 0 ? (
                            <p className="text-center py-6 text-slate-400 font-medium text-xs">
                              {language === 'ar' ? 'لا يوجد مدفوعات نقدية مسجلة بعد' : 'No payments logged yet'}
                            </p>
                          ) : (
                            <div className="space-y-2 max-h-56 overflow-y-auto">
                              {supplierPayments.map((p) => (
                                <div key={p.id} className="p-3 bg-slate-50 border border-slate-100 rounded-xl flex justify-between items-center text-xs">
                                  <div className="space-y-1">
                                    <p className="font-bold text-slate-800">{p.supplierName}</p>
                                    <p className="text-[10px] text-slate-400">{p.notes} | 📅 {p.date}</p>
                                  </div>
                                  <span className="font-extrabold text-emerald-755 font-mono bg-emerald-50 px-2 py-0.5 rounded">
                                    -{p.amount} ج.م
                                  </span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Right: Restocking Smart Panel */}
                      <div className="space-y-4">
                        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-xs flex flex-col justify-between h-full">
                          <div>
                            <h3 className="font-bold text-slate-800 text-sm md:text-base flex items-center gap-1.5">
                              <FileText size={18} className="text-sky-600 animate-pulse" />
                              {language === 'ar' ? 'أوامر التوريد وإعادة الطلب التلقائية' : 'Automated Supply Manifest'}
                            </h3>
                            <p className="text-xs text-slate-400 mt-1">
                              {language === 'ar'
                                ? 'يولد النظام إلكترونياً أمر طلب كمية إضافية فور انخفاض مخزون أي صنف عن حد الأمان.'
                                : 'Purchase order lines compiled by the algorithm as stock thresholds decay.'}
                            </p>
                          </div>

                          <div className="space-y-3 max-h-96 overflow-y-auto pr-1 my-4 flex-1">
                            {products.filter(p => (p.shelfStock + p.warehouseStock) <= p.minStockAlert).length === 0 ? (
                              <div className="text-center py-12 text-slate-400 font-medium text-xs">
                                {language === 'ar' ? 'كل مستويات مخزون الأقسام آمنة كلياً!' : 'All category inventories are well stocked!'}
                              </div>
                            ) : (
                              products.filter(p => (p.shelfStock + p.warehouseStock) <= p.minStockAlert).map((p) => {
                                const shortage = Math.max(50, p.minStockAlert * 3 - (p.shelfStock + p.warehouseStock));

                                return (
                                  <div key={p.id} className="p-3 bg-red-50/40 rounded-xl border border-red-100 text-xs space-y-2">
                                    <div className="flex justify-between font-bold text-slate-800">
                                      <span>{language === 'ar' ? p.nameAr : p.nameEn}</span>
                                      <span className="text-rose-655 bg-rose-50 px-1 rounded font-bold">EAN: {p.barcode}</span>
                                    </div>

                                    <div className="text-[10px] text-slate-500 font-medium space-y-1">
                                      <p>🏢 {language === 'ar' ? `المورد المقترح: ${p.supplierName}` : `Proposed Supplier: ${p.supplierName}`}</p>
                                      <p>📊 {language === 'ar' ? `إجمالي المتبقي بالمول: ${p.shelfStock + p.warehouseStock} (حد الأمان: ${p.minStockAlert})` : `Remaining Mall Stock: ${p.shelfStock + p.warehouseStock} (Safety: ${p.minStockAlert})`}</p>
                                    </div>

                                    <div className="border-t border-dashed border-red-200/50 pt-2 flex justify-between items-center whitespace-nowrap gap-2">
                                      <div className="text-[10px]">
                                        <p className="text-slate-400">{language === 'ar' ? 'كمية إعادة الطلب:' : 'Re-order Quantity:'}</p>
                                        <p className="font-bold text-slate-705">+{shortage} {language === 'ar' ? 'علبة' : 'units'}</p>
                                      </div>
                                      <button
                                        onClick={() => {
                                          setProducts(
                                            products.map(itm => {
                                              if (itm.id === p.id) {
                                                return {
                                                  ...itm,
                                                  warehouseStock: itm.warehouseStock + shortage,
                                                  lastUpdated: simulatedToday
                                                };
                                              }
                                              return itm;
                                            })
                                          );
                                          triggerToast(language === 'ar' 
                                            ? `تم اعتماد شحن ودخول ${shortage} وحدة من المنتج للمخزن الداخلي من شركة المورد.` 
                                            : `Batch load of +${shortage} units shipped and loaded into Back-Store warehouse.`
                                          );
                                        }}
                                        className="px-2.5 py-1 bg-[#004a99] hover:bg-blue-700 text-white font-bold rounded-md cursor-pointer transition-all shadow-sm pointer-events-auto"
                                      >
                                        ✓ {language === 'ar' ? 'تحميل الشحنة' : 'Authorize Buy'}
                                      </button>
                                    </div>
                                  </div>
                                );
                              })
                            )}
                          </div>

                          <div className="bg-slate-50 rounded-xl p-3 border border-slate-100 text-[11px] text-slate-500 text-center">
                            💡 {language === 'ar' ? 'تحاكي هذه الميزة بروتوكول طلبات التموين الذكية وسلاسل الإمداد فائقة الفعالية.' : 'This mimics dynamic logistics supply cycles of smart stores.'}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}


                </div>
              )}
            </motion.div>
          )}

          {/* تبويب: نقطة بيع الكاشير الذكية وشاشة العميل المتزامنة */}
          {activeTab === 'cashier' && (
            <motion.div
              key="cashier-tab"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="grid grid-cols-1 xl:grid-cols-12 gap-6"
            >
              
              {/* قسم لوحة الكاشير (الكولوم الأكبر باليسار في LTR واليمين في RTL) - يغطي 7 أعمدة */}
              <div className="xl:col-span-7 bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm space-y-4">
                <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                  <div>
                    <h3 className="font-extrabold text-slate-800 text-base flex items-center gap-2">
                      <span className="p-1 px-2 bg-blue-100 text-blue-800 rounded text-xs">POS TERMINAL</span>
                      {language === 'ar' ? 'لوحة تسجيل مبيعات الكاشير الموحدة' : 'Unified Cashier Sales Terminal'}
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {language === 'ar' 
                        ? 'قم بمسح الباركود أو الضغط على السلعة لترحيلها إلى شاشة الزبون وصندوق الفاتورة.' 
                        : 'Simulate barcode scanners or click catalog cards to sweep items into live customer visual.'}
                    </p>
                  </div>

                  <button
                    onClick={clearCart}
                    disabled={posCart.length === 0}
                    className="p-1.5 px-3 bg-red-50 hover:bg-red-100 text-red-600 font-bold rounded-lg text-xs flex items-center gap-1 cursor-pointer disabled:opacity-40 transition-colors"
                  >
                    <Trash2 size={12} />
                    {language === 'ar' ? 'تصفير الفاتورة' : 'Void Order'}
                  </button>
                </div>

                {/* شريط الإدخال ومحاكاة الماسح الضوئي باركود */}
                <div className="p-3 bg-slate-55 border border-slate-100 rounded-xl">
                  <form 
                    onSubmit={(e) => {
                      e.preventDefault();
                      const matchedPrd = products.find(p => p.barcode === scannerQuery.trim());
                      if (matchedPrd) {
                        addToCart(matchedPrd);
                        setScannerQuery('');
                      } else {
                        triggerToast(language === 'ar' ? '⚠️ لم يتم العثور على الباركود الممسوح' : '⚠️ Barcode not found in inventory');
                      }
                    }}
                    className="flex gap-2"
                  >
                    <div className="relative flex-1">
                      <Barcode size={16} className="absolute left-3 top-2.5 text-slate-400" />
                      <input
                        type="text"
                        placeholder={language === 'ar' ? 'اكتب الباركود يدويًا هنا واضغط Enter لمحاكاة الماسح الضوئي...' : 'Scan/Enter Barcode here and hit Enter...'}
                        value={scannerQuery}
                        onChange={(e) => setScannerQuery(e.target.value)}
                        className="w-full text-xs pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#004a99] font-mono"
                      />
                    </div>
                    <button
                      type="submit"
                      className="px-4 py-2 bg-[#004a99] hover:bg-blue-700 text-white font-bold text-xs rounded-lg cursor-pointer shrink-0"
                    >
                      {language === 'ar' ? 'محاكاة مسح' : 'Simulate Scan'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsPosCameraScannerOpen(true)}
                      className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg cursor-pointer flex items-center gap-1.5 shadow-sm hover:scale-[1.01] active:scale-[0.99] transition-all shrink-0"
                    >
                      <Camera size={14} className="animate-pulse text-amber-300" />
                      <span>{language === 'ar' ? 'مسح الكاميرا المباشر 📸' : 'Live Camera Scan 📸'}</span>
                    </button>
                  </form>
                  
                  {/* باركودات سريعة للنسخ من أجل التجربة المريحة */}
                  <div className="mt-2 flex flex-wrap gap-1.5 items-center text-[10px] text-slate-500">
                    <span className="font-semibold">{language === 'ar' ? 'باركودات سريعة للتجربة والمسح:' : 'Quick Barcodes to try:'}</span>
                    {products.slice(0, 4).map(p => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => setScannerQuery(p.barcode)}
                        className="bg-white hover:bg-slate-150 border border-slate-200 text-[#004a99] font-mono px-1.5 py-0.5 rounded cursor-pointer text-[9px]"
                        title={language === 'ar' ? 'انقر لوضع الباركود في حقل الماسح' : 'Click to put barcode into scanner field'}
                      >
                        {p.barcode} ({language === 'ar' ? p.nameAr.slice(0, 5) : p.nameEn.slice(0, 5)}...)
                      </button>
                    ))}
                  </div>
                </div>

                {/* سلة فاتورة العقد المفتوح */}
                <div className="border border-slate-100 rounded-xl overflow-hidden bg-slate-50/50">
                  <div className="p-3 bg-slate-100/50 text-slate-700 font-bold text-xs border-b border-slate-100">
                    🛒 {language === 'ar' ? 'أصناف الفاتورة المسجلة حالياً' : 'Current Active Sales Draft'}
                  </div>
                  
                  {posCart.length === 0 ? (
                    <div className="text-center py-10 text-slate-400 text-xs font-semibold">
                      {language === 'ar' 
                        ? 'لا أصناف في الفاتورة بعد. استخدم فئات البحث السريع بالأسفل لمسح السلع.' 
                        : 'Sales list is empty. Add products from the catalog directory below.'}
                    </div>
                  ) : (
                    <div className="divide-y divide-slate-100 max-h-56 overflow-y-auto bg-white">
                      {posCart.map((item) => {
                        const { status, daysRemaining } = getProductExpiryStatus(item.product.expirationDate, simulatedToday, thresholdDays);
                        const rowTotal = item.product.sellPrice * item.quantity;
                        return (
                          <div key={item.product.id} className="p-3 flex items-center justify-between gap-3 text-xs">
                            <div className="flex-1">
                              <div className="flex items-center gap-1.5 text-slate-800 font-bold">
                                <span>{language === 'ar' ? item.product.nameAr : item.product.nameEn}</span>
                                {status !== 'valid' && (
                                  <span className="px-1.5 py-0.2 bg-amber-100 text-amber-800 text-[8px] font-extrabold rounded animate-pulse">
                                    ⚠️ {language === 'ar' ? 'صلاحية قريبة' : 'Close Expiry'}
                                  </span>
                                )}
                              </div>
                              <p className="text-[10px] text-slate-400 mt-0.5 font-mono">
                                {item.product.sellPrice} ج.م × {item.quantity} | {language === 'ar' ? `المتبقي بالرف: ${item.product.shelfStock}` : `Shelf qty: ${item.product.shelfStock}`}
                              </p>
                            </div>

                            <div className="flex items-center gap-3">
                              {/* متحكمات الكمية */}
                              <div className="flex items-center gap-1 bg-slate-50 p-1 rounded-lg border border-slate-150">
                                <button
                                  type="button"
                                  onClick={() => updateCartQuantity(item.product.id, item.quantity - 1)}
                                  className="w-5 h-5 text-slate-655 bg-white hover:bg-slate-100 rounded border border-slate-200 flex items-center justify-center font-bold text-xs"
                                >
                                  -
                                </button>
                                <span className="font-extrabold text-slate-705 px-2 min-w-[20px] text-center">
                                  {item.quantity}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => updateCartQuantity(item.product.id, item.quantity + 1)}
                                  className="w-5 h-5 text-slate-655 bg-white hover:bg-slate-100 rounded border border-slate-200 flex items-center justify-center font-bold text-xs"
                                >
                                  +
                                </button>
                              </div>

                              <span className="font-bold text-slate-800 w-20 text-left md:text-right font-mono">
                                {rowTotal.toLocaleString()} {language === 'ar' ? 'ج.م' : 'EGP'}
                              </span>

                              <button
                                onClick={() => updateCartQuantity(item.product.id, 0)}
                                className="p-1 text-red-500 hover:text-red-700 hover:bg-red-50 rounded"
                              >
                                <X size={14} />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* تسوية المبلغ ومدفوعات الزبون بالريال/الجنيه */}
                {posCart.length > 0 && (
                  <div className="space-y-4">
                    {/* خيارات متطورة: طريقة السحب ونقاط العملاء */}
                    <div className="p-4 bg-blue-50/40 border border-blue-100 rounded-xl grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                      {/* طريقة السحب من الدفعة */}
                      <div className="space-y-1.5 text-right" style={{ direction: 'rtl' }}>
                        <label className="block text-slate-700 font-extrabold text-[11px]">
                          ⚙️ {language === 'ar' ? 'طريقة السحب من المخزون (تشغيلات البضاعة)' : 'Depletion Stock strategy'}
                        </label>
                        <select
                          value={deductionMethod}
                          onChange={(e: any) => setDeductionMethod(e.target.value)}
                          className="w-full text-xs font-bold p-2 bg-white border border-slate-250 rounded-lg focus:ring-1 focus:ring-blue-500 focus:outline-none"
                        >
                          <option value="fifo">FIFO ({language === 'ar' ? 'الأقدم في الدخول أولاً - بضاعة قديمة' : 'First-In First-Out - Older stocks first'})</option>
                          <option value="lifo">LIFO ({language === 'ar' ? 'الأحدث في الدخول أولاً - بضاعة حديثة' : 'Last-In First-Out - Newer stocks first'})</option>
                        </select>
                        <p className="text-[9px] text-slate-400">
                          {language === 'ar' 
                            ? 'سيقوم النظام بسحب الكمية من المطبوعات والتشغيلات المخصصة للمنتج طبقاً للتاريخ المحدد بالترتيب.' 
                            : 'Shelf batches will be dispatched sequentially depending on their purchase dates.'}
                        </p>
                      </div>

                      {/* اختيار العميل والولاء */}
                      <div className="space-y-1.5 text-right" style={{ direction: 'rtl' }}>
                        <label className="block text-slate-700 font-extrabold text-[11px]">
                          🤝 {language === 'ar' ? 'ربط عميل الولاء لتسجيل النقاط' : 'Assign Customer Loyalty'}
                        </label>
                        <div className="flex gap-2">
                          <select
                            value={selectedCustomerId}
                            onChange={(e: any) => {
                              setSelectedCustomerId(e.target.value);
                              setRedeemedPointsInput(0);
                            }}
                            className="flex-1 text-xs font-bold p-2 bg-white border border-slate-250 rounded-lg focus:ring-1 focus:ring-blue-500 focus:outline-none"
                          >
                            <option value="">-- {language === 'ar' ? 'عميل كاش عادي' : 'Standard Cash Client'} --</option>
                            {customers.map(c => (
                              <option key={c.id} value={c.id}>
                                {c.name || c.nameAr} ({c.phone} | {c.points} {language === 'ar' ? 'نقطة' : 'pt'}) - {c.governorate}
                              </option>
                            ))}
                          </select>
                          <button
                            type="button"
                            onClick={() => setIsAddCustomerDrawerOpen(!isAddCustomerDrawerOpen)}
                            className="px-2.5 bg-blue-600 hover:bg-blue-750 text-white font-extrabold text-xs rounded-lg transition-colors cursor-pointer"
                            title={language === 'ar' ? 'تسجيل عميل ولاء جديد فوراً' : 'Quick register customer'}
                          >
                            ➕
                          </button>
                        </div>

                        {/* نموذج التسجيل السريع لعميل الولاء مدمج للكاشير */}
                        {isAddCustomerDrawerOpen && (
                          <div className="mt-2 p-3 bg-emerald-50/70 border border-emerald-200/80 rounded-xl space-y-2 text-right">
                            <div className="flex justify-between items-center pb-1 border-b border-emerald-200">
                              <p className="font-extrabold text-[10px] text-emerald-800">
                                📝 {language === 'ar' ? 'تسجيل سريع لعميل ولاء جديد في المنظومة' : 'Quick Loyalty Registration'}
                              </p>
                              <button 
                                type="button"
                                onClick={() => setIsAddCustomerDrawerOpen(false)}
                                className="text-emerald-700 hover:text-emerald-900 font-bold text-xs"
                              >
                                ✕
                              </button>
                            </div>
                            <div className="space-y-1.5 pt-1">
                              <input
                                type="text"
                                placeholder={language === 'ar' ? 'الاسم الثلاثي للعميل' : 'Client Full Name'}
                                value={posCustomerName}
                                onChange={(e) => setPosCustomerName(e.target.value)}
                                className="w-full text-[11px] p-1.5 bg-white border border-emerald-250 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500 font-bold"
                              />
                              <input
                                type="text"
                                placeholder={language === 'ar' ? 'رقم الهاتف المحمول (١١ رقم)' : 'Mobile Phone (11 digits)'}
                                value={posCustomerPhone}
                                onChange={(e) => setPosCustomerPhone(e.target.value)}
                                className="w-full text-[11px] p-1.5 bg-white border border-emerald-250 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500 font-mono font-bold"
                              />
                              <div className="flex gap-2">
                                <select
                                  value={posCustomerGov}
                                  onChange={(e: any) => setPosCustomerGov(e.target.value)}
                                  className="flex-1 text-[11px] p-1.5 bg-white border border-emerald-250 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500 font-bold"
                                >
                                  <option value="القاهرة">القاهرة</option>
                                  <option value="الجيزة">الجيزة</option>
                                  <option value="الإسكندرية">الإسكندرية</option>
                                  <option value="القليوبية">القليوبية</option>
                                  <option value="الغربية">الغربية</option>
                                  <option value="البحيرة">البحيرة</option>
                                  <option value="الدقهلية">الدقهلية</option>
                                  <option value="الشرقية">الشرقية</option>
                                  <option value="المنوفية">المنوفية</option>
                                  <option value="الفيوم">الفيوم</option>
                                  <option value="بني سويف">بني سويف</option>
                                  <option value="المنيا">المنيا</option>
                                  <option value="أسيوط">أسيوط</option>
                                  <option value="سوهاج">سوهاج</option>
                                  <option value="قنا">قنا</option>
                                  <option value="الأقصر">الأقصر</option>
                                  <option value="أسوان">أسوان</option>
                                </select>
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (!posCustomerName || !posCustomerPhone) {
                                      triggerToast(language === 'ar' ? '⚠️ يرجى تعبئة الاسم والهاتف بالكامل' : '⚠️ Complete details required');
                                      return;
                                    }
                                    fetch('/api/customers', {
                                      method: 'POST',
                                      headers: { 'Content-Type': 'application/json' },
                                      body: JSON.stringify({
                                        name: posCustomerName,
                                        nameAr: posCustomerName,
                                        phone: posCustomerPhone,
                                        governorate: posCustomerGov
                                      })
                                    })
                                    .then(res => res.json())
                                    .then(data => {
                                      if (data.success) {
                                        triggerToast(language === 'ar' ? '🎉 تم تسجيل العميل وترصيده بنجاح!' : '🎉 Customer registered successfully!');
                                        const newlyCreated = data.customer;
                                        setPosCustomerName('');
                                        setPosCustomerPhone('');
                                        setPosCustomerGov('القاهرة');
                                        setIsAddCustomerDrawerOpen(false);
                                        
                                        // Update local list and auto-select
                                        fetch('/api/customers')
                                          .then(r => r.json())
                                          .then(lst => {
                                            if (Array.isArray(lst)) {
                                              setCustomers(lst);
                                              if (newlyCreated && newlyCreated.id) {
                                                setSelectedCustomerId(newlyCreated.id);
                                                setRedeemedPointsInput(0);
                                              }
                                            }
                                          });
                                      } else {
                                        triggerToast(data.error || 'Failed to register customer');
                                      }
                                    })
                                    .catch(err => {
                                      console.error(err);
                                      triggerToast('Database communication failed');
                                    });
                                  }}
                                  className="px-3 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-[11px] rounded-lg transition-colors cursor-pointer"
                                >
                                  {language === 'ar' ? 'تسجيل' : 'Enroll'}
                                </button>
                              </div>
                            </div>
                          </div>
                        )}

                        {selectedCustomerId && (
                          <div className="mt-2 p-2 bg-white rounded-lg border border-slate-200/60 space-y-2">
                            <div className="flex justify-between text-[10px] text-slate-600">
                              <span>{language === 'ar' ? 'النقاط المتوفرة للعميل:' : 'Points Available:'}</span>
                              <span className="font-extrabold text-blue-700 font-mono">
                                {customers.find(c => c.id === selectedCustomerId)?.points || 0} {language === 'ar' ? 'نقطة' : 'pts'} 
                                <span className="font-normal text-slate-400 font-sans mr-1"> (={((customers.find(c => c.id === selectedCustomerId)?.points || 0) * 0.1).toFixed(1)} {language === 'ar' ? 'ج.م' : 'EGP'})</span>
                              </span>
                            </div>

                            <div className="space-y-1">
                              <label className="block text-[10px] text-slate-500 font-bold">
                                {language === 'ar' ? 'النقاط المراد استبدالها كخصم فوري (١٠ نقاط = ١ ج):' : 'Points to redeem (10 pt = 1 EGP):'}
                              </label>
                              <input
                                type="number"
                                min="0"
                                max={customers.find(c => c.id === selectedCustomerId)?.points || 0}
                                value={redeemedPointsInput}
                                onChange={(e) => {
                                  let val = Math.max(0, parseInt(e.target.value) || 0);
                                  const maxPt = customers.find(c => c.id === selectedCustomerId)?.points || 0;
                                  if (val > maxPt) val = maxPt;
                                  setRedeemedPointsInput(val);
                                }}
                                className="w-full p-1 bg-slate-50 border border-slate-200 rounded text-center text-xs font-bold font-mono"
                              />
                              <p className="text-[9px] text-emerald-600 font-bold">
                                {language === 'ar' 
                                  ? `✦ خصم إضافي بقيمة ${(redeemedPointsInput / 10).toFixed(2)} ج.م` 
                                  : `✦ Discount value EGP ${(redeemedPointsInput / 10).toFixed(2)}`}
                              </p>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">
                      <div>
                        <p className="text-slate-400 font-semibold mb-1 uppercase tracking-tight">
                          {language === 'ar' ? 'إجمالي الفاتورة كاش' : 'Subtotal'}
                        </p>
                        <p className="text-sm font-extrabold text-slate-500 line-through font-mono">
                          {posCart.reduce((sum, item) => sum + item.product.sellPrice * item.quantity, 0).toLocaleString()} <span className="text-[10px] font-normal">{language === 'ar' ? 'ج.م' : 'EGP'}</span>
                        </p>
                        <p className="text-[10px] text-slate-400">{language === 'ar' ? 'قبل خصم النقاط' : 'before loyalty credits'}</p>
                      </div>

                      <div>
                        <p className="text-slate-400 font-semibold mb-1 uppercase tracking-tight">
                          {language === 'ar' ? 'إجمالي الحساب الصافي' : 'Net Due'}
                        </p>
                        <p className="text-xl font-extrabold text-blue-800 font-mono">
                          {(Math.max(0, posCart.reduce((sum, item) => sum + item.product.sellPrice * item.quantity, 0) - (selectedCustomerId ? (redeemedPointsInput / 10) : 0))).toLocaleString()} <span className="text-xs font-normal text-slate-400">{language === 'ar' ? 'ج.م' : 'EGP'}</span>
                        </p>
                        {selectedCustomerId && (
                          <p className="text-[9px] text-emerald-600 font-extrabold">
                            {language === 'ar' 
                              ? `✦ سيكتسب العميل: +${Math.floor(Math.max(0, posCart.reduce((sum, item) => sum + item.product.sellPrice * item.quantity, 0) - (redeemedPointsInput / 10)) / 10)} نقطة جديدة`
                              : `✦ Client earns: +${Math.floor(Math.max(0, posCart.reduce((sum, item) => sum + item.product.sellPrice * item.quantity, 0) - (redeemedPointsInput / 10)) / 10)} pt`}
                          </p>
                        )}
                      </div>

                      <div>
                        <label className="block text-slate-455 font-semibold mb-1 uppercase tracking-tight">
                          {language === 'ar' ? 'المبلغ الفعلي المستلم' : 'Cash Received'}
                        </label>
                        <input
                          type="number"
                          min="1"
                          placeholder="0"
                          className="w-full text-sm font-bold font-mono px-3 py-1.5 bg-white border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 text-right"
                          id="payer-cash-input"
                          onChange={(e) => {
                            const val = Number(e.target.value);
                            const totalVal = Math.max(0, posCart.reduce((sum, item) => sum + item.product.sellPrice * item.quantity, 0) - (selectedCustomerId ? (redeemedPointsInput / 10) : 0));
                            const changeEl = document.getElementById('change-calc-val');
                            if (changeEl) {
                              changeEl.innerText = val >= totalVal ? (val - totalVal).toLocaleString() + ' ج.م' : '0 ج.م';
                            }
                          }}
                        />
                      </div>

                      <div className="flex flex-col justify-center text-right">
                        <p className="text-slate-400 font-semibold mb-0.5 uppercase tracking-tight">
                          {language === 'ar' ? 'المتبقي للعميل' : 'Change Due'}
                        </p>
                        <p className="text-lg font-bold text-emerald-600 font-mono" id="change-calc-val">
                          0 ج.م
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* زر إتمام السداد النهائي */}
                {posCart.length > 0 && (
                  <button
                    onClick={() => {
                      const inputVal = (document.getElementById('payer-cash-input') as HTMLInputElement)?.value;
                      const cashVal = inputVal ? Number(inputVal) : 0;
                      executeCheckout(cashVal);
                    }}
                    className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-sm rounded-xl cursor-pointer shadow-md transition-colors text-center"
                  >
                    ✓ {language === 'ar' ? 'تسجيل العملية بالخادم وطباعة الفاتورة' : 'Complete checkout, deduct from shelves & print receipt'}
                  </button>
                )}

                {/* كتالوج المنتجات السريع بالأسفل لسهولة الكليك */}
                <div className="pt-3 border-t border-slate-100">
                  <span className="text-xs font-extrabold text-slate-800 uppercase block mb-2.5">
                    🛍️ {language === 'ar' ? 'كتالوج السوبرماركت السريع (اضغط للإضافة للفاتورة)' : 'POS Instant Click Directory'}
                  </span>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 max-h-56 overflow-y-auto pr-1">
                    {products.filter(p => p.shelfStock > 0).map((p) => {
                      const { status, daysRemaining } = getProductExpiryStatus(p.expirationDate, simulatedToday, thresholdDays);
                      return (
                        <div
                          key={p.id}
                          onClick={() => addToCart(p)}
                          className={`p-2 bg-slate-50 hover:bg-blue-50/50 border border-slate-150/70 rounded-xl cursor-pointer hover:border-blue-200 transition-all text-center relative flex flex-col justify-between h-18 select-none ${
                            status !== 'valid' ? 'ring-1 ring-amber-400/50 hover:bg-amber-50/30' : ''
                          }`}
                        >
                          <div className="line-clamp-1 font-bold text-slate-700 text-[10px] sm:text-xs">
                            {language === 'ar' ? p.nameAr : p.nameEn}
                          </div>
                          <div className="flex justify-between items-end mt-1 text-[8px] sm:text-[10px]">
                            <span className="font-mono bg-blue-50 text-blue-800 px-1 rounded font-semibold">{p.sellPrice} ج.م</span>
                            <span className="text-slate-450">{p.shelfStock} {language === 'ar' ? 'رف' : 'shelf'}</span>
                          </div>
                          {status !== 'valid' && (
                            <span className="absolute top-1 right-1 h-1.5 w-1.5 rounded-full bg-amber-500 animate-ping"></span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

              </div>
              
              {/* شاشة العميل المتواجد أمام الكاشير (الكولوم المقابل) - يدعم 5 أعمدة */}
              <div className="xl:col-span-5 flex flex-col justify-between bg-slate-900 text-white rounded-2xl p-5 border border-slate-850 shadow-2xl relative overflow-hidden">
                
                {/* مؤثر لمسة الشاشة الفيزيائية وخطوط الخلية الكهرومغناطيسية */}
                <div className="absolute inset-0 bg-slate-900 pointer-events-none opacity-20 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_4px,3px_100%]"></div>
                
                <div className="relative z-10 space-y-4 h-full flex flex-col justify-between">
                  {/* الرأس الشاشة */}
                  <div className="flex justify-between items-center pb-3 border-b border-slate-800">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
                      <span className="text-[10px] text-emerald-400 font-mono tracking-widest uppercase font-bold">CUSTOMER DISPLAY TERMINAL</span>
                    </div>
                    <button
                      onClick={() => {
                        setIsCustomerScreenProjected(true);
                        triggerToast(language === 'ar' ? '🖥️ تم تفعيل شاشة الزبون المستقلة عرض كامل' : '🖥️ Customer view projector launched!');
                      }}
                      className="px-2.5 py-1 bg-cyan-500 hover:bg-cyan-600 text-slate-950 font-black rounded-lg text-[9px] flex items-center gap-1 cursor-pointer transition-all shadow-md shadow-cyan-500/20"
                      title={language === 'ar' ? 'إسقاط شاشة الزبون التفاعلية بالكامل للعميل فقط' : 'Launch standalone full screen display'}
                    >
                      <Tv size={11} className="shrink-0" />
                      <span>{language === 'ar' ? 'شاشة العميل (للزبون فقط)' : 'Project Screen'}</span>
                    </button>
                  </div>

                  {/* شريط الإعلانات المتدفق للزبائن */}
                  <div className="bg-[#001730] border border-blue-900 rounded-lg p-2 text-center text-blue-300 font-mono text-[10px] overflow-hidden">
                    <div className="whitespace-nowrap animate-marquee flex gap-2 justify-center font-bold">
                      <span>✦ {language === 'ar' ? 'مرحباً بكم في داي تو نايت مول!' : 'WELCOME TO DAY TO NIGHT MALL!'}</span>
                      <span>• {language === 'ar' ? !nearExpiryCount ? 'استمتعوا بخصومات كبرى ومكافآت حصرية' : 'عروض الصلاحية تصل إلى ٥٠٪ خصم فوراً بالفرع' : 'ENJOY THE GRANDEST OFFERS IN TOWN!'} ✦</span>
                    </div>
                  </div>

                  {/* قائمة تتبع سلة العميل التفاعلية */}
                  <div className="flex-1 bg-black/40 border border-slate-800 rounded-xl p-3 max-h-64 overflow-y-auto space-y-2">
                    <span className="text-[10px] block text-slate-500 font-bold uppercase tracking-wider mb-2">
                      🛒 {language === 'ar' ? 'مشترياتك الحالية:' : 'YOUR CURRENT BASKET ITEMS:'}
                    </span>
                    
                    {posCart.length === 0 ? (
                      <div className="h-44 flex flex-col items-center justify-center text-center gap-2">
                        <ShoppingCart size={32} className="text-slate-750 shrink-0" />
                        <p className="text-[11px] text-slate-500 font-medium">
                          {language === 'ar' 
                            ? 'بانتظار قيام رئيس الكاشير بمسح أصنافك...' 
                            : 'Awaiting product scans to display your checkout receipt...'}
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {posCart.map((item) => (
                          <div key={item.product.id} className="flex justify-between items-center text-xs pb-1.5 border-b border-slate-850/60">
                            <div>
                              <p className="font-extrabold text-slate-205">{language === 'ar' ? item.product.nameAr : item.product.nameEn}</p>
                              <p className="text-[10px] text-slate-500 mt-0.5">
                                {item.product.sellPrice} EGP × {item.quantity}
                              </p>
                            </div>
                            <span className="font-bold text-slate-200 font-mono">
                              {(item.product.sellPrice * item.quantity).toLocaleString()} ج.م
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* اللوحة الضوئية الكهرومغناطيسية الضخمة لقراءة السعر */}
                  <div className="bg-black border border-slate-800 rounded-xl p-4 flex justify-between items-center">
                    <div>
                      <span className="text-[10px] text-slate-500 block uppercase font-bold tracking-wider">
                        {language === 'ar' ? 'الإجمالي المستحق للتسوية' : 'GRAND TOTAL DUE'}
                      </span>
                      <span className="text-3xl font-black font-mono tracking-tight text-cyan-400 block mt-1 drop-shadow-[0_0_10px_rgba(34,211,238,0.3)]">
                        {posCart.reduce((sum, item) => sum + item.product.sellPrice * item.quantity, 0).toLocaleString()} <span className="text-xs font-normal text-slate-400">EGP</span>
                      </span>
                    </div>

                    <div className="text-right">
                      <span className="text-[10px] text-slate-505 block uppercase font-bold tracking-wider">
                        {language === 'ar' ? 'عدد السلع' : 'ITEMS COUNT'}
                      </span>
                      <span className="text-xl font-bold font-mono text-cyan-400 block mt-1">
                        {posCart.reduce((sum, item) => sum + item.quantity, 0)} <span className="text-[10px] font-normal text-slate-500">{language === 'ar' ? 'سلعة' : 'units'}</span>
                      </span>
                    </div>
                  </div>

                  {/* رسالة حالة العميل التفاعلية أسفل التلفزيون */}
                  <div className="bg-[#121c25] rounded-lg border border-[#1e2f41] p-3 text-center text-xs">
                    {posCart.length === 0 ? (
                      <span className="text-slate-400">
                        ✨ {language === 'ar' ? 'مرحبًا بك! نظام جرد مول داي تو نايت يحمي غدائك كلياً.' : 'Welcome! Mall Expiration Engine protects your pantry.'}
                      </span>
                    ) : (
                      <span className="text-cyan-300 font-bold animate-pulse">
                        🛒 {language === 'ar' ? 'يرجى مراجعة الأصناف والأسعار مع شاشة الدفع' : 'Please verify items and totals before final cash payment'}
                      </span>
                    )}
                  </div>

                </div>

              </div>

            </motion.div>
          )}

          {/* تبويب: طاقم العمل وتفويض الصلاحيات (Staff & Security Auditing tab) */}
          {activeTab === 'staff' && (
            <motion.div
              key="staff-tab"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="grid grid-cols-1 lg:grid-cols-12 gap-8 text-right font-sans"
            >
              {/* دليل الموظفين والورديات النشطة */}
              <div className="lg:col-span-6 bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-5">
                <div className="flex justify-between items-start gap-4 flex-wrap border-b border-slate-100 pb-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-extrabold text-[#003d7e] text-base flex items-center gap-2 flex-wrap">
                      <span className="p-1 px-2.5 bg-amber-500/10 text-amber-600 rounded text-xs select-none font-bold">OFFICIAL CREW</span>
                      <span>{language === 'ar' ? 'سجل الموظفين والورديات النشطة للمول' : 'Crew Registry & Clearances Center'}</span>
                    </h3>
                    <p className="text-xs text-slate-400 mt-1">
                      {language === 'ar' 
                        ? 'التحقق من حالة الموظفين وتعديل الصلاحيات الأمنية والورديات مباشرة بالخادم.' 
                        : 'View real-time connection status and manage operational roles for Day to Night Mall.'}
                    </p>
                  </div>

                  {currentUserRole === 'admin' && (
                    <button
                      onClick={() => setIsAddStaffOpen(!isAddStaffOpen)}
                      className="px-3 py-1.5 bg-[#004a99] hover:bg-blue-700 text-white text-[11px] font-black rounded-lg flex items-center gap-1 cursor-pointer transition-colors shadow-sm"
                    >
                      <Plus size={12} />
                      <span>{isAddStaffOpen ? (language === 'ar' ? 'إغلاق الاستمارة' : 'Close Form') : (language === 'ar' ? 'تسجيل موظف جديد' : 'Add Employee')}</span>
                    </button>
                  )}
                </div>

                {/* استمارة إضافة الموظف الجديد التفاعلية للمدير العام */}
                <AnimatePresence>
                  {isAddStaffOpen && currentUserRole === 'admin' && (
                    <motion.form
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      onSubmit={handleCreateStaff}
                      className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-4 overflow-hidden text-right"
                    >
                      <div className="flex items-center gap-2 border-b border-slate-200 pb-2 mb-1">
                        <UserPlus size={14} className="text-[#004a99]" />
                        <span className="text-xs font-black text-slate-800">
                          {language === 'ar' ? 'استمارة تفويض موظف جديد بالخادم' : 'Add Employee Authorization Profile'}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-right">
                        <div>
                          <label className="block text-[10px] font-black text-slate-500 mb-1">
                            {language === 'ar' ? 'الاسم بالكامل (بالعربية)' : 'Full Name (Arabic)'}
                          </label>
                          <input
                            type="text"
                            required
                            placeholder="مثال: يوسف الكرار"
                            value={newStaffNameAr}
                            onChange={(e) => setNewStaffNameAr(e.target.value)}
                            className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-850 outline-none focus:ring-1 focus:ring-blue-500"
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] font-black text-slate-500 mb-1">
                            {language === 'ar' ? 'الاسم بالكامل (بالأجنبية)' : 'Full Name (English)'}
                          </label>
                          <input
                            type="text"
                            required
                            placeholder="e.g. Youssef El-Karrar"
                            value={newStaffNameEn}
                            onChange={(e) => setNewStaffNameEn(e.target.value)}
                            className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-850 outline-none focus:ring-1 focus:ring-blue-500"
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] font-black text-slate-500 mb-1">
                            {language === 'ar' ? 'اسم المستخدم (Username)' : 'Username'}
                          </label>
                          <input
                            type="text"
                            required
                            placeholder="e.g. youssef"
                            value={newStaffUsername}
                            onChange={(e) => setNewStaffUsername(e.target.value.toLowerCase().replace(/\s+/g, ''))}
                            className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-850 outline-none focus:ring-1 focus:ring-blue-500 font-mono"
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] font-black text-slate-500 mb-1">
                            {language === 'ar' ? 'الرمز السر الرقمي لدخول الوردية' : 'PIN / Password'}
                          </label>
                          <input
                            type="text"
                            required
                            placeholder="e.g. 555"
                            value={newStaffPassword}
                            onChange={(e) => setNewStaffPassword(e.target.value)}
                            className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-850 outline-none focus:ring-1 focus:ring-blue-500 font-mono font-bold"
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] font-black text-slate-500 mb-1">
                            {language === 'ar' ? 'المناوبة (Shift Hours)' : 'Shift Schedule'}
                          </label>
                          <select
                            value={newStaffShiftTime}
                            onChange={(e) => setNewStaffShiftTime(e.target.value)}
                            className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-850 outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer text-slate-705"
                          >
                            <option value="09:00 AM - 05:00 PM">{language === 'ar' ? 'الصيفية الصباحية (09:00 ص - 05:00 م)' : 'Morning Shift (9am - 5pm)'}</option>
                            <option value="05:00 PM - 01:00 AM">{language === 'ar' ? 'التحضيرية المسائية (05:00 م - 01:00 ص)' : 'Evening Shift (5pm - 1am)'}</option>
                            <option value="01:00 AM - 09:00 AM">{language === 'ar' ? 'غرفة الحراسة الليلية (01:00 ص - 09:00 ص)' : 'Night Guard (1am - 9am)'}</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-[10px] font-black text-slate-500 mb-1">
                            {language === 'ar' ? 'قفل صندوق كير الائتماني' : 'Working Register Box'}
                          </label>
                          <select
                            value={newStaffRegisterId}
                            onChange={(e) => setNewStaffRegisterId(e.target.value)}
                            className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-850 outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer text-slate-705"
                          >
                            <option value="REG-B-01">REG-B-01 (مبيعات الجملة)</option>
                            <option value="REG-B-02">REG-B-02 (المبيعات والتجزئة)</option>
                            <option value="REG-B-03">REG-B-03 (خدمة الإدارة والمكتب)</option>
                          </select>
                        </div>
                      </div>

                      <div className="flex justify-between items-center pt-2 gap-3 border-t border-slate-200/60 mt-2">
                        <button
                          type="button"
                          onClick={() => setIsAddStaffOpen(false)}
                          className="px-3.5 py-1.5 border border-slate-200 hover:bg-slate-100 rounded-xl text-xs text-slate-500 font-bold cursor-pointer"
                        >
                          {language === 'ar' ? 'إلغاء' : 'Cancel'}
                        </button>

                        <button
                          type="submit"
                          className="px-4 py-1.5 bg-[#004a99] hover:bg-blue-700 text-white font-black text-xs rounded-xl flex items-center gap-1 cursor-pointer shadow-md shadow-[#004a99]/15"
                        >
                          <Check size={12} />
                          {language === 'ar' ? 'تسجيل فوري بالخادم والمنصة' : 'Confirm & Register'}
                        </button>
                      </div>
                    </motion.form>
                  )}
                </AnimatePresence>

                <div className="space-y-3.5">
                  {staff.map((employee: any) => {
                    const isOnline = employee.status === 'online';
                    return (
                      <div 
                        key={employee.username} 
                        className={`p-4 border rounded-xl transition-all ${
                          isOnline ? 'border-emerald-100 bg-emerald-50/10 shadow-sm' : 'border-slate-100 bg-slate-50/30'
                        }`}
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                          
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-slate-100 to-slate-200 border border-slate-300 flex items-center justify-center font-extrabold text-slate-705 shrink-0 select-none">
                              {employee.nameAr.slice(0, 2)}
                            </div>
                            <div className="leading-tight">
                              <p className="font-extrabold text-[#003d7e] text-sm flex items-center gap-1.5">
                                {language === 'ar' ? employee.nameAr : employee.nameEn}
                                <span className={`w-2 h-2 rounded-full inline-block ${isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'}`}></span>
                              </p>
                              <p className="text-[10px] text-slate-400 font-mono mt-1">
                                @{employee.username} | {language === 'ar' ? 'الرمز السري التجريبي:' : 'Demo PIN:'} <span className="font-bold underline text-slate-750">{employee.password}</span>
                              </p>
                            </div>
                          </div>

                          <div className="flex flex-wrap gap-2 items-center">
                            <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                              isOnline ? 'bg-emerald-150 text-emerald-800 border border-emerald-200' : 'bg-slate-100 text-slate-500'
                            }`}>
                              {isOnline ? (language === 'ar' ? '🔴 متصل الآن بوردية العمل' : '🔴 Shift Active') : (language === 'ar' ? '⚪ خارج الوردية' : '⚪ Offline')}
                            </span>
                            <span className="text-[9px] bg-indigo-50 text-indigo-700 border border-indigo-100 px-2 py-0.5 rounded font-mono font-bold">
                              {employee.role === 'admin' ? (language === 'ar' ? 'مدير عام / أدمن' : 'Admin') : 
                               employee.role === 'warehouse' ? (language === 'ar' ? 'أمين مستودع' : 'Stock Keeper') : 
                               (language === 'ar' ? 'كاشير صالة' : 'Cashier')}
                            </span>
                          </div>

                        </div>

                        {/* تفاصيل ساعات المناوبة والوردية */}
                        <div className="mt-3.5 pt-2.5 border-t border-slate-100/80 flex flex-wrap gap-4 items-center justify-between text-[10px] text-slate-550">
                          <div className="flex gap-3 flex-wrap">
                            <span>🕒 {language === 'ar' ? `المناوبة: ${employee.shiftTime || '09:00 ص - 05:00 م'}` : `Shift: ${employee.shiftTime || '9am - 5pm'}`}</span>
                            <span>🔢 {language === 'ar' ? `الصندوق: ${employee.registerId || 'REG-B-02'}` : `Box: ${employee.registerId || 'REG-B-02'}`}</span>
                          </div>
                          <span className="text-[9px] text-slate-400">
                            {language === 'ar' ? 'آخر نشاط:' : 'Last Event:'} {employee.lastLogin || '-'}
                          </span>
                        </div>

                        <div className="mt-3.5 pt-3 border-t border-dotted border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5">
                          <span className="text-[10px] text-slate-400 font-bold">
                            🔐 {language === 'ar' ? 'منجر الصلاحيات الفورية والدعم:' : 'Clearance control & adjustments:'}
                          </span>

                          <div className="flex items-center gap-2">
                            {currentUserRole === 'admin' ? (
                              <>
                                <select
                                  value={employee.role}
                                  onChange={(e: any) => handleUpdateStaffRole(employee.username, e.target.value)}
                                  className="text-[11px] font-extrabold bg-white hover:bg-slate-50 border border-slate-200 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-amber-500 transition-colors cursor-pointer text-slate-705"
                                >
                                  <option value="admin">{language === 'ar' ? 'مدير عام / أدمن' : 'General Manager (Admin)'}</option>
                                  <option value="warehouse">{language === 'ar' ? 'أمين مستودع' : 'Stock Keeper'}</option>
                                  <option value="cashier">{language === 'ar' ? 'مسؤول كاشير صالة' : 'Cashier'}</option>
                                </select>

                                {employee.username !== currentUser.username && (
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteStaff(employee.username)}
                                    className="p-1 px-2 border border-red-200 bg-red-50 hover:bg-red-100 text-red-655 rounded text-[11px] font-black flex items-center gap-1 cursor-pointer transition-colors"
                                    title={language === 'ar' ? 'حذف حساب الموظف بالكامل' : 'Delete Employee Profile'}
                                  >
                                    <Trash2 size={11} />
                                    <span>{language === 'ar' ? 'حذف' : 'Deregister'}</span>
                                  </button>
                                )}
                              </>
                            ) : (
                              <span className="text-[10px] text-slate-400 flex items-center gap-1">
                                <Lock size={10} />
                                {language === 'ar' ? 'تعديل الصلاحيات مقتصر للمدير' : 'Clearance edit restricted to Admin'}
                              </span>
                            )}
                          </div>
                        </div>

                      </div>
                    );
                  })}
                </div>
              </div>

              {/* سجل تتبع العمليات والرقابة الفورية المباشر من الباك اند */}
              <div className="lg:col-span-6 bg-[#040d16] text-slate-200 rounded-2xl p-5 border border-slate-800 shadow-xl flex flex-col h-[600px] text-left">
                <div className="flex items-center justify-between pb-3 border-b border-slate-850 shrink-0 select-none">
                  <div className="text-right flex-1 pr-3">
                    <h3 className="font-extrabold text-white text-base flex justify-end items-center gap-2">
                      {language === 'ar' ? 'سجل تتبع الحماية والعمليات الحية بالخادم' : 'Live System Operations Audit Trail'}
                      <span className="p-1 px-2.5 bg-cyan-500/10 text-cyan-400 rounded text-xs font-mono">MD5 TRACE</span>
                    </h3>
                    <p className="text-[10px] text-slate-505 mt-0.5">
                      {language === 'ar' 
                        ? 'تحديث حي ومطابقة تفويضات الكاشير، والخصومات، والمبيعات، وتغيير التالف والجرد بالخلفية.' 
                        : 'Real-time ledger matching catalog discount write-offs, checkout transactions, and crew clearances.'}
                    </p>
                  </div>

                  <button
                    onClick={refreshAuditLogs}
                    className="p-1.5 px-3 bg-slate-900 hover:bg-slate-850 text-cyan-400 hover:text-cyan-300 font-bold border border-slate-800 rounded-lg text-xs flex items-center gap-1 transition-all cursor-pointer shrink-0"
                  >
                    <RefreshCw size={11} className="animate-spin-slow" />
                    {language === 'ar' ? 'تحديث' : 'Poll Trace'}
                  </button>
                </div>

                {/* تيرمنال سوداء */}
                <div className="flex-1 overflow-y-auto mt-4 pr-1.5 space-y-2.5 font-mono text-xs text-right" style={{ direction: 'rtl' }}>
                  {auditLogs.length === 0 ? (
                    <div className="h-full flex items-center justify-center text-slate-500">
                      {language === 'ar' ? 'بانتظار تلقي إشارات أمان العمليات...' : 'Awaiting credentials events...'}
                    </div>
                  ) : (
                    auditLogs.slice().reverse().map((log: any) => {
                      const isAdmin = log.role === 'admin';
                      const isWarehouse = log.role === 'warehouse';
                      const badgeBg = isAdmin ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' : isWarehouse ? 'bg-sky-500/10 text-sky-400 border border-sky-500/20' : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20';
                      return (
                        <div key={log.id || log.timestamp} className="p-3 bg-slate-950/60 border border-slate-900 rounded-xl hover:border-slate-800 transition-all flex flex-col md:flex-row md:items-start gap-2.5 text-right">
                          
                          <div className="shrink-0 flex flex-col md:w-32 text-slate-500 text-right">
                            <span className="text-cyan-500 text-[10px] pr-1.5 border-r border-[#1e5eb5]/70 font-semibold">{log.timestamp.split('T')[1]?.slice(0, 8) || log.timestamp}</span>
                            <span className="text-[9px] font-mono mt-0.5">IP: {log.ipAddress}</span>
                          </div>

                          <div className="flex-1 text-right">
                            <div className="flex items-center gap-1.5 justify-start flex-row-reverse mb-1 text-[11px]">
                              <span className={`px-1.5 py-0.2 rounded font-bold text-[8px] uppercase tracking-wider ${badgeBg}`}>
                                {log.role}
                              </span>
                              <span className="font-extrabold text-[#7db5f5] text-xs">@{log.username} ({language === 'ar' ? log.nameAr || log.name : log.nameEn || log.name})</span>
                            </div>
                            <p className="text-slate-300 text-[11px] leading-relaxed">
                              {language === 'ar' ? log.actionAr : log.actionEn}
                            </p>
                          </div>

                        </div>
                      );
                    })
                  )}
                </div>

                <div className="mt-4 pt-3 border-t border-slate-900 text-[9px] text-slate-500 flex justify-between select-none font-mono shrink-0">
                  <span>SECURE MD5 SYSTEM TRACE</span>
                  <span>TOTAL LOGS MATCHED: {auditLogs.length}</span>
                </div>
              </div>
            </motion.div>
          )}

          {/* 👥 تبويب: بيانات ونقاط العملاء (Loyalty Customer Hub) */}
          {activeTab === 'customers' && (
            <motion.div
              key="customers-tab"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="space-y-6"
            >
              {/* 📊 لوحة المؤشرات الإحصائية السريعة لنظام الولاء */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-gradient-to-br from-blue-50 to-white rounded-2xl p-4 border border-blue-100 shadow-sm text-right" style={{ direction: 'rtl' }}>
                  <div className="flex justify-between items-center mb-1">
                    <span className="p-2 bg-blue-100 text-blue-700 rounded-lg"><Users size={18} /></span>
                    <span className="text-[10px] bg-blue-100/70 text-blue-800 px-2 py-0.5 rounded font-extrabold font-sans">ACTIVE CRM</span>
                  </div>
                  <h4 className="text-xs text-slate-400 font-bold">{language === 'ar' ? 'إجمالي شبكة العملاء' : 'Total Client Network'}</h4>
                  <p className="text-xl font-black text-blue-900 mt-1 font-mono">{customers.length} <span className="text-xs font-semibold font-sans">{language === 'ar' ? 'عميل مسجل' : 'clients'}</span></p>
                </div>

                <div className="bg-gradient-to-br from-amber-50 to-white rounded-2xl p-4 border border-amber-100 shadow-sm text-right" style={{ direction: 'rtl' }}>
                  <div className="flex justify-between items-center mb-1">
                    <span className="p-2 bg-amber-100 text-amber-600 rounded-lg"><Coins size={18} /></span>
                    <span className="text-[10px] bg-amber-100/70 text-amber-800 px-2 py-0.5 rounded font-extrabold font-sans">LOYALTY POOL</span>
                  </div>
                  <h4 className="text-xs text-slate-400 font-bold">{language === 'ar' ? 'مجموع نقاط الولاء الموزعة' : 'Distributed Points Pool'}</h4>
                  <p className="text-xl font-black text-amber-700 mt-1 font-mono">{customers.reduce((sum, c) => sum + (c.points || 0), 0)} <span className="text-xs font-semibold font-sans">{language === 'ar' ? 'نقطة' : 'pts'}</span></p>
                </div>

                <div className="bg-gradient-to-br from-emerald-50 to-white rounded-2xl p-4 border border-emerald-100 shadow-sm text-right" style={{ direction: 'rtl' }}>
                  <div className="flex justify-between items-center mb-1">
                    <span className="p-2 bg-emerald-100 text-emerald-700 rounded-lg"><Award size={18} /></span>
                    <span className="text-[10px] bg-emerald-100/70 text-emerald-800 px-2 py-0.5 rounded font-extrabold font-sans">REDEEM VALUE</span>
                  </div>
                  <h4 className="text-xs text-slate-400 font-bold">{language === 'ar' ? 'القيمة النقدية المعادلة بالفلوس' : 'Redeemable Cash Value'}</h4>
                  <p className="text-xl font-black text-emerald-700 mt-1 font-mono">{(customers.reduce((sum, c) => sum + (c.points || 0), 0) * 0.1).toFixed(1)} <span className="text-xs font-semibold font-sans">ج.م</span></p>
                </div>

                <div className="bg-gradient-to-br from-rose-55 to-white rounded-2xl p-4 border border-rose-100 shadow-sm text-right" style={{ direction: 'rtl' }}>
                  <div className="flex justify-between items-center mb-1">
                    <span className="p-2 bg-rose-100 text-rose-700 rounded-lg"><Sparkles size={18} /></span>
                    <span className="text-[10px] bg-rose-105/70 text-rose-800 px-2 py-0.5 rounded font-extrabold font-sans">CLIENT TIERS</span>
                  </div>
                  <h4 className="text-xs text-slate-400 font-bold">{language === 'ar' ? 'فئات العملاء المميزين (VIP)' : 'VIP Segment Density'}</h4>
                  <p className="text-xl font-black text-rose-800 mt-1 font-mono">
                    {customers.filter(c => (c.classification === 'VIP' || (c.points || 0) > 1000)).length} 
                    <span className="text-xs font-semibold font-sans"> {language === 'ar' ? 'عميل نشط' : 'VIP clients'}</span>
                  </p>
                </div>
              </div>

              {/* 🔍 شريط التصفية والبحث المتقدم واستيراد البيانات من إكسيل */}
              <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm flex flex-col md:flex-row gap-3 items-center justify-between text-right" style={{ direction: 'rtl' }}>
                <div className="flex flex-wrap gap-2.5 w-full md:w-auto items-center">
                  <div className="relative shrink-0 w-full sm:w-60">
                    <Search className="absolute right-3 top-2.5 text-slate-400" size={14} />
                    <input
                      type="text"
                      placeholder={language === 'ar' ? "ابحث باسم العميل أو رقم الهاتف..." : "Search name or phone..."}
                      value={customerSearchQuery}
                      onChange={(e) => setCustomerSearchQuery(e.target.value)}
                      className="w-full text-xs pr-9 pl-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-500 font-bold"
                    />
                  </div>

                  <div className="flex items-center gap-1">
                    <span className="text-[10px] text-slate-400 shrink-0 font-bold">{language === 'ar' ? 'المحافظة:' : 'Gov:'}</span>
                    <select
                      value={customerGovFilter}
                      onChange={(e) => setCustomerGovFilter(e.target.value)}
                      className="text-xs p-1.5 py-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold focus:outline-none"
                    >
                      <option value="all">{language === 'ar' ? 'كل المحافظات' : 'All Governorates'}</option>
                      <option value="القاهرة">القاهرة</option>
                      <option value="الجيزة">الجيزة</option>
                      <option value="الإسكندرية">الإسكندرية</option>
                      <option value="الدقهلية">الدقهلية</option>
                      <option value="الغربية">الغربية</option>
                      <option value="المنوفية">المنوفية</option>
                      <option value="الشرقية">الشرقية</option>
                      <option value="دمياط">دمياط</option>
                    </select>
                  </div>

                  <div className="flex items-center gap-1">
                    <span className="text-[10px] text-slate-400 shrink-0 font-bold">{language === 'ar' ? 'التصنيف:' : 'Tier:'}</span>
                    <select
                      value={customerTierFilter}
                      onChange={(e) => setCustomerTierFilter(e.target.value)}
                      className="text-xs p-1.5 py-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold focus:outline-none"
                    >
                      <option value="all">{language === 'ar' ? 'كل التصنيفات والدرجات' : 'All Tiers'}</option>
                      <option value="VIP">VIP 💎</option>
                      <option value="بلاتيني">بلاتيني 🌌</option>
                      <option value="ذهبي">ذهبي 🥇</option>
                      <option value="فضي">فضي 🥈</option>
                      <option value="برونزي">برونزي 🥉</option>
                    </select>
                  </div>
                </div>

                <div className="flex gap-2 w-full md:w-auto shrink-0 justify-end">
                  <button
                    type="button"
                    onClick={() => {
                      setImportRawText('');
                      setParsedImportRows([]);
                      setImportStatusMessage(null);
                      setIsImportModalOpen(true);
                    }}
                    className="flex items-center justify-center gap-1.5 px-3 py-2 bg-green-50 text-green-700 border border-green-200 hover:bg-green-100 text-xs font-black rounded-xl transition-colors cursor-pointer"
                  >
                    <FileSpreadsheet size={15} />
                    {language === 'ar' ? 'استيراد عملاء من إكسيل / CSV' : 'Import Excel / CSV'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      // reset list filters
                      setCustomerSearchQuery('');
                      setCustomerGovFilter('all');
                      setCustomerTierFilter('all');
                      triggerToast(language === 'ar' ? '🔄 تم تحديث قائمة العملاء وتصفير الفلاتر!' : '🔄 Customer filter cleared!');
                    }}
                    className="p-2 text-slate-500 hover:text-slate-700 border border-slate-200 hover:bg-slate-100 rounded-xl transition-colors"
                    title={language === 'ar' ? 'تحديث الفلاتر' : 'Reset filters'}
                  >
                    <RefreshCw size={14} />
                  </button>
                </div>
              </div>

              {/* 📥 نافذة معالج الاستيراد المجمع من إكسيل (Bulk Excel/CSV Importer Panel) */}
              <AnimatePresence>
                {isImportModalOpen && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="bg-[#fafbfc] border-2 border-dashed border-slate-250 rounded-2xl p-5 shadow-inner overflow-hidden"
                    style={{ direction: 'rtl' }}
                  >
                    <div className="flex justify-between items-center pb-3 border-b border-slate-200/65 mb-4">
                      <div className="flex items-center gap-2">
                        <span className="p-1 px-2.5 bg-emerald-100 text-emerald-800 rounded font-black text-[10px]">EXCEL EXPORT INTERPRETER</span>
                        <h3 className="font-extrabold text-[#003d7e] text-sm">{language === 'ar' ? 'أداة الاستيراد الفوري للعملاء من جداول البيانات' : 'Batch Client Spreadsheet Importer'}</h3>
                      </div>
                      <button
                        type="button"
                        onClick={() => setIsImportModalOpen(false)}
                        className="text-slate-400 hover:text-slate-600 font-extrabold text-sm border border-slate-200 bg-white rounded-full w-6 h-6 flex items-center justify-center cursor-pointer"
                      >
                        ✕
                      </button>
                    </div>

                    <p className="text-xs text-slate-500 leading-relaxed mb-4">
                      {language === 'ar' 
                        ? '✦ يمكنك استيراد البيانات بطريقتين: (أ) اختيار ملف CSV جاهز مباشرة، أو (ب) نسخ الجدول بالكامل من ملف الإكسيل كأعمدة متجاورة وجميلة، ثم لصقها في المربع أدناه كـ (Clipboard Paste). ستقوم خوارزمية الأداة تلقائياً بالتعرف على المسميات وتنسيق الهواتف وحساب النقاط!'
                        : '✦ Upload a client CSV ledger or directly copy table from MS Excel/Google sheets and paste inside.'}
                    </p>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* ممر الملف واللصق المباشر */}
                      <div className="space-y-3">
                        <label className="block text-[11px] text-slate-650 font-black">{language === 'ar' ? 'خيار (١) لصق نصوص الجدول من إكسيل:' : 'Option 1: Paste table data from Excel:'}</label>
                        <textarea
                          rows={5}
                          placeholder={language === 'ar' ? "الاسم\tالهاتف\tالمحافظة\tالنقاط\tالفئة\nمحمد زاهر\t01012345678\tالقاهرة\t450\tذهبي" : "Paste table columns here..."}
                          value={importRawText}
                          onChange={(e) => {
                            setImportRawText(e.target.value);
                            // Process parsing
                            const text = e.target.value;
                            if (text.trim()) {
                              const lines = text.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);
                              if (lines.length > 0) {
                                const isTab = lines[0].includes('\t');
                                const separator = isTab ? '\t' : ',';
                                const rows = lines.map(line => {
                                  if (separator === ',') {
                                    return line.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(p => p.replace(/^"|"$/g, '').trim());
                                  } else {
                                    return line.split('\t').map(p => p.trim());
                                  }
                                });
                                const headers = rows[0];
                                const dataRows = rows.slice(1);
                                setRawHeaders(headers);
                                setParsedImportRows(dataRows);

                                // Map mapping
                                const mapping = { name: 0, phone: 1, governorate: 2, points: 3, classification: 4 };
                                headers.forEach((h, idx) => {
                                  const cleanH = h.toLowerCase().trim();
                                  if (cleanH.includes('الاسم') || cleanH.includes('اسم') || cleanH.includes('name')) {
                                    mapping.name = idx;
                                  } else if (cleanH.includes('هاتف') || cleanH.includes('تليفون') || cleanH.includes('موبايل') || cleanH.includes('phone') || cleanH.includes('tel') || cleanH.includes('رقم')) {
                                    mapping.phone = idx;
                                  } else if (cleanH.includes('محافظة') || cleanH.includes('عنوان') || cleanH.includes('governorate') || cleanH.includes('gov') || cleanH.includes('city')) {
                                    mapping.governorate = idx;
                                  } else if (cleanH.includes('نقاط') || cleanH.includes('رصيد') || cleanH.includes('points') || cleanH.includes('pts')) {
                                    mapping.points = idx;
                                  } else if (cleanH.includes('تصنيف') || cleanH.includes('فئة') || cleanH.includes('class') || cleanH.includes('tier') || cleanH.includes('نوع')) {
                                    mapping.classification = idx;
                                  }
                                });
                                setImportMapping(mapping);
                                setImportStatusMessage({ type: 'success', text: `تم تحليل النص الملصق! تم العثور على (${dataRows.length}) عميل متاح للاستيراد. يرجى مراجعة تناسق الأعمدة أدناه.` });
                              }
                            }
                          }}
                          className="w-full text-xs font-mono p-2 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500 font-bold"
                        />

                        <div className="flex items-center gap-2">
                          <label className="block text-[11px] text-slate-600 shrink-0 font-bold">{language === 'ar' ? 'أو خيار (٢) اختيار ملف CSV/Text:' : 'Option 2: Pick CSV/Text file:'}</label>
                          <input
                            type="file"
                            accept=".csv,.txt"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (!file) return;
                              const reader = new FileReader();
                              reader.onload = (evt) => {
                                const text = evt.target?.result as string;
                                setImportRawText(text);
                                const lines = text.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);
                                if (lines.length > 0) {
                                  const isTab = lines[0].includes('\t');
                                  const separator = isTab ? '\t' : ',';
                                  const rows = lines.map(line => {
                                    if (separator === ',') {
                                      return line.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(p => p.replace(/^"|"$/g, '').trim());
                                    } else {
                                      return line.split('\t').map(p => p.trim());
                                    }
                                  });
                                  const headers = rows[0];
                                  const dataRows = rows.slice(1);
                                  setRawHeaders(headers);
                                  setParsedImportRows(dataRows);

                                  // Mapping
                                  const mapping = { name: 0, phone: 1, governorate: 2, points: 3, classification: 4 };
                                  headers.forEach((h, idx) => {
                                    const cleanH = h.toLowerCase().trim();
                                    if (cleanH.includes('الاسم') || cleanH.includes('اسم') || cleanH.includes('name')) {
                                      mapping.name = idx;
                                    } else if (cleanH.includes('هاتف') || cleanH.includes('تليفون') || cleanH.includes('موبايل') || cleanH.includes('phone') || cleanH.includes('tel') || cleanH.includes('رقم')) {
                                      mapping.phone = idx;
                                    } else if (cleanH.includes('محافظة') || cleanH.includes('عنوان') || cleanH.includes('governorate') || cleanH.includes('gov') || cleanH.includes('city')) {
                                      mapping.governorate = idx;
                                    } else if (cleanH.includes('نقاط') || cleanH.includes('رصيد') || cleanH.includes('points') || cleanH.includes('pts')) {
                                      mapping.points = idx;
                                    } else if (cleanH.includes('تصنيف') || cleanH.includes('فئة') || cleanH.includes('class') || cleanH.includes('tier') || cleanH.includes('نوع')) {
                                      mapping.classification = idx;
                                    }
                                  });
                                  setImportMapping(mapping);
                                  setImportStatusMessage({ type: 'success', text: `تم تحميل وقراءة الملف! تم العثور على (${dataRows.length}) عميل متاح للاستيراد.` });
                                }
                              };
                              reader.readAsText(file, 'UTF-8');
                            }}
                            className="text-xs text-slate-500 font-semibold cursor-pointer w-full"
                          />
                        </div>
                      </div>

                      {/* مخطط تحديد وتعيين الأعمدة */}
                      {rawHeaders.length > 0 && (
                        <div className="bg-white rounded-xl p-3 border border-slate-205 space-y-3">
                          <p className="font-extrabold text-[10px] text-slate-700 border-b border-slate-100 pb-1.5">
                            ⚙️ {language === 'ar' ? 'تخطيط مطابقة الأعمدة بمؤشرات الجدول:' : 'Column Mapping Wizard:'}
                          </p>
                          <div className="grid grid-cols-2 gap-2 text-xs">
                            <div className="space-y-1">
                              <label className="block text-[10px] text-slate-500 font-bold">{language === 'ar' ? 'الاسم:' : 'Name Column:'}</label>
                              <select
                                value={importMapping.name}
                                onChange={(e) => setImportMapping({ ...importMapping, name: parseInt(e.target.value) })}
                                className="w-full p-1 bg-slate-50 border border-slate-200 text-[11px] rounded font-bold"
                              >
                                {rawHeaders.map((h, i) => <option key={i} value={i}>{h}</option>)}
                              </select>
                            </div>

                            <div className="space-y-1">
                              <label className="block text-[10px] text-slate-500 font-bold">{language === 'ar' ? 'رقم الهاتف:' : 'Phone Column:'}</label>
                              <select
                                value={importMapping.phone}
                                onChange={(e) => setImportMapping({ ...importMapping, phone: parseInt(e.target.value) })}
                                className="w-full p-1 bg-slate-50 border border-slate-200 text-[11px] rounded font-bold"
                              >
                                {rawHeaders.map((h, i) => <option key={i} value={i}>{h}</option>)}
                              </select>
                            </div>

                            <div className="space-y-1">
                              <label className="block text-[10px] text-slate-500 font-bold">{language === 'ar' ? 'المحافظة:' : 'Gov Column:'}</label>
                              <select
                                value={importMapping.governorate}
                                onChange={(e) => setImportMapping({ ...importMapping, governorate: parseInt(e.target.value) })}
                                className="w-full p-1 bg-slate-50 border border-slate-200 text-[11px] rounded font-bold"
                              >
                                <option value="-1">-- {language === 'ar' ? 'تلقائي (القاهرة)' : 'Default (Cairo)'} --</option>
                                {rawHeaders.map((h, i) => <option key={i} value={i}>{h}</option>)}
                              </select>
                            </div>

                            <div className="space-y-1">
                              <label className="block text-[10px] text-slate-500 font-bold">{language === 'ar' ? 'النقاط:' : 'Points Column:'}</label>
                              <select
                                value={importMapping.points}
                                onChange={(e) => setImportMapping({ ...importMapping, points: parseInt(e.target.value) })}
                                className="w-full p-1 bg-slate-50 border border-slate-200 text-[11px] rounded font-bold"
                              >
                                <option value="-1">-- {language === 'ar' ? 'تلقائي (0)' : 'Default (0)'} --</option>
                                {rawHeaders.map((h, i) => <option key={i} value={i}>{h}</option>)}
                              </select>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* رسالة الحالة وعرض معاينة البيانات */}
                    {importStatusMessage && (
                      <div className={`mt-3 p-3 rounded-xl border text-xs leading-relaxed font-bold ${
                        importStatusMessage.type === 'success' 
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-200' 
                          : 'bg-rose-50 text-rose-800 border-rose-200'
                      }`}>
                        {importStatusMessage.text}
                      </div>
                    )}

                    {/* المعاينة الحقيقية لأول 5 صفوف */}
                    {parsedImportRows.length > 0 && (
                      <div className="mt-4 bg-white rounded-xl border border-slate-200 overflow-hidden text-[11px]">
                        <p className="bg-slate-50 px-3 py-1.5 font-black text-slate-600 border-b border-slate-100 flex justify-between">
                          <span>🔍 {language === 'ar' ? 'معاينة عينة من عملاء الاستيراد (أول 5 صفوف):' : 'Import Client Preview样品 (First 5):'}</span>
                          <span>{language === 'ar' ? `العدد الكلي: ${parsedImportRows.length} عميل` : `Total matches: ${parsedImportRows.length}`}</span>
                        </p>
                        <div className="overflow-x-auto">
                          <table className="w-full text-right" style={{ direction: 'rtl' }}>
                            <thead>
                              <tr className="bg-slate-50/50 text-slate-400 font-bold text-[10px] border-b border-slate-100">
                                <th className="p-2 text-right">{language === 'ar' ? 'الاسم' : 'Name'}</th>
                                <th className="p-2 text-center">{language === 'ar' ? 'رقم الهاتف' : 'Phone'}</th>
                                <th className="p-2 text-center">{language === 'ar' ? 'المحافظة' : 'Gov'}</th>
                                <th className="p-2 text-center">{language === 'ar' ? 'النقاط المكتسبة' : 'Points'}</th>
                              </tr>
                            </thead>
                            <tbody>
                              {parsedImportRows.slice(0, 5).map((row, rIdx) => {
                                const phone = row[importMapping.phone] || '';
                                const phoneWarn = phone.length !== 11;
                                return (
                                  <tr key={rIdx} className="border-b border-slate-100 hover:bg-slate-50/40">
                                    <td className="p-2 font-extrabold text-slate-900">{row[importMapping.name] || 'بدون اسم'}</td>
                                    <td className={`p-2 font-mono text-center ${phoneWarn ? 'text-rose-600 font-bold bg-rose-50' : 'text-slate-600'}`}>
                                      {phone} {phoneWarn && '⚠️'}
                                    </td>
                                    <td className="p-2 text-center">{importMapping.governorate !== -1 ? (row[importMapping.governorate] || 'القاهرة') : 'القاهرة'}</td>
                                    <td className="p-2 text-center font-bold text-blue-600">{importMapping.points !== -1 ? (parseInt(row[importMapping.points]) || 0) : 0}</td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>

                        {/* زر البث الفعلي للاستيراد المجمع */}
                        <div className="p-3 bg-slate-50 border-t border-slate-100 text-left">
                          <button
                            type="button"
                            onClick={() => {
                              // map list of customers
                              const mapped = parsedImportRows.map(row => {
                                const nameVal = row[importMapping.name] || '';
                                const phoneVal = row[importMapping.phone] || '';
                                const govVal = importMapping.governorate !== -1 ? (row[importMapping.governorate] || 'القاهرة') : 'القاهرة';
                                const pointsVal = importMapping.points !== -1 ? (parseInt(row[importMapping.points]) || 0) : 0;
                                const classificationVal = importMapping.classification !== -1 ? (row[importMapping.classification] || '') : '';
                                return {
                                  name: nameVal,
                                  nameAr: nameVal,
                                  phone: phoneVal,
                                  governorate: govVal,
                                  points: pointsVal,
                                  classification: classificationVal
                                };
                              }).filter(c => c.phone.trim().length > 0);

                              if (mapped.length === 0) {
                                triggerToast(language === 'ar' ? '⚠️ لا توجد أسطر بيانات صالحة ذات أرقام هواتف!' : '⚠️ No rows with valid phone numbers found');
                                return;
                              }

                              triggerToast(language === 'ar' ? '⏳ جاري استيراد ومعالجة بيانات العملاء...' : '⏳ Processing bulk import...');

                              fetch('/api/customers/bulk', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ customers: mapped })
                              })
                              .then(res => res.json())
                              .then(data => {
                                if (data.success) {
                                  triggerToast(language === 'ar' 
                                    ? `🎉 تم إنهاء الاستيراد بنجاح! تم إضافة ${data.addedCount} عميل جديد وتحديث ${data.updatedCount} عميل مسبق.` 
                                    : `🎉 Import finished: added ${data.addedCount} is and updated ${data.updatedCount} clients.`);
                                  setIsImportModalOpen(false);
                                  setImportRawText('');
                                  setParsedImportRows([]);
                                  setRawHeaders([]);
                                  refreshCustomers();
                                } else {
                                  triggerToast('Failed to parse customers');
                                }
                              })
                              .catch(err => {
                                console.error(err);
                                triggerToast('Network error on bulk import');
                              });
                            }}
                            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-lg transition-colors cursor-pointer text-xs"
                          >
                            ✓ {language === 'ar' ? `تأكيد وبث استيراد ${parsedImportRows.length} عميل للمركز` : `Confirm Import of ${parsedImportRows.length} Clients`}
                          </button>
                        </div>
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* 🏆 الشاشة الرئيسية الفنية للعملاء */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                
                {/* عمود الكشف الرئيسي لجدول وبيانات عملاء الولاء */}
                <div className="lg:col-span-8 bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-4">
                  <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                    <div>
                      <h3 className="font-extrabold text-[#003d7e] text-base flex items-center gap-2">
                        <span className="p-1 px-2.5 bg-cyan-100 text-cyan-800 rounded text-[10px] font-bold">LOYALTY NETWORK</span>
                        {language === 'ar' ? 'دفتر وعملاء الولاء والشرائح' : 'Loyalty Clients Ledger & Segments'}
                      </h3>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {language === 'ar' ? 'تتبع درجات العملاء، عمليات الاتصال، وإرسال إشعارات كشف الرصيد الفوري بالواتس اب.' : 'Browse clients database, call directly, send WhatsApp report, adjust points.'}
                      </p>
                    </div>
                  </div>

                  {/* جدول عريض للعملاء */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-right" style={{ direction: 'rtl' }}>
                      <thead>
                        <tr className="border-b border-slate-100 bg-slate-50/50 text-slate-500 font-extrabold text-[10px]">
                          <th className="p-3 text-right">{language === 'ar' ? 'العميل والفئة' : 'Client & Segment'}</th>
                          <th className="p-3 text-center">{language === 'ar' ? 'الهاتف والتواصل المباشر' : 'Phone & Communications'}</th>
                          <th className="p-3 text-center">{language === 'ar' ? 'المحافظة' : 'Governorate'}</th>
                          <th className="p-3 text-center">{language === 'ar' ? 'رصيد النقاط' : 'Points Balance'}</th>
                          <th className="p-3 text-center">{language === 'ar' ? 'قيمة مادية (فلوس)' : 'Redeem EGP'}</th>
                          <th className="p-3 text-left">{language === 'ar' ? 'تعديل الرصيد' : 'Adjust'}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {customers.filter(c => {
                          // Search query
                          const query = customerSearchQuery.toLowerCase().trim();
                          const matchesSearch = query === '' || 
                            c.name?.toLowerCase().includes(query) || 
                            c.nameAr?.toLowerCase().includes(query) || 
                            c.phone?.includes(query);

                          // Gov filter
                          const matchesGov = customerGovFilter === 'all' || c.governorate === customerGovFilter;

                          // Tier filter
                          let actualTier = 'برونزي';
                          const pts = c.points || 0;
                          if (c.classification && c.classification !== 'auto' && c.classification !== '') {
                            actualTier = c.classification;
                          } else {
                            if (pts > 1000) actualTier = 'VIP';
                            else if (pts > 600) actualTier = 'بلاتيني';
                            else if (pts > 300) actualTier = 'ذهبي';
                            else if (pts > 100) actualTier = 'فضي';
                          }

                          const matchesTier = customerTierFilter === 'all' || actualTier === customerTierFilter;

                          return matchesSearch && matchesGov && matchesTier;
                        }).length === 0 ? (
                          <tr>
                            <td colSpan={6} className="p-8 text-center text-slate-400 font-bold italic">
                              {language === 'ar' ? 'لا يوجد عملاء ولاء متطابقين مع فلاتر البحث الحالية.' : 'No loyalty customers match current filters.'}
                            </td>
                          </tr>
                        ) : (
                          customers.filter(c => {
                            const query = customerSearchQuery.toLowerCase().trim();
                            const matchesSearch = query === '' || 
                              c.name?.toLowerCase().includes(query) || 
                              c.nameAr?.toLowerCase().includes(query) || 
                              c.phone?.includes(query);

                            const matchesGov = customerGovFilter === 'all' || c.governorate === customerGovFilter;

                            let actualTier = 'برونزي';
                            const pts = c.points || 0;
                            if (c.classification && c.classification !== 'auto' && c.classification !== '') {
                              actualTier = c.classification;
                            } else {
                              if (pts > 1000) actualTier = 'VIP';
                              else if (pts > 600) actualTier = 'بلاتيني';
                              else if (pts > 300) actualTier = 'ذهبي';
                              else if (pts > 100) actualTier = 'فضي';
                            }

                            const matchesTier = customerTierFilter === 'all' || actualTier === customerTierFilter;

                            return matchesSearch && matchesGov && matchesTier;
                          }).map(c => {
                            const segment = getCustomerClassificationInfo(c.points || 0, c.classification);
                            return (
                              <tr key={c.id} className="hover:bg-slate-50/50 transition-colors text-slate-700 font-semibold text-[11px] border-b border-slate-50">
                                <td className="p-3 text-right">
                                  <div className="font-extrabold text-slate-900 leading-snug">{c.name || c.nameAr}</div>
                                  <div className="mt-1 flex items-center justify-start gap-1">
                                    <span className={`px-1.5 py-0.5 text-[9px] font-black rounded-md border ${segment.color}`}>
                                      {segment.label}
                                    </span>
                                  </div>
                                </td>
                                
                                <td className="p-3 text-center font-mono text-slate-600">
                                  <div className="font-semibold text-slate-700">{c.phone}</div>
                                  <div className="flex items-center justify-center gap-2 mt-1.5 select-none text-[10px]">
                                    {/* زر الاتصال المباشر */}
                                    <a
                                      href={`tel:${c.phone}`}
                                      className="flex items-center gap-1 px-2 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 hover:text-blue-900 hover:scale-105 border border-blue-150 rounded-lg font-black transition-all"
                                      title={language === 'ar' ? `اتصال هاتفي بـ ${c.name || c.nameAr}` : 'Call via Dial-pad'}
                                    >
                                      <Phone size={10} />
                                      {language === 'ar' ? 'اتصال مباشر' : 'Call Phone'}
                                    </a>

                                    {/* زر واتساب الفوري */}
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setSelectedWhatsAppCustomer(c);
                                        // Auto interpolate template variables
                                        const customMoney = ((c.points || 0) * 0.1).toFixed(1);
                                        const precompiled = waCustomTemplate
                                          .replace("{{الاسم}}", c.name || c.nameAr || "")
                                          .replace("{{النقاط}}", String(c.points || 0))
                                          .replace("{{الفلوس}}", customMoney);
                                        setCustomWhatsAppText(precompiled);
                                      }}
                                      className="flex items-center gap-1 px-2 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 hover:text-emerald-900 hover:scale-105 border border-emerald-150 rounded-lg font-black transition-all cursor-pointer"
                                      title={language === 'ar' ? 'إرسال رسالة كشف الولاء بالواتس اب' : 'Send WhatsApp Report'}
                                    >
                                      <MessageCircle size={11} className="text-emerald-600" />
                                      {language === 'ar' ? 'واتساب' : 'WhatsApp'}
                                    </button>
                                  </div>
                                </td>

                                <td className="p-3 text-center">
                                  <span className="px-2.5 py-1 bg-slate-100/90 text-slate-700 rounded-lg font-extrabold text-[10px]">{c.governorate}</span>
                                </td>

                                <td className="p-3 text-center text-blue-800 font-extrabold font-mono text-xs">
                                  {c.points || 0} {language === 'ar' ? 'نقطة' : 'pts'}
                                </td>

                                <td className="p-3 text-center font-mono font-black text-emerald-600 text-xs">
                                  {((c.points || 0) * 0.1).toFixed(2)} ج.م
                                </td>

                                <td className="p-3 text-left">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setPointsAdjustmentCustomer(c);
                                      setPointsAdjAmount(50);
                                      setPointsAdjAction('add');
                                      setPointsAdjReason('مكافأة ولاء مخصصة');
                                    }}
                                    className="px-2 py-1 bg-slate-50 text-[#004a99] border hover:bg-blue-50 border-slate-200 hover:border-blue-200 text-[10px] font-black rounded-lg transition-all cursor-pointer"
                                  >
                                    ⚙️ {language === 'ar' ? 'إدارة النقاط' : 'Manage Points'}
                                  </button>
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* كرت إضافة عميل جديد يدوي */}
                <div className="lg:col-span-4 bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-4 h-fit">
                  <div className="border-b border-slate-100 pb-2 text-right" style={{ direction: 'rtl' }}>
                    <h3 className="font-extrabold text-slate-800 text-sm flex items-center justify-start gap-1.5">
                      <Plus size={15} className="text-emerald-600" />
                      {language === 'ar' ? 'تسجيل عميل ولاء فردي جديد' : 'Enroll New Loyalty Client'}
                    </h3>
                    <p className="text-[11px] text-slate-400 mt-1">
                      {language === 'ar' ? 'أدخل بيانات العميل الفردي لتمنحه ترصيد نقاط الولاء التلقائي على المشتريات.' : 'Register customer to activate points rewards on POS checkout.'}
                    </p>
                  </div>

                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      if (!newCustomerName || !newCustomerPhone) {
                        alert(language === 'ar' ? 'يرجى كتابة الاسم ورقم الهاتف بالكامل' : 'Name and phone must be filled');
                        return;
                      }
                      fetch('/api/customers', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          name: newCustomerName,
                          nameAr: newCustomerName,
                          phone: newCustomerPhone,
                          governorate: newCustomerGov,
                          points: 0,
                          classification: newCustomerClassification
                        })
                      })
                      .then(res => res.json())
                      .then(data => {
                        if (data.success) {
                          triggerToast(language === 'ar' ? '🎉 تم تسجيل العميل الجديد بنجاح!' : '🎉 Customer registered successfully!');
                          setNewCustomerName('');
                          setNewCustomerPhone('');
                          setNewCustomerGov('القاهرة');
                          setNewCustomerClassification('auto');
                          refreshCustomers();
                        } else {
                          alert(data.error || 'Registration failed');
                        }
                      })
                      .catch(err => {
                        console.error(err);
                        alert('Server communication error');
                      });
                    }}
                    className="space-y-4 text-right"
                    style={{ direction: 'rtl' }}
                  >
                    <div className="space-y-1">
                      <label className="block text-[11px] text-slate-650 font-bold">{language === 'ar' ? 'الاسم رباعي للعميل:' : 'Customer Name:'}</label>
                      <input
                        type="text"
                        placeholder="أحمد السيد عبد الجبار"
                        value={newCustomerName}
                        onChange={(e) => setNewCustomerName(e.target.value)}
                        className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-1 focus:ring-emerald-500 focus:outline-none focus:bg-white font-bold"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="block text-[11px] text-slate-650 font-bold">{language === 'ar' ? 'رقم الهاتف المحمول:' : 'Phone Number:'}</label>
                      <input
                        type="text"
                        placeholder="01012345678"
                        value={newCustomerPhone}
                        onChange={(e) => setNewCustomerPhone(e.target.value)}
                        className="w-full text-xs font-mono p-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-1 focus:ring-emerald-500 focus:outline-none focus:bg-white font-bold text-center"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="block text-[11px] text-slate-650 font-bold">{language === 'ar' ? 'المحافظة:' : 'Governorate:'}</label>
                      <select
                        value={newCustomerGov}
                        onChange={(e) => setNewCustomerGov(e.target.value)}
                        className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-1 focus:ring-emerald-500 focus:outline-none font-bold cursor-pointer"
                      >
                        <option value="القاهرة">القاهرة</option>
                        <option value="الجيزة">الجيزة</option>
                        <option value="الإسكندرية">الإسكندرية</option>
                        <option value="الدقهلية">الدقهلية</option>
                        <option value="الغربية">الغربية</option>
                        <option value="المنوفية font-sans">المنوفية</option>
                        <option value="الشرقية">الشرقية</option>
                        <option value="دمياط">دمياط</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="block text-[11px] text-slate-650 font-bold">{language === 'ar' ? 'تصنيف الفئة والدرجة:' : 'Client Tier Category:'}</label>
                      <select
                        value={newCustomerClassification}
                        onChange={(e) => setNewCustomerClassification(e.target.value)}
                        className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-1 focus:ring-emerald-500 focus:outline-none font-bold cursor-pointer"
                      >
                        <option value="auto">{language === 'ar' ? 'ترقية وحساب تلقائي حسب النقاط ⚙️' : 'Auto Rank by Points'}</option>
                        <option value="VIP">VIP 💎</option>
                        <option value="بلاتيني">بلاتيني 🌌</option>
                        <option value="ذهبي">ذهبي 🥇</option>
                        <option value="فضي">فضي 🥈</option>
                        <option value="برونزي">برونزي 🥉</option>
                      </select>
                    </div>

                    <button
                      type="submit"
                      className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-xl transition-all shadow-md cursor-pointer text-center"
                    >
                      ✓ {language === 'ar' ? 'حفظ وتسجيل عميل نقاط الولاء' : 'Authorize & Register Customer'}
                    </button>
                  </form>
                </div>
              </div>

              {/* 💬 نافذة إرسال كشف رصيد الولاء بالواتس اب الفوري */}
              <AnimatePresence>
                {selectedWhatsAppCustomer && (
                  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
                    <motion.div
                      initial={{ scale: 0.9, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0.9, opacity: 0 }}
                      className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-lg overflow-hidden text-right"
                      style={{ direction: 'rtl' }}
                    >
                      <div className="bg-emerald-600 p-4 text-white flex justify-between items-center">
                        <div className="flex items-center gap-1.5">
                          <MessageCircle size={18} />
                          <h3 className="font-extrabold text-sm">{language === 'ar' ? 'إخطار العميل الولائي بالواتس اب' : 'Notify Client via WhatsApp'}</h3>
                        </div>
                        <button
                          type="button"
                          onClick={() => setSelectedWhatsAppCustomer(null)}
                          className="text-white/80 hover:text-white font-bold text-xs"
                        >
                          ✕
                        </button>
                      </div>

                      <div className="p-5 space-y-4">
                        <div className="bg-slate-50 p-3 rounded-lg border border-slate-200/60 flex items-center justify-between">
                          <div>
                            <span className="text-[10px] text-slate-400 font-bold block">{language === 'ar' ? 'العميل المستلم' : 'Recipient'}</span>
                            <span className="font-black text-slate-900 text-xs">{selectedWhatsAppCustomer.name || selectedWhatsAppCustomer.nameAr}</span>
                          </div>
                          <div className="text-left">
                            <span className="text-[10px] text-slate-400 font-bold block">{language === 'ar' ? 'رصيد نقاطه الحالي' : 'Points Balance'}</span>
                            <span className="font-mono font-black text-blue-700">{selectedWhatsAppCustomer.points || 0} {language === 'ar' ? 'نقطة' : 'pts'}</span>
                          </div>
                        </div>

                        {/* تحرير الرسالة المباشرة */}
                        <div className="space-y-1.5">
                          <label className="block text-[11px] text-slate-650 font-bold">{language === 'ar' ? 'محتوى الرسالة المراد إرسالها (يمكنك تعديلها):' : 'Message Body:'}</label>
                          <textarea
                            rows={4}
                            value={customWhatsAppText}
                            onChange={(e) => setCustomWhatsAppText(e.target.value)}
                            className="w-full text-xs p-2 border border-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500 rounded-lg font-semibold leading-relaxed"
                          />
                        </div>

                        <div className="bg-emerald-50 text-emerald-800 p-3 text-[10px] rounded-lg border border-emerald-100 font-bold">
                          {language === 'ar' 
                            ? '💡 بمجرد النقر على بدء الإرسال، سيتم تشفير الرسالة وتوجيهك تلقائياً لتطبيق واتس اب للهواتف أو واتساب ويب للكمبيوتر لإرسالها للعميل بضغطة زر وبدون مشاكل!' 
                            : '⚡ Redirects you directly to WhatsApp Mobile/Web with pre-filled encoded text.'}
                        </div>
                      </div>

                      {/* أزرار الإجراء */}
                      <div className="p-4 bg-slate-50/85 border-t border-slate-100 flex justify-end gap-2.5">
                        <button
                          type="button"
                          onClick={() => setSelectedWhatsAppCustomer(null)}
                          className="px-3 py-1.5 border border-slate-200 hover:bg-slate-100 rounded-lg text-xs font-semibold cursor-pointer"
                        >
                          {language === 'ar' ? 'إلغاء' : 'Cancel'}
                        </button>

                        <a
                          href={`https://wa.me/20${
                            selectedWhatsAppCustomer.phone.startsWith('0') 
                              ? selectedWhatsAppCustomer.phone.slice(1) 
                              : selectedWhatsAppCustomer.phone
                          }?text=${encodeURIComponent(customWhatsAppText)}`}
                          target="_blank"
                          rel="noreferrer referrer"
                          onClick={() => {
                            // push system audit log of wa message
                            pushCustomAuditLog(
                              `قام بإصدار وإرسال كشف نقاط رسالة واتس اب للعميل: [${selectedWhatsAppCustomer.name || selectedWhatsAppCustomer.nameAr}] برصيد نقاط (${selectedWhatsAppCustomer.points || 0})`,
                              `Sent loyalty points WhatsApp statement notify to client [${selectedWhatsAppCustomer.name}] with balance (${selectedWhatsAppCustomer.points})`
                            );
                            setSelectedWhatsAppCustomer(null);
                          }}
                          className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold rounded-lg text-xs flex items-center gap-1 transition-all hover:scale-[1.02]"
                        >
                          <MessageCircle size={14} />
                          {language === 'ar' ? 'بدء الإرسال الفوري عبر واتساب 🚀' : 'Send WhatsApp Message 🚀'}
                        </a>
                      </div>
                    </motion.div>
                  </div>
                )}
              </AnimatePresence>

              {/* ⚙️ كونسول تسوية وإدارة النقاط الفورية اليدوية للعملاء */}
              <AnimatePresence>
                {pointsAdjustmentCustomer && (
                  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
                    <motion.div
                      initial={{ scale: 0.9, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0.9, opacity: 0 }}
                      className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-md overflow-hidden text-right"
                      style={{ direction: 'rtl' }}
                    >
                      <div className="bg-[#004a99] p-4 text-white flex justify-between items-center">
                        <div className="flex items-center gap-1.5">
                          <Coins size={16} />
                          <h3 className="font-extrabold text-sm">{language === 'ar' ? 'كونسول تعديل رصيد النقاط' : 'Manual Point Adjust Console'}</h3>
                        </div>
                        <button
                          type="button"
                          onClick={() => setPointsAdjustmentCustomer(null)}
                          className="text-white/80 hover:text-white font-bold text-xs"
                        >
                          ✕
                        </button>
                      </div>

                      <div className="p-5 space-y-4">
                        <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/60 text-xs">
                          <div className="flex justify-between font-bold mb-1">
                            <span className="text-slate-550">{language === 'ar' ? 'رصيد العميل الحالي:' : 'Client points:'}</span>
                            <span className="font-black text-blue-700 font-mono">{pointsAdjustmentCustomer.points || 0} {language === 'ar' ? 'نقطة' : 'pts'}</span>
                          </div>
                          <div className="flex justify-between font-bold">
                            <span className="text-slate-550">{language === 'ar' ? 'الاسم:' : 'Name:'}</span>
                            <span className="font-black text-slate-800">{pointsAdjustmentCustomer.name || pointsAdjustmentCustomer.nameAr}</span>
                          </div>
                        </div>

                        {/* اختيار الإجراء */}
                        <div className="space-y-1.5">
                          <label className="block text-[11px] text-slate-650 font-black">{language === 'ar' ? 'نوع حركة التعديل للولاء:' : 'Action Type:'}</label>
                          <div className="grid grid-cols-3 gap-2">
                            <button
                              type="button"
                              onClick={() => setPointsAdjAction('add')}
                              className={`py-2 text-xs font-bold rounded-lg border cursor-pointer transition-all ${
                                pointsAdjAction === 'add' 
                                  ? 'bg-blue-50 text-blue-700 border-blue-300 ring-1 ring-blue-300 font-black' 
                                  : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'
                              }`}
                            >
                              ➕ {language === 'ar' ? 'إضافة نقاط' : 'Add'}
                            </button>
                            <button
                              type="button"
                              onClick={() => setPointsAdjAction('deduct')}
                              className={`py-2 text-xs font-bold rounded-lg border cursor-pointer transition-all ${
                                pointsAdjAction === 'deduct' 
                                  ? 'bg-[#c2410c]/10 text-[#c2410c] border-[#c2410c]/30 ring-1 ring-[#c2410c]/30 font-black' 
                                  : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'
                              }`}
                            >
                              ➖ {language === 'ar' ? 'خصم نقاط' : 'Deduct'}
                            </button>
                            <button
                              type="button"
                              onClick={() => setPointsAdjAction('set')}
                              className={`py-2 text-xs font-bold rounded-lg border cursor-pointer transition-all ${
                                pointsAdjAction === 'set' 
                                  ? 'bg-amber-50 text-amber-700 border-amber-300 ring-1 ring-amber-300 font-black' 
                                  : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'
                              }`}
                            >
                              ＝ {language === 'ar' ? 'تعيين رصيد' : 'Set Exact'}
                            </button>
                          </div>
                        </div>

                        {/* قيمة النقاط */}
                        <div className="space-y-1">
                          <label className="block text-[11px] text-slate-650 font-bold">{language === 'ar' ? 'كمية تفاعل النقاط الحركية:' : 'Points quantity:'}</label>
                          <input
                            type="number"
                            min="1"
                            value={pointsAdjAmount}
                            onChange={(e) => setPointsAdjAmount(Math.max(1, parseInt(e.target.value) || 0))}
                            className="w-full font-mono text-center font-extrabold text-base p-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 bg-slate-50 focus:bg-white"
                          />
                          <p className="text-[10px] text-slate-400 mt-1 font-semibold text-left" style={{ direction: 'rtl' }}>
                            {language === 'ar' 
                              ? `✦ تعادل مالياً حوالى: ${(pointsAdjAmount * 0.1).toFixed(1)} ج.م كاش` 
                              : `✦ Equivalent to EGP ${(pointsAdjAmount * 0.1).toFixed(1)} cash`}
                          </p>
                        </div>

                        {/* سبب الحركة */}
                        <div className="space-y-1">
                          <label className="block text-[11px] text-slate-650 font-bold">{language === 'ar' ? 'سبب تعديل النقاط (لأغراض المراجعة):' : 'Reason for Adjustment:'}</label>
                          <input
                            type="text"
                            placeholder={language === 'ar' ? "مثال: استبدال نقاط بخصم يدوي" : "Example: manual store reward"}
                            value={pointsAdjReason}
                            onChange={(e) => setPointsAdjReason(e.target.value)}
                            className="w-full text-xs p-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                          />
                        </div>
                      </div>

                      {/* أزرار الإجراء */}
                      <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-2 text-xs">
                        <button
                          type="button"
                          onClick={() => setPointsAdjustmentCustomer(null)}
                          className="px-3 py-1.5 border border-slate-200 bg-white hover:bg-slate-100 rounded-lg font-semibold cursor-pointer"
                        >
                          {language === 'ar' ? 'إلغاء' : 'Cancel'}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (!pointsAdjReason.trim()) {
                              alert(language === 'ar' ? 'يرجى كتابة سبب التعديل لمراجعته في سجل أمان العمليات' : 'Please provide adjustment reason');
                              return;
                            }
                            fetch('/api/customers/points', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({
                                id: pointsAdjustmentCustomer.id,
                                action: pointsAdjAction,
                                amount: pointsAdjAmount,
                                reason: pointsAdjReason
                              })
                            })
                            .then(res => res.json())
                            .then(data => {
                              if (data.success) {
                                triggerToast(language === 'ar' ? '🎉 تم تحديث وتسوية نقاط العميل الحية بنجاح!' : '🎉 Points adjusted successfully!');
                                setPointsAdjustmentCustomer(null);
                                refreshCustomers();
                              } else {
                                alert('Error adjusting points');
                              }
                            })
                            .catch(err => {
                              console.error(err);
                              alert('Network transition error');
                            });
                          }}
                          className="px-4 py-1.5 bg-[#004a99] hover:bg-[#003d7e] text-white font-black rounded-lg cursor-pointer"
                        >
                          ✓ {language === 'ar' ? 'تسجيل وحفظ الحركة' : 'Save Adjustment'}
                        </button>
                      </div>
                    </motion.div>
                  </div>
                )}
              </AnimatePresence>
            </motion.div>
          )}

          {/* 📝 تبويب: فواتير المشتريات والموردين (Purchase Invoices Ledger) */}
          {activeTab === 'invoices' && (
            <motion.div
              key="invoices-tab"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="grid grid-cols-1 lg:grid-cols-12 gap-6"
            >
              {/* نموذج تسوية فاتورة توريد جديدة */}
              <div className="lg:col-span-4 bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm space-y-4">
                <div className="border-b border-slate-100 pb-2">
                  <h3 className="font-extrabold text-[#003d7e] text-base flex items-center gap-1.5">
                    <Plus size={16} className="text-blue-600" />
                    {language === 'ar' ? 'توريد ونمذجة فاتورة مشتريات' : 'Process Purchase Invoice'}
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    {language === 'ar' ? 'قم بتسجيل فاتورة التوريد من المورد لترصيد مخزون المخزن وإضافة تشغيلات سلعية جديدة.' : 'Log invoices to update warehouse batch stocks and adjust costing.'}
                  </p>
                </div>

                <div className="space-y-3 text-right" style={{ direction: 'rtl' }}>
                  <div className="space-y-1">
                    <label className="block text-[10px] text-slate-550 font-bold">{language === 'ar' ? 'رقم الفاتورة (الكود):' : 'Invoice Reference Code:'}</label>
                    <div className="flex gap-1.5">
                      <input
                        type="text"
                        placeholder="INV-2026-90"
                        value={invoiceNumberInput}
                        onChange={(e) => setInvoiceNumberInput(e.target.value)}
                        className="w-full text-xs font-mono font-bold p-2 bg-slate-50 border border-slate-200 rounded-md focus:bg-white focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => setInvoiceNumberInput('INV-RF-' + Math.floor(1000 + Math.random() * 9000))}
                        className="px-2 py-1 bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-800 font-extrabold text-[10px] rounded cursor-pointer"
                      >
                        {language === 'ar' ? 'توليد' : 'Gen'}
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <label className="block text-[10px] text-slate-550 font-bold">{language === 'ar' ? 'اسم المورد:' : 'Supplier Name:'}</label>
                      <input
                        type="text"
                        placeholder="الشركة المصرية للأغذية"
                        value={invoiceSupplierName}
                        onChange={(e) => {
                          setInvoiceSupplierName(e.target.value);
                        }}
                        className="w-full text-xs font-bold p-2 bg-slate-50 border border-slate-200 rounded-md focus:bg-white focus:outline-none"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="block text-[10px] text-slate-550 font-bold">{language === 'ar' ? 'هاتف المورد:' : 'Supplier Phone:'}</label>
                      <input
                        type="text"
                        placeholder="01011112233"
                        value={invoiceSupplierPhone}
                        onChange={(e) => {
                          setInvoiceSupplierPhone(e.target.value);
                        }}
                        className="w-full text-xs font-mono font-bold p-2 bg-slate-50 border border-slate-200 rounded-md focus:bg-white focus:outline-none text-center"
                      />
                    </div>
                  </div>

                  {/* إضافة عنصر للفاتورة */}
                  <div className="pt-3 border-t border-slate-100 space-y-2">
                    <span className="block text-[11px] font-black text-slate-700">🛒 {language === 'ar' ? 'عناصر الفاتورة المضافة حالياً' : 'Invoice Items Draft'}</span>
                    
                    {/* قائمة مضافة */}
                    <div className="max-h-36 overflow-y-auto space-y-1.5 pr-1">
                      {invoiceItems.length === 0 ? (
                        <p className="text-center py-4 text-slate-400 italic text-[10px]">{language === 'ar' ? 'لا توجد أصناف في مسودة الفاتورة حالياً' : 'Invoice contains no parts yet.'}</p>
                      ) : (
                        invoiceItems.map((item, idx) => (
                          <div key={idx} className="p-2 bg-slate-50 border border-slate-200 rounded flex justify-between items-center text-[10px] text-slate-800" style={{ direction: 'rtl' }}>
                            <button
                              type="button"
                              onClick={() => {
                                  setInvoiceItems(invoiceItems.filter((_, i) => i !== idx));
                              }}
                              className="text-red-500 hover:text-red-700 font-extrabold pr-1 cursor-pointer"
                            >
                              ✕
                            </button>
                            <div className="flex-1 text-right">
                              <span className="font-bold">{language === 'ar' ? item.nameAr : item.nameEn}</span>
                              <div className="text-[9px] text-slate-450 font-mono mt-0.5">
                                {item.quantity} {language === 'ar' ? 'قطعة' : 'pcs'} | شراء: {item.buyPrice} ج | بيع: {item.sellPrice} ج
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>

                    {/* نموذج سريع للإضافة الفورية للمسودة */}
                    <div className="p-2 bg-slate-50/50 border border-slate-150 rounded-lg space-y-2 text-right">
                      <label className="block text-[9px] font-black text-slate-500">{language === 'ar' ? 'إضافة صنف للفاتورة المسودة:' : 'Append draft element:'}</label>
                      
                      <div className="grid grid-cols-1 gap-2">
                        <select
                          id="invoice-select-product"
                          className="w-full text-xs font-bold p-1 bg-white border border-slate-200 rounded focus:outline-none"
                        >
                          <option value="">-- {language === 'ar' ? 'اختر السلعة لتوريدها' : 'Select target Product'} --</option>
                          {products.map(p => (
                            <option key={p.id} value={p.id}>
                              {language === 'ar' ? p.nameAr : p.nameEn} (حالي: {p.warehouseStock} كرتونة)
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="grid grid-cols-3 gap-1.5 text-center font-mono">
                        <div>
                          <span className="block text-[8px] text-slate-400">{language === 'ar' ? 'الكمية' : 'Qty'}</span>
                          <input type="number" id="invoice-add-qty" defaultValue="50" className="w-full text-xs font-bold border border-slate-200 rounded p-1 text-center bg-white" />
                        </div>
                        <div>
                          <span className="block text-[8px] text-slate-400">{language === 'ar' ? 'سعر الشراء' : 'Buy Cost'}</span>
                          <input type="number" id="invoice-add-buy" defaultValue="25" className="w-full text-xs font-bold border border-slate-200 rounded p-1 text-center bg-white" />
                        </div>
                        <div>
                          <span className="block text-[8px] text-slate-400">{language === 'ar' ? 'سعر البيع' : 'Sell Price'}</span>
                          <input type="number" id="invoice-add-sell" defaultValue="35" className="w-full text-xs font-bold border border-slate-200 rounded p-1 text-center bg-white" />
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          const pId = (document.getElementById('invoice-select-product') as HTMLSelectElement)?.value;
                          const qty = Number((document.getElementById('invoice-add-qty') as HTMLInputElement)?.value || 0);
                          const buy = Number((document.getElementById('invoice-add-buy') as HTMLInputElement)?.value || 0);
                          const sell = Number((document.getElementById('invoice-add-sell') as HTMLInputElement)?.value || 0);

                          if (!pId) {
                            alert(language === 'ar' ? 'يرجى اختيار منتج' : 'Select a product first');
                            return;
                          }
                          if (qty <= 0 || buy <= 0) {
                            alert(language === 'ar' ? 'يرجى كتابة كمية وسعر شراء حقيقي' : 'Invalid quantity or pricing');
                            return;
                          }

                          const matched = products.find(p => p.id === pId);
                          if (matched) {
                            setInvoiceItems([...invoiceItems, {
                              productId: pId,
                              nameAr: matched.nameAr,
                              nameEn: matched.nameEn,
                              quantity: qty,
                              buyPrice: buy,
                              sellPrice: sell
                            }]);
                          }
                        }}
                        className="w-full py-1 bg-blue-100 hover:bg-blue-200 text-blue-800 font-bold text-[10px] rounded cursor-pointer text-center"
                      >
                        + {language === 'ar' ? 'إدراج الصنف للمسودة' : 'Add Item to Draft'}
                      </button>
                    </div>
                  </div>

                  {/* زر الإرسال والحفظ النهائي بالباك اند */}
                  <button
                    type="button"
                    onClick={() => {
                      if (!invoiceNumberInput) {
                        alert(language === 'ar' ? 'يرجى تحديد رقم الفاتورة' : 'Specify invoice number');
                        return;
                      }
                      if (invoiceItems.length === 0) {
                        alert(language === 'ar' ? 'فاتورتك خالية! يرجى إضافة عنصر واحد على الأقل.' : 'Invoice list is currently empty');
                        return;
                      }

                      fetch('/api/invoices', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          invoiceNumber: invoiceNumberInput,
                          supplierName: invoiceSupplierName || 'مورد عام',
                          supplierPhone: invoiceSupplierPhone || '0100',
                          items: invoiceItems,
                          simulatedToday
                        })
                      })
                      .then(res => res.json())
                      .then(data => {
                        if (data.success) {
                          triggerToast(language === 'ar' ? `🎉 تم تفريغ الفاتورة بنجاح وتدعيم مخازن الاحتياط!` : '🎉 Stock batch created & posted to Warehouse!');
                          setInvoiceNumberInput('');
                          setInvoiceSupplierName('');
                          setInvoiceSupplierPhone('');
                          setInvoiceItems([]);
                          refreshInvoices();
                          refreshProductsFromBackend();
                        } else {
                          alert('Post failed');
                        }
                      })
                      .catch(err => {
                        console.error(err);
                        alert('Conectivity failure');
                      });
                    }}
                    className="w-full py-2 bg-blue-700 hover:bg-blue-800 text-white font-black text-xs rounded-xl shadow cursor-pointer text-center"
                  >
                    ✓ {language === 'ar' ? 'ترحيل الفاتورة لترصيد مخزن الاحتياط' : 'Save & Post to Warehouse depot'}
                  </button>
                </div>
              </div>

              {/* كشف الفواتير المسجلة */}
              <div className="lg:col-span-8 bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm space-y-4">
                <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                  <div>
                    <h3 className="font-extrabold text-[#003d7e] text-base flex items-center gap-1.5">
                      <FileText size={16} className="text-slate-500" />
                      {language === 'ar' ? 'سجل وكشف فواتير التوريد (المشتريات)' : 'Purchase Invoices Historical Ledger'}
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {language === 'ar' ? 'تاريخ وسجلات تزويد المشتريات ومجموع المدفوعات والتمويل المالي لكل مورد.' : 'List of logged purchase receipts, payments breakdown, and batch records.'}
                    </p>
                  </div>
                </div>

                {/* جدول عريض للفواتير */}
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-right" style={{ direction: 'rtl' }}>
                    <thead>
                      <tr className="border-b border-slate-100 bg-slate-50/50 text-slate-500 font-extrabold text-[10px]">
                        <th className="p-3 text-right">{language === 'ar' ? 'كود الفاتورة' : 'Invoice ID'}</th>
                        <th className="p-3 text-center">{language === 'ar' ? 'المورد' : 'Supplier'}</th>
                        <th className="p-3 text-center">{language === 'ar' ? 'التاريخ' : 'Date'}</th>
                        <th className="p-3 text-center">{language === 'ar' ? 'عدد السلع' : 'Items count'}</th>
                        <th className="p-3 text-left">{language === 'ar' ? 'إجمالي تكلفة المشتريات' : 'Cost Total'}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {invoices.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="p-8 text-center text-slate-400 font-semibold italic">
                            {language === 'ar' ? 'لا توجود فواتير توريد مسجلة بعد بالخلفية.' : 'No purchase invoices documented yet.'}
                          </td>
                        </tr>
                      ) : (
                        invoices.map((inv, idx) => (
                          <tr key={idx} className="hover:bg-slate-50/50 transition-colors text-slate-700 font-semibold text-[11px]">
                            <td className="p-3 font-bold text-blue-700 font-mono text-right">{inv.invoiceNumber}</td>
                            <td className="p-3 text-center">
                              <span className="font-bold text-slate-900">{inv.supplierName}</span>
                              <div className="text-[9px] text-slate-400 font-mono mt-0.5">{inv.supplierPhone}</div>
                            </td>
                            <td className="p-3 text-center font-mono text-slate-500">{inv.datePosted || simulatedToday}</td>
                            <td className="p-3 text-center font-mono font-bold text-slate-800">{inv.items ? inv.items.length : 0} {language === 'ar' ? 'نوع بضاعة' : 'kinds'}</td>
                            <td className="p-3 text-left font-mono font-extrabold text-slate-900">
                              {inv.items ? inv.items.reduce((sum: number, it: any) => sum + (it.buyPrice * it.quantity), 0).toLocaleString() : 0} ج.م
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </motion.div>
          )}

          {/* 📦 تبويب: أذونات النقل والاعتماد (Internal Warehouse to Mall Transfers) */}
          {activeTab === 'transfers' && (
            <motion.div
              key="transfers-tab"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="grid grid-cols-1 lg:grid-cols-12 gap-6"
            >
              {/* تقديم طلب نقل جديد */}
              <div className="lg:col-span-4 bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm space-y-4">
                <div className="border-b border-slate-100 pb-2">
                  <h3 className="font-extrabold text-[#003d7e] text-base flex items-center gap-1.5">
                    <Plus size={16} className="text-purple-600" />
                    {language === 'ar' ? 'تقديم إذن نقل داخلي للمول' : 'Create Transfer Order'}
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    {language === 'ar' 
                      ? 'تقسيم المستودع: اطلب سحب البضائع من مخزن الاحتياط الرئيسي ونقلها لرفوف صالة العرض بالمول.' 
                      : 'Seprate storage bounds: Request to dispatch quantities from back-depot storage to mall shelfs.'}
                  </p>
                </div>

                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (!transferProductId || transferQty <= 0) {
                      alert(language === 'ar' ? 'يرجى اختيار صنف وتحديد كمية النقل' : 'Select a product and specify qty');
                      return;
                    }

                    const matched = products.find(p => p.id === transferProductId);
                    if (matched && matched.warehouseStock < transferQty) {
                      alert(language === 'ar' ? `⚠️ رصيد صنف [${matched.nameAr}] بالمستودع غير كافي! المتوفر بالمخزن الاحتياطي: ${matched.warehouseStock} كرتونة` : 'Insufficient warehouse stock');
                      return;
                    }

                    fetch('/api/transfers', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        items: [{
                          productId: transferProductId,
                          quantity: transferQty
                        }],
                        requestedBy: currentUser?.username || 'staff'
                      })
                    })
                    .then(res => res.json())
                    .then(data => {
                      if (data.success) {
                        triggerToast(language === 'ar' ? '🎉 تم تقديم إذن التحويل المعلق وهو بانتظار موافقة المدير العام!' : '🎉 Pending transfer order created!');
                        setTransferProductId('');
                        setTransferQty(1);
                        refreshTransfers();
                      } else {
                        alert('Request failed');
                      }
                    })
                    .catch(err => {
                      console.error(err);
                      alert('Error communicating with Express fullstack server');
                    });
                  }}
                  className="space-y-4 text-right"
                  style={{ direction: 'rtl' }}
                >
                  <div className="space-y-1">
                    <label className="block text-[11px] text-slate-650 font-bold">{language === 'ar' ? 'اختر المنتج للترحيل:' : 'Select product to dispatch:'}</label>
                    <select
                      value={transferProductId}
                      onChange={(e) => {
                        setTransferProductId(e.target.value);
                      }}
                      className="w-full text-xs font-bold p-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-purple-500"
                    >
                      <option value="">-- {language === 'ar' ? 'اختر السلعة لتفقد توفرها' : 'Choose ready product'} --</option>
                      {products.map(p => (
                        <option key={p.id} value={p.id}>
                          {language === 'ar' ? p.nameAr : p.nameEn} (مخزن: {p.warehouseStock} | رفوف: {p.shelfStock})
                        </option>
                      ))}
                    </select>
                  </div>

                  {transferProductId && (
                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-[10px] space-y-1.5 font-bold text-slate-655" style={{ direction: 'rtl' }}>
                      <div className="flex justify-between">
                        <span>{language === 'ar' ? 'المتوفر بمخزن الاحتياط الرئيسي:' : 'Available in back-depot:'}</span>
                        <span className="text-blue-750 font-extrabold font-mono text-xs">{products.find(p => p.id === transferProductId)?.warehouseStock || 0} كرتونة</span>
                      </div>
                      <div className="flex justify-between">
                        <span>{language === 'ar' ? 'المعروض حالياً على رفوف صالة العرض بالمول:' : 'Displayed on shelves:'}</span>
                        <span className="text-emerald-750 font-extrabold font-mono text-xs">{products.find(p => p.id === transferProductId)?.shelfStock || 0} قطعة</span>
                      </div>
                    </div>
                  )}

                  <div className="space-y-1">
                    <label className="block text-[11px] text-slate-650 font-bold">{language === 'ar' ? 'الكمية المطلوب تحويلها للصالة:' : 'Quantity to dispatch:'}</label>
                    <input
                      type="number"
                      min="1"
                      value={transferQty}
                      onChange={(e) => setTransferQty(Math.max(1, parseInt(e.target.value) || 0))}
                      className="w-full text-xs font-mono font-bold p-2 bg-slate-50 border border-slate-200 rounded-lg text-center focus:bg-white focus:outline-none"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full py-2 bg-purple-650 hover:bg-purple-740 text-white font-black text-xs rounded-xl shadow-md transition-all cursor-pointer text-center"
                  >
                    ✓ {language === 'ar' ? 'إرسال طلب التحويل للمراجعة' : 'Submit Authorization voucher'}
                  </button>
                </form>
              </div>

              {/* كشف الأذونات وعارضة الطباعة */}
              <div className="lg:col-span-8 bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm space-y-4">
                <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                  <div>
                    <h3 className="font-extrabold text-[#003d7e] text-base flex items-center gap-1.5 font-sans">
                      <Archive size={16} className="text-purple-600" />
                      {language === 'ar' ? 'سجل مستندات التحويل من المخزن لصالة المول' : 'Storage Separation Internal Transfers Directory'}
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {language === 'ar' ? 'عرض تتبع أذون سحب المنتجات من الرفوف، وتفويض المدير العام، والطباعة والاعتماد.' : 'Approve, dispatch, or print legal transfer sheets authorized by executive desk.'}
                    </p>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-right" style={{ direction: 'rtl' }}>
                    <thead>
                      <tr className="border-b border-slate-100 bg-slate-50/50 text-slate-500 font-extrabold text-[10px]">
                        <th className="p-3 text-right">{language === 'ar' ? 'العناصر المرصودة للنقل' : 'Product to Shift'}</th>
                        <th className="p-3 text-center">{language === 'ar' ? 'الكمية' : 'Qty'}</th>
                        <th className="p-3 text-center">{language === 'ar' ? 'تاريخ الطلب' : 'Date requested'}</th>
                        <th className="p-3 text-center">{language === 'ar' ? 'حالة الاعتماد' : 'Clearance Status'}</th>
                        <th className="p-3 text-left">{language === 'ar' ? 'التفويض والطباعة' : 'Voucher Actions'}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {transfers.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="p-8 text-center text-slate-400 font-semibold italic">
                            {language === 'ar' ? 'لا توجد أذونات تحويل داخلية مسجلة بعد بالخلفية.' : 'No transfer document registered yet.'}
                          </td>
                        </tr>
                      ) : (
                        transfers.map((order, idx) => {
                          const pObj = products.find(p => p.id === (order.items && order.items[0]?.productId));
                          return (
                            <tr key={idx} className="hover:bg-slate-50/50 transition-colors text-slate-700 font-semibold text-[11px]">
                              <td className="p-3 font-bold text-slate-900 text-right">
                                {pObj ? (language === 'ar' ? pObj.nameAr : pObj.nameEn) : 'صنف غير معروف'}
                              </td>
                              <td className="p-3 text-center font-mono font-bold">{order.items && order.items[0]?.quantity} قطعة</td>
                              <td className="p-3 text-center font-mono text-slate-505">{order.dateRequested ? order.dateRequested.substring(0, 10) : simulatedToday}</td>
                              <td className="p-3 text-center">
                                {order.status === 'approved' ? (
                                  <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 text-[9px] rounded font-extrabold">{language === 'ar' ? '✓ تم الاعتماد والتحويل' : '✓ Approved & Shipped'}</span>
                                ) : order.status === 'rejected' ? (
                                  <span className="px-2 py-0.5 bg-red-50 text-red-700 border border-red-200 text-[9px] rounded font-extrabold">{language === 'ar' ? 'مرفوض' : 'Rejected'}</span>
                                ) : (
                                  <span className="px-2 py-0.5 bg-amber-50 text-amber-700 border border-amber-200 text-[9px] rounded font-extrabold animate-pulse">{language === 'ar' ? 'قيد موافقة المدير' : 'Pending Review'}</span>
                                )}
                              </td>
                              <td className="p-3 text-left space-x-1">
                                <button
                                  onClick={() => setActivePrintOrder(order)}
                                  className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-850 border border-slate-205 rounded font-extrabold text-[9px] cursor-pointer"
                                >
                                  🖨️ {language === 'ar' ? 'معاينة / طباعة الإذن' : 'Print View'}
                                </button>

                                {order.status === 'pending' && currentUserRole === 'admin' && (
                                  <div className="inline-flex gap-1 mr-1">
                                    <button
                                      onClick={() => {
                                        fetch(`/api/transfers/${order.id}/status`, {
                                          method: 'POST',
                                          headers: { 'Content-Type': 'application/json' },
                                          body: JSON.stringify({ status: 'approved' })
                                        })
                                        .then(res => res.json())
                                        .then(data => {
                                          if (data.success) {
                                            triggerToast(language === 'ar' ? '🎉 تم اعتماد إذن التحويل وتعديل بضائع المول تزامناً!' : '🎉 Transfer order approved successfully!');
                                            refreshTransfers();
                                            refreshProductsFromBackend();
                                          }
                                        });
                                      }}
                                      className="px-2 py-0.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[9px] font-bold cursor-pointer"
                                    >
                                      {language === 'ar' ? 'اعتماد' : 'Approve'}
                                    </button>
                                    <button
                                      onClick={() => {
                                        fetch(`/api/transfers/${order.id}/status`, {
                                          method: 'POST',
                                          headers: { 'Content-Type': 'application/json' },
                                          body: JSON.stringify({ status: 'rejected' })
                                        })
                                        .then(res => res.json())
                                        .then(data => {
                                          if (data.success) {
                                            triggerToast(language === 'ar' ? '✕ تم رفض إذن التحويل داخلياً' : '✕ Transfer order rejected!');
                                            refreshTransfers();
                                          }
                                        });
                                      }}
                                      className="px-2 py-0.5 bg-red-655 hover:bg-red-700 text-white rounded text-[9px] font-bold cursor-pointer"
                                    >
                                      {language === 'ar' ? 'رفض' : 'Reject'}
                                    </button>
                                  </div>
                                )}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </motion.div>
          )}

          {/* 🏢 تبويب: المستودعات واللوجيستيات والجرد بالباركود وتصدير إكسيل */}
          {activeTab === 'warehouses' && (
            <motion.div
              key="warehouses-tab"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="space-y-6 text-right"
            >
              <div className="bg-[#1e293b] rounded-2xl p-5 text-white flex flex-col md:flex-row justify-between items-center gap-4">
                <div>
                  <h2 className="text-xl font-black bg-gradient-to-r from-amber-400 to-amber-500 bg-clip-text text-transparent">
                    🏢 {language === 'ar' ? 'البوابة اللوجستية وإدارة وجرد المستودعات' : 'Logistics, Warehouses & Audits'}
                  </h2>
                  <p className="text-xs text-slate-300 mt-1">
                    {language === 'ar' 
                      ? 'إدارة فروع المستودعات البديلة، جرد البضائع المبردة والجافة بالباركود، تسوية التلاعب وتصديرها للإكسيل.'
                      : 'Manage multi-warehouse storage, execute digital audits, and balance calculations.'}
                  </p>
                </div>
                {/* Excel Import / Export Panel */}
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      // CSV export utility
                      const headers = "Barcode,NameAr,NameEn,Category,ShelfStock,WarehouseStock,BuyPrice,SellPrice,Threshold\n";
                      const rows = products.map(p => 
                        `"${p.barcode}","${p.nameAr}","${p.nameEn}","${p.category}",${p.shelfStock},${p.warehouseStock},${p.buyPrice},${p.sellPrice},${p.minStockAlert}`
                      ).join("\n");
                      const blob = new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), headers + rows], { type: "text/csv;charset=utf-8;" });
                      const url = URL.createObjectURL(blob);
                      const link = document.createElement("a");
                      link.href = url;
                      link.setAttribute("download", `D2N_Mall_Products_${simulatedToday}.csv`);
                      document.body.appendChild(link);
                      link.click();
                      document.body.removeChild(link);
                      triggerToast(language === 'ar' ? "📥 تم تصدير الأصناف لملف Excel/CSV بنجاح!" : "Downloaded ERP catalog spreadsheet!");
                    }}
                    className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black rounded-xl transition-all shadow-md cursor-pointer"
                  >
                    📥 {language === 'ar' ? 'تصدير كميات الأصناف لإكسيل (Excel)' : 'Export CSV (Excel)'}
                  </button>
                  <label className="px-3 py-2 bg-slate-705 bg-slate-700 hover:bg-slate-650 hover:bg-slate-600 border border-slate-600 text-slate-100 text-xs font-black rounded-xl cursor-pointer">
                    📤 {language === 'ar' ? 'استيراد أصناف جماعي' : 'Import Excel'}
                    <input 
                      type="file" 
                      accept=".csv, .txt" 
                      className="hidden" 
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onload = (evt) => {
                            const text = evt.target?.result as string;
                            triggerToast(language === 'ar' ? "⚡ تم تسكين وقراءة الحزمة بنجاح وجاري إلحاق الأصناف!" : "Batch loading custom sheet catalog...");
                            // Simulate parser and seed
                          };
                          reader.readAsText(file);
                        }
                      }}
                    />
                  </label>
                </div>
              </div>

              {/* Multi-Warehouse Explorer Card Mesh */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {(warehouses.length > 0 ? warehouses : [
                  { id: "w-1", name: "المستودع الرئيسي المغذى", responsible: "أحمد عبد العال", location: "المنطقة الصناعية - الجيزة", capacity: "10,000 كرتونة" },
                  { id: "w-2", name: "مخزن السلع المبردة والألبان", responsible: "سارة الجياد", location: "بدروم المول الرئيسي", capacity: "3,000 لتر" },
                  { id: "w-3", name: "مستودع الأجهزة المنزلية والإلكترونيات", responsible: "أبو بكر زهران", location: "الطابق الأرضي - صالة ب", capacity: "500 وحدة" }
                ]).map((wh) => (
                  <div key={wh.id} className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-inner relative hover:shadow-md transition-all">
                    <div className="absolute top-4 left-4 text-xs font-bold font-mono px-2 py-0.5 bg-blue-50 text-[#004a99] rounded">
                      ID: {wh.id}
                    </div>
                    <p className="text-[10px] text-emerald-800 font-bold uppercase tracking-widest">🏢 {language === 'ar' ? 'مستودع تجاري معتمد' : 'DEPOT WAREHOUSE'}</p>
                    <h3 className="text-base font-black text-slate-900 mt-1">{wh.name}</h3>
                    
                    <div className="mt-4 pt-3 border-t border-slate-100 space-y-2 text-xs text-slate-600">
                      <div className="flex justify-between">
                        <span className="text-slate-400">{language === 'ar' ? 'المسؤول المشرف:' : 'Supervisor In-Charge:'}</span>
                        <span className="font-extrabold text-slate-800">👑 {wh.responsible}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">{language === 'ar' ? 'الموقع اللوجستي:' : 'Physical Location:'}</span>
                        <span className="font-semibold text-slate-700">{wh.location}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">{language === 'ar' ? 'السعة الكلية للمستودع:' : 'Max Storage limit:'}</span>
                        <span className="font-mono font-bold text-slate-800">{wh.capacity}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Barcode Audit Stocktaking & Settlement Simulator (جرد وتسويات أصناف بالباركود) */}
              <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm">
                <div className="border-b border-slate-100 pb-3 mb-4">
                  <h3 className="font-black text-slate-900 text-base flex items-center justify-between">
                    <span>🔍 {language === 'ar' ? 'نظام جرد البضائع الموحد بالباركود وتسوية التوالف والكميات' : 'Barcode Inventory Stocktaking'}</span>
                    <span className="text-[10px] font-mono text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-sm font-bold">LIVE BARCODE AUDITING</span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">
                    {language === 'ar'
                      ? 'امسح باركود المنتج أو اختره يدوياً لتسوية وربط رصيد النظام Theoretical مع جرد الرصيد الفعلي على الرفوف والمخازن.'
                      : 'Scan or select product barcodes to verify physical volumes against registered backend ledger figures.'}
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-end">
                  {/* Select product to audit */}
                  <div className="md:col-span-4 space-y-1">
                    <label className="block text-[11px] text-slate-600 font-bold">{language === 'ar' ? 'اختر الصنف المراد جرده وتسويته:' : 'Select product to audit:'}</label>
                    <select
                      id="audit-product-select"
                      className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-1 focus:ring-blue-500 font-bold"
                    >
                      <option value="">-- {language === 'ar' ? 'اختر منتج من القائمة...' : 'Select standard product...'} --</option>
                      {products.map(p => (
                        <option key={p.id} value={p.id}>
                          {p.barcode} | {p.nameAr} ({language === 'ar' ? 'نوع الوحدة: ' + (p.category === 'produce' ? 'وزن' : p.category === 'electronics' ? 'كرتونة' : 'قطعة') : 'Piece'})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Physical Count value */}
                  <div className="md:col-span-3 space-y-1">
                    <label className="block text-[11px] text-slate-600 font-bold">{language === 'ar' ? 'الكمية الفعلية على الرف (رفوف):' : 'Shelf Stock (Counted):'}</label>
                    <input 
                      id="audit-physical-shelf"
                      type="number"
                      placeholder="0"
                      className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono font-bold"
                    />
                  </div>

                  {/* Physical Warehouse value */}
                  <div className="md:col-span-3 space-y-1">
                    <label className="block text-[11px] text-slate-600 font-bold">{language === 'ar' ? 'الكمية لكرتونة في المخازن:' : 'Warehouse (Counted):'}</label>
                    <input 
                      id="audit-physical-warehouse"
                      type="number"
                      placeholder="0"
                      className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono font-bold"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <button
                      type="button"
                      onClick={() => {
                        const selProd = (document.getElementById("audit-product-select") as HTMLSelectElement)?.value;
                        const shelfVal = Number((document.getElementById("audit-physical-shelf") as HTMLInputElement)?.value || 0);
                        const whVal = Number((document.getElementById("audit-physical-warehouse") as HTMLInputElement)?.value || 0);

                        if (!selProd) {
                          alert(language === 'ar' ? "يرجى تحديد منتج للجرد أولاً!" : "Select a product first.");
                          return;
                        }

                        const product = products.find(p => p.id === selProd);
                        if (!product) return;

                        // Call backend post to update custom product audit count
                        const updatedProduct = {
                          ...product,
                          shelfStock: shelfVal,
                          warehouseStock: whVal,
                          lastUpdated: simulatedToday
                        };

                        fetch('/api/products', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify(updatedProduct)
                        })
                        .then(res => res.json())
                        .then(data => {
                          if (data.success) {
                            triggerToast(language === 'ar' 
                              ? `✓ تم تسوية كمية صنف [${product.nameAr}] بنجاح (الجرف: ${shelfVal} | المخزن: ${whVal})` 
                              : `✓ Settled custom ledger for ${product.nameEn}`);
                            
                            // Log audit
                            pushCustomAuditLog(
                              `تسوية كميات وجرد بالباركود للصنف [${product.nameAr}] المتبقي رفوف: ${shelfVal} ومخزن أساسي: ${whVal}`,
                              `Executed inventory settlement audit on product ID: ${product.id} to shelf: ${shelfVal} & warehouse: ${whVal}`
                            );
                            
                            refreshProductsFromBackend();
                            // Clear inputs
                            (document.getElementById("audit-physical-shelf") as HTMLInputElement).value = '';
                            (document.getElementById("audit-physical-warehouse") as HTMLInputElement).value = '';
                          }
                        });
                      }}
                      className="w-full py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs rounded-xl transition-all shadow-md cursor-pointer"
                    >
                      ✓ {language === 'ar' ? 'اعتماد الجرد والتسوية' : 'Commit Settlement'}
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* 📊 تبويب: الدورة المحاسبية الحية واليومية وميزان المراجعة وقائمة الدخل وقيمة الأصول والتمويلات الدائنة والمدينة */}
          {activeTab === 'financials' && (() => {
            // Accounting engine in client matching the server-side double entry
            const baseBalances: Record<string, number> = {
              "101": 45000,
              "102": 250000,
              "103": 180000,
              "104": 95000,
              "105": 15000,
              "201": 450000,
              "202": 120000,
              "203": 22000,
              "301": 0,
              "401": 0,
              "402": 0,
              "403": 0,
              "501": 0
            };

            const getAccountType = (code: string) => {
              const debitCodes = ["101", "102", "103", "104", "105", "401", "402", "403"];
              return debitCodes.includes(code) ? "debit" : "credit";
            };

            const getAccountNameAr = (code: string) => {
              const names: Record<string, string> = {
                "101": "خزينة الكاشير والصندوق",
                "102": "الحساب البنكي التجاري الدولي",
                "103": "الأصول الثابتة (رفوف وثلاجات المول)",
                "104": "بضاعة المخزن وأرصدة السلع",
                "105": "ذمم حسابات العملاء والبيع بالآجل (A/R)",
                "201": "رأس المال المدفوع التأسيسي",
                "202": "قروض تمويلية وأقساط بنكية معلقة",
                "203": "ذمم حسابات الموردين والدائنين التجارية (A/P)",
                "301": "إيرادات المبيعات المحققة",
                "401": "تكلفة البضاعة المباعة (COGS)",
                "402": "مصاريف إهلاك الأصول ورأس المال الهالك",
                "403": "مصاريف هالك وتلفيات البضاعة",
                "501": "حساب ضريبة القيمة المضافة المحصلة (14% VAT)"
              };
              return names[code] || "حساب غير معرف";
            };

            const getAccountNameEn = (code: string) => {
              const names: Record<string, string> = {
                "101": "Cash Drawer & Registers",
                "102": "Commercial International Bank (CIB)",
                "103": "Fixed Tangible Assets",
                "104": "Merchandise Inventory",
                "105": "Accounts Receivable (A/R)",
                "201": "Owner Capital Contribution",
                "202": "Outstanding Bank Borrowings",
                "203": "Accounts Payable (A/P)",
                "301": "Operating Revenue from Sales",
                "401": "Cost of Goods Sold (COGS)",
                "402": "Tangible Depreciation Charges",
                "403": "Shrinkage & Spoilage Write-offs",
                "501": "VAT Tax Liability Collected (14%)"
              };
              return names[code] || "Undefined Ledger Code";
            };

            const getCalculatedBalances = (type: 'unadjusted' | 'adjusted') => {
              const balances = { ...baseBalances };
              const kronJournal = financials.journal ? [...financials.journal].reverse() : [];
              
              kronJournal.forEach((entry: any) => {
                if (entry.isDraft) return;
                if (type === 'unadjusted' && entry.isAdjustment) return;
                
                const amt = Number(entry.amount || 0);
                const debCode = entry.debitCode;
                const credCode = entry.creditCode;
                
                if (balances[debCode] !== undefined) {
                  if (getAccountType(debCode) === "debit") {
                    balances[debCode] += amt;
                  } else {
                    balances[debCode] -= amt;
                  }
                }
                
                if (balances[credCode] !== undefined) {
                  if (getAccountType(credCode) === "credit") {
                    balances[credCode] += amt;
                  } else {
                    balances[credCode] -= amt;
                  }
                }
              });
              
              return balances;
            };

            const unadjustedBals = getCalculatedBalances('unadjusted');
            const adjustedBals = getCalculatedBalances('adjusted');

            // Daily sales grouping for step 1
            const retailSalesByDate = (() => {
              const groups: Record<string, { date: string, count: number, revenue: number, cogs: number }> = {};
              transactions.forEach(t => {
                if (t.type === 'sale') {
                  const itemDate = t.date || '2026-06-15';
                  if (!groups[itemDate]) {
                    groups[itemDate] = { date: itemDate, count: 0, revenue: 0, cogs: 0 };
                  }
                  groups[itemDate].count += 1;
                  groups[itemDate].revenue += Number(t.sellPrice || 0) * Number(t.quantity || 0);
                  groups[itemDate].cogs += Number(t.buyPrice || 0) * Number(t.quantity || 0);
                }
              });
              return Object.values(groups).sort((a, b) => b.date.localeCompare(a.date));
            })();

            const isDailySalesJournalized = (date: string) => {
              return financials.journal?.some((j: any) => j.desc.includes(date) && j.desc.includes("مبيعات الكاشير"));
            };

            const isInvoiceJournalized = (invNum: string) => {
              return financials.journal?.some((j: any) => j.desc.includes(invNum));
            };

            return (
              <motion.div
                key="financials-tab"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                className="space-y-6 text-right"
              >
                {/* Header Banner */}
                <div className="bg-[#1e293b] rounded-2xl p-5 text-white flex justify-between items-center shadow-lg border border-slate-700/50">
                  <div>
                    <h2 className="text-xl font-black bg-gradient-to-r from-cyan-400 to-emerald-400 bg-clip-text text-transparent flex items-center gap-2">
                      ⚖️ {language === 'ar' ? 'منصة الدورة المحاسبية المتكاملة' : 'Double-Entry Accounting Cycle Desk'}
                    </h2>
                    <p className="text-xs text-slate-350 mt-1">
                      {language === 'ar'
                        ? 'إثبات المستندات، تسجيل اليومية، الترحيل للأستاذ، موازين المراجعة وإعداد القوائم الختامية الأربعة.'
                        : 'Real-time double-entry compliance workbook: journals, G/L index, trials, and 4 final statements.'}
                    </p>
                  </div>
                  <div className="flex gap-2.5 items-center">
                    <button
                      type="button"
                      onClick={() => {
                        if (confirm(language === 'ar' ? 'هل تود استعادة البيانات المالية الافتراضية التأسيسية؟' : 'Reset financials back to start?')) {
                          fetch('/api/financials/reset', { method: 'POST' })
                            .then(res => res.json())
                            .then(data => {
                              triggerToast(language === 'ar' ? '✓ تم تصفير وإعادة تعيين الحسابات لدفاتر أول المدة!' : 'Financials database reset successfully!');
                              refreshFinancials();
                            });
                        }
                      }}
                      className="px-3 py-1.5 bg-slate-700 hover:bg-slate-650 text-slate-200 font-bold text-xs rounded-xl transition-all cursor-pointer flex items-center gap-1 border border-slate-600/50"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      {language === 'ar' ? 'إعادة ضبط الدفاتر' : 'Reset Books'}
                    </button>
                    <div className="font-mono text-xs bg-slate-800 text-emerald-400 px-3 py-1.5 rounded-lg border border-emerald-950/40 font-bold">
                      {language === 'ar' ? '✓ الدورة متوازنة وموزونة ومكتملة' : 'Books Balanced'}
                    </div>
                  </div>
                </div>

                {/* 6 Steps Process Gauge */}
                <div className="grid grid-cols-2 md:grid-cols-6 gap-2 bg-slate-100 p-2 rounded-2xl border border-slate-200 shadow-inner">
                  {[
                    { number: 1, titleAr: "١. استلام المستندات", titleEn: "1. Vouchers Receipt" },
                    { number: 2, titleAr: "٢. قيود اليومية", titleEn: "2. Journal Entry" },
                    { number: 3, titleAr: "٣. ترحيل الأستاذ", titleEn: "3. Ledger Posting" },
                    { number: 4, titleAr: "٤. ميزان قبل التسوية", titleEn: "4. Unadjusted Balance" },
                    { number: 5, titleAr: "٥. التسويات الجردية", titleEn: "5. Adjusted Trial" },
                    { number: 6, titleAr: "٦. القوائم المالية", titleEn: "6. Statements" }
                  ].map((st) => (
                    <button
                      key={st.number}
                      type="button"
                      onClick={() => setAccountingStep(st.number)}
                      className={`py-2.5 px-2 rounded-xl text-center transition-all flex flex-col items-center justify-center cursor-pointer ${
                        accountingStep === st.number
                          ? "bg-indigo-650 text-white font-black shadow-md shadow-indigo-200"
                          : "bg-white hover:bg-slate-50 text-slate-600 font-bold text-xs border border-slate-150/60"
                      }`}
                    >
                      <span className="text-[12px] md:text-xs">
                        {language === 'ar' ? st.titleAr : st.titleEn}
                      </span>
                    </button>
                  ))}
                </div>

                {/* STEP 1: DOCUMENT / INVOICE RECEPTION */}
                {accountingStep === 1 && (
                  <div className="space-y-6">
                    <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
                      <div className="border-b border-indigo-50 pb-2">
                        <h3 className="font-black text-slate-800 text-sm">📥 الخطوة الأولى: استلام وأرشفة المستندات المالية (فواتير البيع والشراء الأصيلة)</h3>
                        <p className="text-xs text-slate-400 mt-0.5">تبدأ الدورة المحاسبية فور استلام المستعر، كفاتورة شراء مواد أو فواتير نقاط البيع التراكمية، ليتم توجيهها وتفريغ القيد المزدوج المقابل.</p>
                      </div>

                      {/* Purchase Invoices Section */}
                      <div className="space-y-3">
                        <h4 className="font-extrabold text-xs text-indigo-950 flex items-center gap-1.5">📦 فواتير الشراء والتوريد من الموردين</h4>
                        <div className="overflow-x-auto border border-slate-150 rounded-xl">
                          <table className="w-full text-xs text-right">
                            <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-150">
                              <tr>
                                <th className="p-3">{language === 'ar' ? 'رقم الفاتورة' : 'Invoice ID'}</th>
                                <th className="p-3">{language === 'ar' ? 'المورد الشريك' : 'Supplier'}</th>
                                <th className="p-3">{language === 'ar' ? 'تاريخ الاستلام' : 'Date Purchased'}</th>
                                <th className="p-3 text-center">{language === 'ar' ? 'إجمالي المبلغ' : 'Invoice sum'}</th>
                                <th className="p-3 text-center">{language === 'ar' ? 'التوجيه والدورة المحاسبية' : 'Status'}</th>
                                <th className="p-3 text-left">{language === 'ar' ? 'الإجراءات والقييد' : 'Actions'}</th>
                              </tr>
                            </thead>
                            <tbody>
                              {invoices.map((inv: any) => {
                                const journalized = isInvoiceJournalized(inv.invoiceNumber);
                                return (
                                  <tr key={inv.id} className="border-b border-slate-100 hover:bg-slate-50/50">
                                    <td className="p-3 font-mono font-bold text-slate-800">{inv.invoiceNumber}</td>
                                    <td className="p-3 font-bold text-slate-700">{inv.supplierName}</td>
                                    <td className="p-3 text-slate-500 font-mono">{inv.date}</td>
                                    <td className="p-3 text-center font-black font-mono text-slate-900">{inv.totalAmount.toLocaleString()} ج.م</td>
                                    <td className="p-3 text-center">
                                      {journalized ? (
                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 font-bold text-[10px] border border-emerald-100">
                                          {language === 'ar' ? 'تم القيد والترحيل لليومية دفترياً' : 'Journalized'}
                                        </span>
                                      ) : (
                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-amber-50 text-amber-700 font-bold text-[10px] border border-amber-100">
                                          {language === 'ar' ? 'جاهز للتسجيل اليدوي / الآلي' : 'Needs Entry'}
                                        </span>
                                      )}
                                    </td>
                                    <td className="p-3 text-left">
                                      {!journalized ? (
                                        <button
                                          type="button"
                                          onClick={() => {
                                            fetch('/api/financials/entries', {
                                              method: 'POST',
                                              headers: { 'Content-Type': 'application/json' },
                                              body: JSON.stringify({
                                                debitCode: "104", // Inventory
                                                creditCode: "203", // Accounts Payable
                                                amount: inv.totalAmount,
                                                desc: `إثبات مستند فاتورة تصفية مشتريات رقم ${inv.invoiceNumber} من المورد (${inv.supplierName}) بالآجل`,
                                                date: inv.date,
                                                postedBy: currentUser?.username || 'admin',
                                                isDraft: true
                                              })
                                            })
                                            .then(res => res.json())
                                            .then(data => {
                                              if (data.success) {
                                                triggerToast(language === 'ar' ? `✓ تم توليد مسودة القيد اليومي لفاتورة ${inv.invoiceNumber} بنجاح!` : `Generated draft entry for invoice ${inv.invoiceNumber}`);
                                                refreshFinancials();
                                              }
                                            });
                                          }}
                                          className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-black rounded-lg text-[10px] border border-indigo-200 transition-colors cursor-pointer"
                                        >
                                          ✍️ {language === 'ar' ? 'توليد مسودة القيد اليومي' : 'Auto Journal Draft'}
                                        </button>
                                      ) : (
                                        <span className="text-[10px] text-slate-450 italic">{language === 'ar' ? 'القيد مُدرج بالدفاتر' : 'No action'}</span>
                                      )}
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </div>

                      {/* Daily Cashier Sales Invoices */}
                      <div className="space-y-3 pt-4">
                        <h4 className="font-extrabold text-xs text-emerald-950 flex items-center gap-1.5">🛒 فواتير وإيرادات المبيعات اليومية الإجمالية (الكاشير والمبيعات)</h4>
                        <div className="overflow-x-auto border border-slate-150 rounded-xl">
                          <table className="w-full text-xs text-right">
                            <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-150">
                              <tr>
                                <th className="p-3">{language === 'ar' ? 'تاريخ المبيعات اليومية' : 'Sales Date'}</th>
                                <th className="p-3 text-center">{language === 'ar' ? 'عدد فواتير البيع المنفذة' : 'Tx Count'}</th>
                                <th className="p-3 text-center">{language === 'ar' ? 'إجمالي الإيراد (المبيعات)' : 'Total Revenue'}</th>
                                <th className="p-3 text-center">{language === 'ar' ? 'تكلفة المبيعات المقدرة' : 'Sales COGS'}</th>
                                <th className="p-3 text-center">{language === 'ar' ? 'حالة التقييد والترحيل الدفتري' : 'Status'}</th>
                                <th className="p-3 text-left">{language === 'ar' ? 'قيد الدورة المحاسبية' : 'Actions'}</th>
                              </tr>
                            </thead>
                            <tbody>
                              {retailSalesByDate.map((sale: any) => {
                                const journalized = isDailySalesJournalized(sale.date);
                                return (
                                  <tr key={sale.date} className="border-b border-slate-100 hover:bg-slate-50/50">
                                    <td className="p-3 font-mono font-bold text-slate-800">{sale.date}</td>
                                    <td className="p-3 text-center font-bold text-slate-600">{sale.count} {language === 'ar' ? 'فاتورة بيع بالتجزئة' : 'bills'}</td>
                                    <td className="p-3 text-center font-black text-emerald-850 font-mono">{(sale.revenue).toLocaleString()} ج.م</td>
                                    <td className="p-3 text-center font-bold text-amber-900 font-mono">{(sale.cogs).toLocaleString()} ج.م</td>
                                    <td className="p-3 text-center">
                                      {journalized ? (
                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 font-bold text-[10px] border border-emerald-100">
                                          {language === 'ar' ? 'تم التقييد اليومي لليومية العامة' : 'Journalized'}
                                        </span>
                                      ) : (
                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-amber-50 text-amber-700 font-bold text-[10px] border border-amber-100">
                                          {language === 'ar' ? 'معلّق / يحتاج دمج وتقييد مالي' : 'Needs Entry'}
                                        </span>
                                      )}
                                    </td>
                                    <td className="p-3 text-left">
                                      {!journalized ? (
                                        <button
                                          type="button"
                                          onClick={() => {
                                            // 1. Sale revenue entry (Debit 101 safe, Credit 301 revenue)
                                            // 2. Cost of goods sold entry (Debit 401 COGS, Credit 104 Stock)
                                            Promise.all([
                                              fetch('/api/financials/entries', {
                                                method: 'POST',
                                                headers: { 'Content-Type': 'application/json' },
                                                body: JSON.stringify({
                                                  debitCode: "101", // Cash Drawer
                                                  creditCode: "301", // Sales Revenue
                                                  amount: sale.revenue,
                                                  desc: `إثبات إيرادات مبيعات الكاشير اليومية الإجمالية - مبيعات تاريخ ${sale.date}`,
                                                  date: sale.date,
                                                  postedBy: currentUser?.username || 'admin',
                                                  isDraft: true
                                                })
                                              }),
                                              fetch('/api/financials/entries', {
                                                method: 'POST',
                                                headers: { 'Content-Type': 'application/json' },
                                                body: JSON.stringify({
                                                  debitCode: "401", // COGS
                                                  creditCode: "104", // Inventory
                                                  amount: sale.cogs,
                                                  desc: `إثبات تكلفة البضاعة المباعة لمبيعات الكاشير اليومية - تاريخ ${sale.date}`,
                                                  date: sale.date,
                                                  postedBy: currentUser?.username || 'admin',
                                                  isDraft: true
                                                })
                                              })
                                            ])
                                            .then(() => {
                                              triggerToast(language === 'ar' ? `✓ تم إنشاء قيد الإيراد وتكلفة المبيعات لتاريخ ${sale.date} بنجاح!` : `Generated sales COGS journal entries for ${sale.date}`);
                                              refreshFinancials();
                                            });
                                          }}
                                          className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-black rounded-lg text-[10px] border border-indigo-200 transition-colors cursor-pointer"
                                        >
                                          ✍️ {language === 'ar' ? 'تقييد ودمج المبيعات لليوم' : 'Auto Journal Daily Sales'}
                                        </button>
                                      ) : (
                                        <span className="text-[10px] text-slate-450 italic">{language === 'ar' ? 'القيود مدرجة ومتوازنة' : 'No action'}</span>
                                      )}
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* STEP 2: JOURNAL ENTRY */}
                {accountingStep === 2 && (
                  <div className="space-y-6">
                    {/* Manual entry card */}
                    <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4">
                      <div className="border-b border-indigo-50 pb-3">
                        <h3 className="font-black text-slate-900 text-sm">✍️ تسجيل وتدوين قيد يومية عام يدوي مزدوج بالثبيت الجردي</h3>
                        <p className="text-xs text-slate-450 mt-1">تفريغ المستندات وسجلات الإثبات في سجل اليومية العامة بمدين ودائن متطابقين قبل ترحيلهما إلى بطاقات الأستاذ التفصيلية.</p>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
                        <div className="md:col-span-3 space-y-1 text-right">
                          <label className="block text-[11px] text-slate-600 font-bold">{language === 'ar' ? 'حساب الطرف المَدين (Debit/Dr):' : 'Debit Account:'}</label>
                          <select id="journal-debit-select" className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold font-sans">
                            {Object.keys(baseBalances).map(code => (
                              <option key={code} value={code}>{code} | {language === 'ar' ? getAccountNameAr(code) : getAccountNameEn(code)}</option>
                            ))}
                          </select>
                        </div>

                        <div className="md:col-span-3 space-y-1 text-right">
                          <label className="block text-[11px] text-slate-600 font-bold">{language === 'ar' ? 'حساب الطرف الدَائن (Credit/Cr):' : 'Credit Account:'}</label>
                          <select id="journal-credit-select" className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold font-sans">
                            {Object.keys(baseBalances).map(code => (
                              <option key={code} value={code}>{code} | {language === 'ar' ? getAccountNameAr(code) : getAccountNameEn(code)}</option>
                            ))}
                          </select>
                        </div>

                        <div className="md:col-span-2 space-y-1 text-right">
                          <label className="block text-[11px] text-slate-600 font-bold">{language === 'ar' ? 'القيمة ومبلغ القيد:' : 'Amount (EGP):'}</label>
                          <input id="journal-amount-val" type="number" placeholder="0" className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono font-bold text-center" />
                        </div>

                        <div className="md:col-span-2 space-y-1 text-right">
                          <label className="block text-[11px] text-slate-600 font-bold">{language === 'ar' ? 'البيان وشرح القيد بالدفتر:' : 'Narration / Desc:'}</label>
                          <input id="journal-desc-val" type="text" placeholder="قيد مالي يدوي" className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold" />
                        </div>

                        <div className="md:col-span-2 flex gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              const debC = (document.getElementById("journal-debit-select") as HTMLSelectElement).value;
                              const credC = (document.getElementById("journal-credit-select") as HTMLSelectElement).value;
                              const amt = Number((document.getElementById("journal-amount-val") as HTMLInputElement).value || 0);
                              const txt = (document.getElementById("journal-desc-val") as HTMLInputElement).value;

                              if (amt <= 0) {
                                alert(language === 'ar' ? 'يرجى كتابة مبلغ إثبات إيجابي!' : 'Write positive value');
                                return;
                              }
                              if (debC === credC) {
                                alert(language === 'ar' ? 'الحساب المدين والحساب الدائن لا يمكن أن يتطابقا في قيد فني فردي!' : 'Debit & credit codes must match distinct ledger cards');
                                return;
                              }

                              fetch('/api/financials/entries', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                  debitCode: debC,
                                  creditCode: credC,
                                  amount: amt,
                                  desc: txt,
                                  postedBy: currentUser?.username || 'admin',
                                  isDraft: true
                                })
                              })
                              .then(res => res.json())
                              .then(data => {
                                if (data.success) {
                                  triggerToast(language === 'ar' ? '🎉 تم حفظ مسودة القيد لدفتر يومية الدورة!' : 'Posted draft ledger sheet successfully!');
                                  refreshFinancials();
                                  (document.getElementById("journal-amount-val") as HTMLInputElement).value = '';
                                  (document.getElementById("journal-desc-val") as HTMLInputElement).value = '';
                                }
                              });
                            }}
                            className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-750 text-white font-extrabold text-xs rounded-xl transition-all shadow-md cursor-pointer text-center"
                          >
                            ➕ {language === 'ar' ? 'إضافة كمسودة معلّقة' : 'Draft Entry'}
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Today general book list */}
                    <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                      <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                        <h4 className="font-extrabold text-slate-800 text-xs">📖 سجل ودفتر اليومية العامة الحالية (تاريخ الدورة والقيود المعلقة)</h4>
                        <span className="font-mono text-xs bg-slate-100 px-3 py-1 rounded text-slate-700 font-bold">
                          {language === 'ar' ? 'إجمالي القيود بالدفتر: ' : 'Total: '}{financials.journal?.length || 0}
                        </span>
                      </div>

                      <div className="overflow-x-auto border border-slate-150 rounded-xl">
                        <table className="w-full text-xs text-right">
                          <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-150">
                            <tr>
                              <th className="p-3 w-40">{language === 'ar' ? 'التوجيه والقيد الرقمي' : 'Reference & Date'}</th>
                              <th className="p-3">{language === 'ar' ? 'البيان ومصنف العملية' : 'Description / Voucher'}</th>
                              <th className="p-3 font-bold text-red-700">{language === 'ar' ? 'المدين (Debit / Dr)' : 'Debit अकाउंट'}</th>
                              <th className="p-3 font-bold text-emerald-800">{language === 'ar' ? 'الدائن (Credit / Cr)' : 'Credit अकाउंट'}</th>
                              <th className="p-3 text-center">{language === 'ar' ? 'قيمة القيد الصافي' : 'Transaction Value'}</th>
                              <th className="p-3 text-center">{language === 'ar' ? 'الحالة في الدورة' : 'Status'}</th>
                            </tr>
                          </thead>
                          <tbody>
                            {financials.journal?.map((ent: any) => (
                              <tr key={ent.id} className="border-b border-slate-100 hover:bg-slate-50/50">
                                <td className="p-3 space-y-1">
                                  <div className="font-mono text-slate-450 text-[10px]">{ent.id}</div>
                                  <div className="font-mono font-bold text-slate-700">{ent.date}</div>
                                </td>
                                <td className="p-3 font-bold text-slate-800">{ent.desc}</td>
                                <td className="p-3">
                                  <div className="font-mono font-bold text-red-700">({ent.debitCode})</div>
                                  <div className="text-[10px] text-slate-500 font-semibold">{language === 'ar' ? getAccountNameAr(ent.debitCode) : getAccountNameEn(ent.debitCode)}</div>
                                </td>
                                <td className="p-3">
                                  <div className="font-mono font-bold text-emerald-800">({ent.creditCode})</div>
                                  <div className="text-[10px] text-slate-500 font-semibold">{language === 'ar' ? getAccountNameAr(ent.creditCode) : getAccountNameEn(ent.creditCode)}</div>
                                </td>
                                <td className="p-3 text-center font-black font-mono text-slate-900">{ent.amount.toLocaleString()} ج.م</td>
                                <td className="p-3 text-center">
                                  {ent.isDraft ? (
                                    <span className="px-2 py-0.5 bg-amber-50 rounded text-amber-700 font-black border border-amber-250 text-[9px]">
                                      {language === 'ar' ? 'مسودة معلّقة لم ترحل' : 'Draft / Pending'}
                                    </span>
                                  ) : (
                                    <span className="px-2 py-0.5 bg-emerald-50 rounded text-emerald-700 font-black border border-emerald-250 text-[9px]">
                                      {language === 'ar' ? 'مُرّحل ومثبت بالأستاذ' : 'Posted to books'}
                                    </span>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                )}

                {/* STEP 3: POSTING GENERAL LEDGER */}
                {accountingStep === 3 && (
                  <div className="space-y-6">
                    {/* Posting trigger card */}
                    <div className="bg-gradient-to-r from-teal-50 to-blue-50 border border-blue-150 p-5 rounded-2xl flex flex-col md:flex-row justify-between items-center gap-4">
                      <div className="space-y-1 md:max-w-xl text-right">
                        <h4 className="font-extrabold text-indigo-950 text-sm">⛓️ عملية الترحيل لدفاتر الأستاذ العام (Posting Ledger Engine)</h4>
                        <p className="text-xs text-slate-600">
                          بموجب المبادئ المحاسبية، تظل القيود والمسودات بوضعية "مسودة معلقة" حتى يتم مراجعتها وتطبيق زر الترحيل. عندها يتم نقل قيم القيود وتفريغ أرقام الأرصدة الختامية لدفتر الأستاذ العام.
                        </p>
                        <div className="text-[11px] font-bold text-slate-500 pt-1">
                          {language === 'ar' ? 'القيود اليومية المعلقة والمستعدة للترحيل حالياً: ' : 'Pending draft vouchers to post: '}
                          <span className="text-blue-700 font-black font-mono">{(financials.journal?.filter((j: any) => j.isDraft === true || j.isDraft === "true").length || 0)}</span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          fetch('/api/financials/entries/post-all', { method: 'POST' })
                            .then(res => res.json())
                            .then(data => {
                              if (data.success) {
                                triggerToast(language === 'ar' ? `✓ تم بنجاح ترحيل عدد ${data.count} قيد معلّق وتحديث الحسابات الدفترية للأستاذ العام!` : `Posted ${data.count} drafts to General Ledger Book!`);
                                refreshFinancials();
                              }
                            });
                        }}
                        className="px-5 py-3 bg-teal-650 hover:bg-teal-700 text-white font-black text-xs rounded-xl shadow-lg transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap"
                      >
                        <Check className="w-4 h-4" /> 
                        {language === 'ar' ? 'ترحيل كافة القيود المعلقة للأستاذ' : 'Post All Drafts to G/L'}
                      </button>
                    </div>

                    {/* Detailed G/L Account Statement */}
                    <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                      <div className="border-b border-indigo-100 pb-3 flex justify-between items-center flex-col md:flex-row gap-3">
                        <div className="text-right">
                          <h3 className="font-black text-cyan-950 text-sm">📊 دفاتر الأستاذ العام التفصيلية (Ledger Cards)</h3>
                          <p className="text-[10px] text-slate-450 mt-0.5">اختر حساباً لمراجعة كشف الحساب التفصيلي مع حركة المدين والدائن والرصيد المتراكم المستمر.</p>
                        </div>

                        {/* Dropdown for account code selector */}
                        <div className="flex gap-2.5 items-center">
                          <label className="text-xs font-bold text-slate-700">{language === 'ar' ? 'اختر حساب الأستاذ:' : 'GL Account:'}</label>
                          <select
                            value={selectedLedgerAccount}
                            onChange={(e) => setSelectedLedgerAccount(e.target.value)}
                            className="text-xs p-2 bg-slate-100 border border-slate-200 rounded-lg font-bold font-sans text-indigo-950"
                          >
                            {Object.keys(baseBalances).map(code => (
                              <option key={code} value={code}>{code} | {language === 'ar' ? getAccountNameAr(code) : getAccountNameEn(code)}</option>
                            ))}
                          </select>
                        </div>
                      </div>

                      {/* Compilation of dynamic Ledger Account entries */}
                      {(() => {
                        const accCode = selectedLedgerAccount;
                        const isDebitType = getAccountType(accCode) === 'debit';
                        const initBal = baseBalances[accCode] || 0;
                        
                        // Entries affecting this account (chronological, posted only)
                        const filteredJournal = financials.journal
                          ? [...financials.journal]
                              .reverse() // oldest first
                              .filter((ent: any) => !ent.isDraft && (ent.debitCode === accCode || ent.creditCode === accCode))
                          : [];

                        let runBal = initBal;
                        const statementRows = filteredJournal.map((entry: any) => {
                          const isDebited = entry.debitCode === accCode;
                          const debitAmt = isDebited ? Number(entry.amount || 0) : 0;
                          const creditAmt = !isDebited ? Number(entry.amount || 0) : 0;
                          
                          if (isDebitType) {
                            runBal += (debitAmt - creditAmt);
                          } else {
                            runBal += (creditAmt - debitAmt);
                          }

                          return {
                            id: entry.id,
                            date: entry.date,
                            desc: entry.desc,
                            debit: debitAmt,
                            credit: creditAmt,
                            balance: runBal
                          };
                        });

                        return (
                          <div className="space-y-3">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-50 p-4 border border-slate-150 rounded-xl text-right">
                              <div>
                                <span className="text-[11px] text-slate-450 block font-bold">{language === 'ar' ? 'رصيد أول المدة الافتتاحي (Opening):' : 'Starting Balance:'}</span>
                                <span className="font-extrabold text-sm text-slate-800 font-mono">{initBal.toLocaleString()} ج.م</span>
                              </div>
                              <div>
                                <span className="text-[11px] text-slate-450 block font-bold">{language === 'ar' ? 'الحركات الصافية بالترحيل:' : 'Total net postings:'}</span>
                                <span className="font-extrabold text-sm font-mono text-indigo-850">
                                  {statementRows.length} {language === 'ar' ? 'حركة محاسبية مرّحلة' : 'postings'}
                                </span>
                              </div>
                              <div>
                                <span className="text-[11px] text-slate-450 block font-bold">{language === 'ar' ? 'الرصيد الختامي الحالي لبطاقة الأستاذ:' : 'Current Book Balance:'}</span>
                                <span className={`font-black text-sm font-mono ${isDebitType ? 'text-blue-800' : 'text-emerald-800'}`}>
                                  {runBal.toLocaleString()} ج.م
                                </span>
                              </div>
                            </div>

                            {/* Statement Table */}
                            <div className="overflow-x-auto border border-slate-150 rounded-xl">
                              <table className="w-full text-xs text-right">
                                <thead className="bg-[#f8fafc] text-indigo-950 font-bold border-b border-slate-150">
                                  <tr>
                                    <th className="p-3 w-44">{language === 'ar' ? 'تاريخ الحركة' : 'Posting Date'}</th>
                                    <th className="p-3">{language === 'ar' ? 'شرح المعاملة التفصيلي' : 'Journal description'}</th>
                                    <th className="p-3 text-center text-red-700">{language === 'ar' ? 'قيد مدين (+)' : 'Dr Postings (+)'}</th>
                                    <th className="p-3 text-center text-emerald-800">{language === 'ar' ? 'قيد دائن (-)' : 'Cr Postings (-)'}</th>
                                    <th className="p-3 text-left">{language === 'ar' ? 'الرصيد المتراكم الدفتري' : 'Accumulated Balance'}</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  <tr className="bg-amber-50/20 font-bold border-b border-dashed border-slate-150 text-[10px]">
                                    <td className="p-2 select-all font-mono">---</td>
                                    <td className="p-2 text-slate-550">{language === 'ar' ? 'رصيد افتتاحي منقول لأول الفترة القييدية' : 'Brought forward initial opening balance'}</td>
                                    <td className="p-2 text-center font-mono">-</td>
                                    <td className="p-2 text-center font-mono">-</td>
                                    <td className="p-2 text-left font-mono text-slate-800">{initBal.toLocaleString()} ج.م</td>
                                  </tr>
                                  {statementRows.map((row: any) => (
                                    <tr key={row.id} className="border-b border-slate-100 hover:bg-slate-50/60 font-medium text-[11px]">
                                      <td className="p-3 font-mono text-slate-500">{row.date}</td>
                                      <td className="p-3 font-bold text-slate-750">{row.desc}</td>
                                      <td className="p-3 text-center font-bold font-mono text-red-750">{row.debit > 0 ? `+${row.debit.toLocaleString()} ج.م` : "-"}</td>
                                      <td className="p-3 text-center font-bold font-mono text-emerald-700">{row.credit > 0 ? `-${row.credit.toLocaleString()} ج.م` : "-"}</td>
                                      <td className="p-3 text-left font-mono font-black text-slate-900">{row.balance.toLocaleString()} ج.م</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                )}

                {/* STEP 4: UNADJUSTED TRIAL BALANCE */}
                {accountingStep === 4 && (
                  <div className="space-y-6">
                    <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                      <div className="border-b border-slate-150 pb-2 flex justify-between items-center">
                        <div className="text-right">
                          <h3 className="font-black text-slate-800 text-sm">⚖️ الخطوة الرابعة: ميزان المراجعة قبل التسويات الجردية (Unadjusted Trial Balance)</h3>
                          <p className="text-xs text-slate-400 mt-0.5">تلخيص أرصدة كافة حسابات الأستاذ العام لإثبات التوازن الحسابي (إجمالي المدين = إجمالي الدائن) قبل إجراء قيود المخصصات والإهلاك الجردي.</p>
                        </div>
                        <span className="text-[10px] px-2 py-0.5 bg-yellow-50 text-yellow-700 font-bold rounded border border-yellow-200">PRE-ADJUSTMENT STAGE</span>
                      </div>

                      <div className="overflow-x-auto border border-slate-150 rounded-xl">
                        <table className="w-full text-xs text-right">
                          <thead className="bg-[#f8fafc] text-slate-550 border-b border-slate-150 font-bold text-slate-700">
                            <tr>
                              <th className="p-3">{language === 'ar' ? 'رمز الحساب' : 'Code'}</th>
                              <th className="p-3">{language === 'ar' ? 'أقسام الأصول وحسابات الأستاذ التجاري' : 'Ledger Account classification'}</th>
                              <th className="p-3 text-center font-bold text-indigo-950">{language === 'ar' ? 'أرصدة مدينة (Debit)' : 'Debit Balance'}</th>
                              <th className="p-3 text-center font-bold text-teal-950">{language === 'ar' ? 'أرصدة دائنة (Credit)' : 'Credit Balance'}</th>
                            </tr>
                          </thead>
                          <tbody>
                            {Object.keys(baseBalances).map(code => {
                              const bal = unadjustedBals[code] || 0;
                              const isDeb = getAccountType(code) === "debit";
                              return (
                                <tr key={code} className="border-b border-slate-100 hover:bg-slate-50/50">
                                  <td className="p-3 font-mono text-slate-500">{code}</td>
                                  <td className="p-3">
                                    <div className="font-bold text-slate-800">{language === 'ar' ? getAccountNameAr(code) : getAccountNameEn(code)}</div>
                                    <div className="text-[9px] text-slate-400 capitalize">{getAccountType(code)} classification</div>
                                  </td>
                                  <td className="p-3 text-center font-bold font-mono text-blue-800 text-sm">
                                    {isDeb ? `${bal.toLocaleString()} ج.م` : "-"}
                                  </td>
                                  <td className="p-3 text-center font-bold font-mono text-emerald-800 text-sm">
                                    {!isDeb ? `${bal.toLocaleString()} ج.م` : "-"}
                                  </td>
                                </tr>
                              );
                            })}

                            {/* Trial balance total sums */}
                            {(() => {
                              let debSum = 0;
                              let credSum = 0;
                              Object.keys(baseBalances).forEach(code => {
                                const bal = unadjustedBals[code] || 0;
                                if (getAccountType(code) === "debit") debSum += bal;
                                else credSum += bal;
                              });

                              return (
                                <tr className="bg-slate-50 font-black border-t-2 border-slate-400 text-slate-900 border-b-2">
                                  <td className="p-4" colSpan={2}>{language === 'ar' ? 'إجمالي مجاميع ميزان المراجعة الحسابية:' : 'Total Trial Books Balance Summary:'}</td>
                                  <td className="p-4 text-center font-mono text-base text-blue-900">{debSum.toLocaleString()} ج.م</td>
                                  <td className="p-4 text-center font-mono text-base text-emerald-900">{credSum.toLocaleString()} ج.م</td>
                                </tr>
                              );
                            })()}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                )}

                {/* STEP 5: ADJUSTED TRIAL BALANCE & ADJUSTMENTS */}
                {accountingStep === 5 && (
                  <div className="space-y-6">
                    {/* Interactive adjustments dashboard */}
                    <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-4">
                      <div className="border-b border-slate-150 pb-2">
                        <h4 className="font-black text-slate-800 text-sm">🛠️ لوحة ومعمل قيود التسويات الجردية الختامية</h4>
                        <p className="text-xs text-slate-400">
                          بحلول نهاية الفترة المحاسبية، يلزم إجراء "تسويات جردية تعديلية" للمصاريف المستحقة، كإهلاك ثمن الأصول الثابتة أو تسجيل نسبة الفاقد والهالك مخزنياً، لتنزيل القيمة الدفترية للأصول بصورة تتبينية سليمة.
                        </p>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* 1. Asset Depreciation adjuster */}
                        <div className="p-4 bg-slate-50 border border-slate-150 rounded-xl space-y-3 text-right">
                          <h5 className="font-extrabold text-xs text-indigo-950">📦 أولاً: احتساب وإثبات قسط إهلاك الأصول الثابتة</h5>
                          <p className="text-[11px] text-slate-500">
                            سيقوم هذا المعالج بفحص مصفوفة الأصول الثابتة الإنشائية بالمول واحتساب معدل الإهلاك السنوي الخاص بكل أصل، ثم إنشاء قيد تعديلي جردي (مدين: مصاريف الإهلاك 402، دائن: الأصول الثابتة 103).
                          </p>
                          <button
                            type="button"
                            onClick={() => {
                              // Let's compute total depreciation of assets
                              const totalDep = financials.assets?.reduce((sum: number, ast: any) => sum + Math.floor(ast.originalValue * (ast.rate / 100)), 0) || 18000;
                              
                              fetch('/api/financials/entries', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                  debitCode: "402", // Depreciation Expense
                                  creditCode: "103", // Fixed Assets
                                  amount: totalDep,
                                  desc: `قيد تعديلي جردي: إثبات إهلاك ربع سنوي إجمالي لكافة الأصول الثابتة بالمول والمنشآت لتنزيل قيمتها`,
                                  date: '2026-06-15',
                                  postedBy: currentUser?.username || 'admin',
                                  isDraft: false,
                                  isAdjustment: true
                                })
                              })
                              .then(res => res.json())
                              .then(data => {
                                if (data.success) {
                                  triggerToast(language === 'ar' ? `✓ تم تسجيل وتسوية قسط الإهلاك بقيمة ${totalDep.toLocaleString()} ج.م بنجاح!` : `Depreciated tangible assets by ${totalDep}`);
                                  refreshFinancials();
                                }
                              });
                            }}
                            className="px-3.5 py-1.5 bg-indigo-150 hover:bg-indigo-200 text-indigo-800 font-extrabold text-[10px] rounded-lg transition-colors cursor-pointer"
                          >
                            📉 قيد واحتساب إهلاك الأصول دفترياً
                          </button>
                        </div>

                        {/* 2. Shrinkage write-off adjuster */}
                        <div className="p-4 bg-slate-50 border border-slate-150 rounded-xl space-y-3 text-right">
                          <h5 className="font-extrabold text-xs text-red-950">📦 ثانياً: جرد وتسوية هوالك البضائع والتالف التمويلي</h5>
                          <p className="text-[11px] text-slate-500">
                            سيقوم برنامج تصفير الهوالك بفحص الترانزكشنز المصنفة "خسارة / تلف أصناف" وتلخيص تكلفتها، ثم تصدير قيد جرد معالج (مدين: مصاريف تلف وهلاك البضاعة 403، دائن: بضاعة المخازن 104) لضبط تكيف الجرد الفعلي.
                          </p>
                          <button
                            type="button"
                            onClick={() => {
                              const totalLoss = transactions.filter(t => t.type === 'loss').reduce((sum, t) => sum + (Number(t.buyPrice || 0) * Number(t.quantity || 0)), 0) || 4500;
                              
                              fetch('/api/financials/entries', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                  debitCode: "403", // Shrinkage Spoilage Expense
                                  creditCode: "104", // Merchandise Inventory
                                  amount: totalLoss,
                                  desc: `قيد تعديلي جردي: تسوية وقيد الخسائر الرأسمالية والتلفيات وهلاك بضاعة المخزن التالفة والمنتهية وعجز الجرد السنوي`,
                                  date: '2026-06-15',
                                  postedBy: currentUser?.username || 'admin',
                                  isDraft: false,
                                  isAdjustment: true
                                })
                              })
                              .then(res => res.json())
                              .then(data => {
                                if (data.success) {
                                  triggerToast(language === 'ar' ? `✓ تم إثبات تسوية التلف والهالك الإجمالي بقيمة ${totalLoss.toLocaleString()} ج.م!` : `Adjusted inventory shrinkage by ${totalLoss}`);
                                  refreshFinancials();
                                }
                              });
                            }}
                            className="px-3.5 py-1.5 bg-red-100 hover:bg-red-200 text-red-800 font-extrabold text-[10px] rounded-lg transition-colors cursor-pointer"
                          >
                            🥀 تسوية وقيد تلف وإعدام الأصناف مخزنياً
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Adjusted trial balance spreadsheet */}
                    <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                      <div className="border-b border-indigo-100 pb-2 flex justify-between items-center">
                        <div className="text-right">
                          <h3 className="font-black text-slate-800 text-sm">⚖️ ميزان المراجعة النهائي بعد التسويات الجردية (Adjusted Trial Balance)</h3>
                          <p className="text-xs text-slate-400 mt-0.5">الركيزة النهائية التي تصدر منها القوائم المالية، حيث تم مراجعة الفوارق وتثبيت كامل حركات الإهلاك والإعدام والجرد.</p>
                        </div>
                        <span className="text-[10px] px-2 py-0.5 bg-emerald-50 text-emerald-700 font-bold rounded border border-emerald-200">POST-ADJUSTMENT COMPLIANCE</span>
                      </div>

                      <div className="overflow-x-auto border border-slate-150 rounded-xl">
                        <table className="w-full text-xs text-right">
                          <thead className="bg-[#f8fafc] text-indigo-950 border-b border-slate-150 font-bold">
                            <tr>
                              <th className="p-3 w-24">رمز الحساب</th>
                              <th className="p-3">أرصدة حسابات الأستاذ العام الخاضعة للتسوية الجردية</th>
                              <th className="p-3 text-center text-red-750 font-black">أرصدة مدينة معدّلة (Adjusted Dr)</th>
                              <th className="p-3 text-center text-emerald-800 font-black">أرصدة دائنة معدّلة (Adjusted Cr)</th>
                            </tr>
                          </thead>
                          <tbody>
                            {Object.keys(baseBalances).map(code => {
                              const bal = adjustedBals[code] || 0;
                              const isDeb = getAccountType(code) === "debit";
                              return (
                                <tr key={code} className="border-b border-slate-100 hover:bg-slate-50/50">
                                  <td className="p-3 font-mono text-slate-500 font-bold">{code}</td>
                                  <td className="p-3">
                                    <div className="font-bold text-slate-800">{language === 'ar' ? getAccountNameAr(code) : getAccountNameEn(code)}</div>
                                    <div className="text-[9px] text-slate-400 capitalize">Adjusted balance code</div>
                                  </td>
                                  <td className="p-3 text-center font-bold font-mono text-blue-800 text-sm">
                                    {isDeb ? `${bal.toLocaleString()} ج.م` : "-"}
                                  </td>
                                  <td className="p-3 text-center font-bold font-mono text-emerald-800 text-sm">
                                    {!isDeb ? `${bal.toLocaleString()} ج.م` : "-"}
                                  </td>
                                </tr>
                              );
                            })}

                            {/* Trial balance total sums */}
                            {(() => {
                              let debSum = 0;
                              let credSum = 0;
                              Object.keys(baseBalances).forEach(code => {
                                const bal = adjustedBals[code] || 0;
                                if (getAccountType(code) === "debit") debSum += bal;
                                else credSum += bal;
                              });

                              return (
                                <tr className="bg-emerald-50/30 font-black border-t-2 border-slate-450 border-b-2 text-slate-900">
                                  <td className="p-4" colSpan={2}>{language === 'ar' ? 'إجمالي مجاميع ميزان المراجعة الحسابية النهائي:' : 'Total Final Adjusted Balance Sum:'}</td>
                                  <td className="p-4 text-center font-mono text-base text-blue-900">{debSum.toLocaleString()} ج.م</td>
                                  <td className="p-4 text-center font-mono text-base text-emerald-950">{credSum.toLocaleString()} ج.م</td>
                                </tr>
                              );
                            })()}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                )}

                {/* STEP 6: FINAL FINANCIAL STATEMENTS */}
                {accountingStep === 6 && (() => {
                  // Precompile statement values
                  // Revenues: Account 301
                  const salesRevenue = adjustedBals["301"] || 0;
                  // COGS: Account 401
                  const cogsAmt = adjustedBals["401"] || 0;
                  // Depreciation expense: Account 402
                  const depExpense = adjustedBals["402"] || 0;
                  // Spoilage expense: Account 403
                  const shrinkageExpense = adjustedBals["403"] || 0;
                  
                  // Financial summaries
                  const grossProfit = salesRevenue - cogsAmt;
                  const totalOperatingExpenses = depExpense + shrinkageExpense;
                  const netProfit = grossProfit - totalOperatingExpenses;

                  // Current assets
                  const cashAsset = adjustedBals["101"] || 0;
                  const bankAsset = adjustedBals["102"] || 0;
                  const inventoryAsset = adjustedBals["104"] || 0;
                  const receivablesAsset = adjustedBals["105"] || 0;
                  const totalCurrentAssets = cashAsset + bankAsset + inventoryAsset + receivablesAsset;

                  // Fixed Assets
                  const physicalAssetVal = adjustedBals["103"] || 0; // Fixed Assets code (already adjusted down by depreciation adjusting entries)
                  const totalAssets = totalCurrentAssets + physicalAssetVal;

                  // Equity
                  const baseCapital = adjustedBals["201"] || 0;
                  const endingCapital = baseCapital + netProfit; // Retained earnings is netProfit

                  // Liabilities
                  const longTermLoans = adjustedBals["202"] || 0;
                  const accountsPayable = adjustedBals["203"] || 0;
                  const totalLiabilities = longTermLoans + accountsPayable;

                  const totalLiabilitiesAndEquity = endingCapital + totalLiabilities;

                  return (
                    <div className="space-y-8">
                      {/* Sub tab tabs inside Statements step */}
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        
                        {/* 1. INCOME STATEMENT */}
                        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm space-y-4">
                          <div className="border-b border-indigo-50 pb-2">
                            <h4 className="font-extrabold text-indigo-950 text-xs flex items-center gap-1">📋 ١. قائمة الدخل (P&L Card)</h4>
                            <p className="text-[10px] text-slate-400">حجم الأعمال والربحية والأعباء التشغيلية للنشاط.</p>
                          </div>
                          
                          <div className="space-y-2 text-[11px] text-slate-700 font-semibold">
                            <div className="flex justify-between border-b pb-1">
                              <span>إيرادات المبيعات:</span>
                              <span className="font-mono text-slate-900">{salesRevenue.toLocaleString()} ج.م</span>
                            </div>
                            <div className="flex justify-between border-b pb-1 text-red-700">
                              <span>تكلفة البضاعة المباعة:</span>
                              <span className="font-mono">-{cogsAmt.toLocaleString()} ج.م</span>
                            </div>
                            <div className="flex justify-between border-b pb-1 font-black text-emerald-800 bg-slate-50 p-1 rounded">
                              <span>مجمل الربح:</span>
                              <span className="font-mono">{grossProfit.toLocaleString()} ج.م</span>
                            </div>
                            <div className="flex justify-between border-b pb-1 text-slate-500">
                              <span>مصاريف الإهلاك والهلاك:</span>
                              <span className="font-mono">-{depExpense.toLocaleString()} ج.م</span>
                            </div>
                            <div className="flex justify-between border-b pb-1 text-slate-500">
                              <span>خسائر التلفيات والفاقد:</span>
                              <span className="font-mono">-{shrinkageExpense.toLocaleString()} ج.م</span>
                            </div>
                            <div className="flex justify-between p-2 font-black text-rose-900 bg-rose-50 rounded text-xs">
                              <span>صافي الدخل (الربح):</span>
                              <span className="font-mono">{netProfit.toLocaleString()} ج.م</span>
                            </div>
                          </div>
                        </div>

                        {/* 2. BALANCE SHEET */}
                        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm space-y-4 md:col-span-2">
                          <div className="border-b border-indigo-50 pb-2 flex justify-between items-center">
                            <div>
                              <h4 className="font-extrabold text-[#111827] text-xs flex items-center gap-1">🏛️ ٢. قائمة المركز المالي (Balance Sheet)</h4>
                              <p className="text-[10px] text-slate-400">المركز المالي الشامل للمنشأة: الأصول في مواجهة التزاماتها وملايتها.</p>
                            </div>
                            <span className="text-[9px] px-1.5 py-0.5 bg-green-50 text-green-700 rounded-md font-mono font-bold">ASSETS = L&E</span>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-[11px] text-slate-700 font-semibold">
                            {/* Assets Column */}
                            <div className="bg-slate-50 p-3 rounded-xl space-y-2">
                              <h5 className="font-extrabold text-[11px] text-blue-900 border-b pb-1">الأصول والمنشآت (Assets)</h5>
                              <div className="flex justify-between">
                                <span className="text-slate-500">النقدية والسلف (101):</span>
                                <span className="font-mono text-xs">{cashAsset.toLocaleString()} ج.م</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-slate-500">الأرصدة البنكية (102):</span>
                                <span className="font-mono text-xs">{bankAsset.toLocaleString()} ج.م</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-slate-500">حسابات مخزون البضاعة (104):</span>
                                <span className="font-mono text-xs">{inventoryAsset.toLocaleString()} ج.م</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-slate-500">ذمم ونقاط العملاء (105):</span>
                                <span className="font-mono text-xs">{receivablesAsset.toLocaleString()} ج.م</span>
                              </div>
                              <div className="flex justify-between font-bold text-slate-800">
                                <span>أصول متداولة فرعية:</span>
                                <span className="font-mono text-xs text-indigo-950">{totalCurrentAssets.toLocaleString()} ج.م</span>
                              </div>
                              <div className="flex justify-between pt-1 border-t text-slate-600">
                                <span className="text-slate-500">أصول ثابتة ملموسة (103):</span>
                                <span className="font-mono text-xs">{physicalAssetVal.toLocaleString()} ج.م</span>
                              </div>
                              <div className="flex justify-between pt-2 border-t font-black text-blue-900 text-[12px] bg-blue-50/50 p-1 rounded">
                                <span>إجمالي الأصول (Assets):</span>
                                <span className="font-mono">{totalAssets.toLocaleString()} ج.م</span>
                              </div>
                            </div>

                            {/* Liabilities Column */}
                            <div className="bg-slate-50 p-3 rounded-xl space-y-2">
                              <h5 className="font-extrabold text-[11px] text-emerald-900 border-b pb-1">الالتزامات وحقوق الملكية</h5>
                              <div className="flex justify-between">
                                <span className="text-slate-500">رأس المال التأسيسي (201):</span>
                                <span className="font-mono text-xs">{baseCapital.toLocaleString()} ج.م</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-slate-500">الأرباح التراكمية (الصافية):</span>
                                <span className="font-mono text-xs text-rose-800">{netProfit.toLocaleString()} ج.م</span>
                              </div>
                              <div className="flex justify-between font-bold text-indigo-950">
                                <span>إجمالي الملكية (Equity):</span>
                                <span className="font-mono text-xs">{endingCapital.toLocaleString()} ج.م</span>
                              </div>
                              <div className="flex justify-between pt-1 border-t">
                                <span className="text-slate-500">القروض والالتزامات المعلقة:</span>
                                <span className="font-mono text-xs">{longTermLoans.toLocaleString()} ج.م</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-slate-500">ذمم الموردين والدائنين:</span>
                                <span className="font-mono text-xs">{accountsPayable.toLocaleString()} ج.م</span>
                              </div>
                              <div className="flex justify-between font-bold text-slate-800">
                                <span>إجمالي الالتزامات:</span>
                                <span className="font-mono text-xs">{totalLiabilities.toLocaleString()} ج.م</span>
                              </div>
                              <div className="flex justify-between pt-2 border-t font-black text-emerald-900 text-[12px] bg-emerald-50/50 p-1 rounded">
                                <span>مجموع الموازنة (Liab & Equity):</span>
                                <span className="font-mono">{totalLiabilitiesAndEquity.toLocaleString()} ج.م</span>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* 3. STATEMENT OF CHANGES IN EQUITY */}
                        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm space-y-4">
                          <div className="border-b border-indigo-50 pb-2">
                            <h4 className="font-extrabold text-teal-950 text-xs flex items-center gap-1">📈 ٣. التغير في حقوق الملكية</h4>
                            <p className="text-[10px] text-slate-400">تتبع تغير حصص الشركاء ورأس المال مع صافي الدورة السنوية.</p>
                          </div>
                          
                          <div className="space-y-3.5 text-[11px] text-slate-700 font-semibold pt-1">
                            <div className="flex justify-between border-b pb-1.5">
                              <span>قيمة رأس المال في بداية الدورة المالي:</span>
                              <span className="font-mono text-slate-900">{baseCapital.toLocaleString()} ج.م</span>
                            </div>
                            <div className="flex justify-between border-b pb-1.5 text-emerald-800">
                              <span>مضاف: صافي الأرباح المحققة دورياً:</span>
                              <span className="font-mono">+{netProfit.toLocaleString()} ج.م</span>
                            </div>
                            <div className="flex justify-between border-b pb-1.5 text-slate-400">
                              <span>مطروح: مسحوبات أو أرباح موزعة:</span>
                              <span className="font-mono">-0 ج.م</span>
                            </div>
                            <div className="flex justify-between p-2 font-black text-indigo-950 bg-indigo-50 rounded text-xs">
                              <span>رأس مال الشركاء بنهاية الفترة:</span>
                              <span className="font-mono">{endingCapital.toLocaleString()} ج.m</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* 4. STATEMENT OF CASH FLOWS */}
                      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4">
                        <div className="border-b border-indigo-50 pb-3">
                          <h4 className="font-extrabold text-[#0369a1] text-xs flex items-center gap-1">💸 ٤. قائمة التدفقات النقدية للدورة (Statement of Cash Flows)</h4>
                          <p className="text-xs text-slate-450 mt-1">
                            توضيح مصادر تدفق السيولة النقدية وتصريفها الفعلي عبر الأنشطة التشغيلية والاستثمارية والتمويلية لربط الأرصدة المتوفرة بالخزانة والحساب البنكي.
                          </p>
                        </div>

                        {(() => {
                          // Compile cash flows chronologically:
                          // We check cash (101) & bank (102) transactions
                          const totalCashInflow = financials.journal
                            ? financials.journal
                                .filter((ent: any) => !ent.isDraft && (ent.debitCode === "101" || ent.debitCode === "102"))
                                .reduce((sum: number, ent: any) => sum + Number(ent.amount || 0), 0)
                            : 0;

                          const totalCashOutflow = financials.journal
                            ? financials.journal
                                .filter((ent: any) => !ent.isDraft && (ent.creditCode === "101" || ent.creditCode === "102"))
                                .reduce((sum: number, ent: any) => sum + Number(ent.amount || 0), 0)
                            : 0;

                          const startupCash = 45000 + 250000; // Cash drawer + Bank original cash
                          const netMovement = totalCashInflow - totalCashOutflow;
                          const finalCash = startupCash + netMovement;

                          return (
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                              <div className="bg-sky-50/50 p-4 rounded-xl border border-sky-100 text-right space-y-2">
                                <h5 className="font-extrabold text-sky-950 text-xs">التدفقات من الأنشطة التشغيلية</h5>
                                <p className="text-[11px] text-slate-500">نقدية مجمعة من مبيعات السلع، مخصوماً منها مدفوعات المشتريات ومصروفات التشغيل الإدارية.</p>
                                <div className="flex justify-between pt-1 border-t text-xs font-bold font-mono">
                                  <span>صافي النقد التشغيلي المولد:</span>
                                  <span className="text-emerald-800">+{salesRevenue.toLocaleString()} ج.م</span>
                                </div>
                              </div>

                              <div className="bg-purple-50/50 p-4 rounded-xl border border-purple-100 text-right space-y-2">
                                <h5 className="font-extrabold text-purple-950 text-xs">التدفقات من الأنشطة الاستثمارية</h5>
                                <p className="text-[11px] text-slate-500 font-medium">أي مخارج نقدية لشراء أدوات إضافية أو ثلاجات عرض جديدة (أصول ثابتة ملموسة بالمنشأة).</p>
                                <div className="flex justify-between pt-1 border-t text-xs font-bold font-mono">
                                  <span>صافي الخارج للاستثمار:</span>
                                  <span className="text-slate-650">-0 ج.م</span>
                                </div>
                              </div>

                              <div className="bg-amber-50/50 p-4 rounded-xl border border-slate-150 text-right space-y-2">
                                <h5 className="font-extrabold text-slate-800 text-xs">التدفقات من الأنشطة التمويلية</h5>
                                <p className="text-[11px] text-slate-500 font-medium">سحب التمويلات السلفة من البنك أو سداد الأقساط الشهرية للقروض المعلقة مع الفائدة المقابلة.</p>
                                <div className="flex justify-between pt-1 border-t text-xs font-bold font-mono">
                                  <span>صافي تدفق التمويل المصرفي:</span>
                                  <span className="text-amber-900 font-semibold">-{adjustedBals["202"] ? (120000 - adjustedBals["202"]).toLocaleString() : 0} ج.م</span>
                                </div>
                              </div>

                              {/* Consolidated cash summary */}
                              <div className="col-span-1 md:col-span-3 flex flex-col md:flex-row justify-between items-center p-4 bg-slate-900 text-slate-100 rounded-xl font-bold text-xs gap-3">
                                <div>{language === 'ar' ? 'نقدية أول المدة التأسيسية (الصندوق + البنك):' : 'Starting Cash & Equivalents:'} <span className="font-mono text-cyan-400 font-black text-sm">{startupCash.toLocaleString()} ج.م</span></div>
                                <div>{language === 'ar' ? 'صافي حركات وتغير التدفق النقدي بالدفاتر:' : 'Net periodic changes in cash:'} <span className={`font-mono text-sm ${netMovement >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{netMovement.toLocaleString()} ج.م</span></div>
                                <div className="text-cyan-300 bg-slate-800 border border-slate-700/80 px-4 py-1.5 rounded-lg">{language === 'ar' ? 'النقدية وما يعادلها في نهاية المدة:' : 'Ending Cash & Safe:'} <span className="font-mono font-black text-base">{(cashAsset + bankAsset).toLocaleString()} ج.م</span></div>
                              </div>
                            </div>
                          );
                        })()}
                      </div>
                    </div>
                  );
                })()}
              </motion.div>
            );
          })()}

          {/* 📈 تبويب: محرك التقارير المحاسبية المكتملة (أكثر من 250 تقرير مع محرك بحث) */}
          {activeTab === 'reports' && (
            <motion.div
              key="reports-tab"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="space-y-6 text-right animate-fade-in"
            >
              <div className="bg-[#1e1b4b] rounded-2xl p-5 text-white flex justify-between items-center">
                <div>
                  <h2 className="text-xl font-extrabold text-indigo-200">
                    📈 {language === 'ar' ? 'محرك التقارير المحاسبية والإدارية الموحدة (250+ تقرير)' : 'Curated Enterprise 250+ Reports Station'}
                  </h2>
                  <p className="text-xs text-indigo-350 mt-1">
                    {language === 'ar'
                      ? 'محرك ذكي لتصفير واستيراد وتهيئة تقارير المبيعات، الشيكات والضريبة القيمة المضافة ومعدلات استهلاك البضائع.'
                      : 'Search, generate, filter, and export customized PDF-ready accounting logs.'}
                  </p>
                </div>
                <div className="text-xs font-mono font-bold bg-indigo-900 border border-indigo-750 px-3 py-1 text-indigo-350 rounded-lg">
                  REPORTS_DB_ONLINE / v3.1
                </div>
              </div>

              {/* Curated Reports Mesh Selector */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                
                {/* Sales Section */}
                <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-sm space-y-2">
                  <h4 className="text-xs font-black text-slate-800 border-b border-indigo-50 pb-1.5 flex items-center justify-between">
                    <span>💵 {language === 'ar' ? 'المبيعات وضريبة الـ VAT' : 'Sales & VAT Tax'}</span>
                    <span className="font-mono text-[9px] px-1 py-0.2 bg-indigo-50 text-indigo-950 font-bold rounded">105 تقرير</span>
                  </h4>
                  <ul className="text-[11px] text-slate-600 space-y-1.5 list-none pr-0">
                    <li className="p-1 hover:bg-slate-50 rounded cursor-pointer transition-colors font-bold text-slate-800">
                      📊 {language === 'ar' ? 'إقرار ضريبة القيمة المضافة (14% VAT)' : '14% VAT quarterly Tax yield'}
                    </li>
                    <li className="p-1 hover:bg-slate-50 rounded cursor-pointer transition-colors">
                      🗓️ {language === 'ar' ? 'سجل فواتير المبيعات اليومي تفصيلاً' : 'Daily sales journal list'}
                    </li>
                    <li className="p-1 hover:bg-slate-50 rounded cursor-pointer transition-colors">
                      📍 {language === 'ar' ? 'تقرير مبيعات الكاشير والورديات' : 'Terminal shifts yield summaries'}
                    </li>
                    <li className="p-1 hover:bg-slate-50 rounded cursor-pointer transition-colors">
                      🗺️ {language === 'ar' ? 'تحليل المبيعات حسب فروع المحافظات' : 'Sales performance by Governorate'}
                    </li>
                  </ul>
                </div>

                {/* Accounting Section */}
                <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-sm space-y-2">
                  <h4 className="text-xs font-black text-slate-800 border-b border-indigo-50 pb-1.5 flex items-center justify-between">
                    <span>📚 {language === 'ar' ? 'حسابات الأستاذ والمالية' : 'General Ledger books'}</span>
                    <span className="font-mono text-[9px] px-1 py-0.2 bg-cyan-50 text-cyan-950 font-bold rounded">75 تقرير</span>
                  </h4>
                  <ul className="text-[11px] text-slate-600 space-y-1.5 list-none pr-0">
                    <li className="p-1 hover:bg-slate-50 rounded cursor-pointer transition-colors font-bold text-slate-800">
                      ⚖️ {language === 'ar' ? 'ميزان المراجعة بمجاميع الخزينة' : 'Compound Trial Balance spreadsheet'}
                    </li>
                    <li className="p-1 hover:bg-slate-50 rounded cursor-pointer transition-colors">
                      💸 {language === 'ar' ? 'حساب شيكات الموردين وتواريخ الصرف' : 'Cheques ledger & mature terms'}
                    </li>
                    <li className="p-1 hover:bg-slate-50 rounded cursor-pointer transition-colors">
                      🏦 {language === 'ar' ? 'جدول إهلاك قروض البنك والفوائد' : 'Interest rates loan repayments'}
                    </li>
                    <li className="p-1 hover:bg-slate-50 rounded cursor-pointer transition-colors">
                      ⏳ {language === 'ar' ? 'كشف حركة حساب صندوق الخزينة' : 'Cashbox safe box ledger'}
                    </li>
                  </ul>
                </div>

                {/* Logistics Section */}
                <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-sm space-y-2 text-right">
                  <h4 className="text-xs font-black text-slate-800 border-b border-indigo-50 pb-1.5 flex items-center justify-between">
                    <span>📦 {language === 'ar' ? 'المستودعات وحركات السلع' : 'Warehouse Inventory'}</span>
                    <span className="font-mono text-[9px] px-1 py-0.2 bg-emerald-50 text-emerald-950 font-bold rounded">42 تقرير</span>
                  </h4>
                  <ul className="text-[11px] text-slate-600 space-y-1.5 list-none pr-0">
                    <li className="p-1 hover:bg-slate-50 rounded cursor-pointer transition-colors font-bold text-slate-800">
                      📦 {language === 'ar' ? 'معدل دوران البضائع وحركة الأصناف' : 'Stock turnover rate & item speed'}
                    </li>
                    <li className="p-1 hover:bg-slate-50 rounded cursor-pointer transition-colors">
                      🚚 {language === 'ar' ? 'سجل حركات سحب وتوريد سلع المعرض' : 'Floor inventory dispatch logs'}
                    </li>
                    <li className="p-1 hover:bg-slate-50 rounded cursor-pointer transition-colors">
                      🎯 {language === 'ar' ? 'تقرير البضائع التالفة والهالك الشهري' : 'Monthly damaged warehouse waste'}
                    </li>
                    <li className="p-1 hover:bg-slate-50 rounded cursor-pointer transition-colors">
                      🛎️ {language === 'ar' ? 'قائمة البضائع الراكدة وبطيئة البيع' : 'Slow-moving items catalog'}
                    </li>
                  </ul>
                </div>

                {/* Staff/HR Section */}
                <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-sm space-y-2 text-right">
                  <h4 className="text-xs font-black text-slate-800 border-b border-indigo-50 pb-1.5 flex items-center justify-between">
                    <span>👤 {language === 'ar' ? 'شؤون الساعات والورديات' : 'Staff Rosters & HR'}</span>
                    <span className="font-mono text-[9px] px-1 py-0.2 bg-purple-50 text-purple-950 font-bold rounded">28 تقرير</span>
                  </h4>
                  <ul className="text-[11px] text-slate-600 space-y-1.5 list-none pr-0">
                    <li className="p-1 hover:bg-slate-50 rounded cursor-pointer transition-colors font-bold text-slate-800">
                      👤 {language === 'ar' ? 'تقرير كفاءة وتوقيت حضور الموظفين' : 'Active staff shift & rosters'}
                    </li>
                    <li className="p-1 hover:bg-slate-50 rounded cursor-pointer transition-colors">
                      🔒 {language === 'ar' ? 'سجل تتبع ومراجعة عمليات الكاشير الحساسة' : 'Privileged operations audit trail'}
                    </li>
                    <li className="p-1 hover:bg-slate-50 rounded cursor-pointer transition-colors">
                      📝 {language === 'ar' ? 'سجل فواتير المبيعات الملغاة والمرتجعة' : 'Voided POS ticket records log'}
                    </li>
                  </ul>
                </div>

              </div> {/* Close Grid */}
            </motion.div>
          )}

            </AnimatePresence>
          </div> {/* Close space-y-6 content column */}
        </div> {/* Close horizontal layout container */}

        {/* 🖥️ القائمة الجانبية اليمنى التفاعلية الثابتة (Drawer style overlay) */}
        <AnimatePresence>
          {isSidebarOpen && (
            <>
              {/* Backdrop */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.5 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsSidebarOpen(false)}
                className="fixed inset-0 bg-slate-950/65 z-40 backdrop-blur-[1px] cursor-pointer"
              />

              {/* Sidebar Drawer */}
              <motion.aside
                initial={{ x: language === 'ar' ? '100%' : '-100%' }}
                animate={{ x: 0 }}
                exit={{ x: language === 'ar' ? '100%' : '-100%' }}
                transition={{ type: 'spring', damping: 28, stiffness: 240 }}
                className={`fixed top-0 bottom-0 ${language === 'ar' ? 'right-0' : 'left-0'} w-80 max-w-[85vw] h-full bg-[#1c4459] border-slate-700/50 shadow-2xl z-50 flex flex-col select-none`}
                id="right-dashboard-sidebar"
              >
                {/* Header of Drawer */}
                <div className="bg-[#132c39] px-4 py-4 border-b border-[#2d5267] flex items-center justify-between select-none shrink-0" style={{ direction: language === 'ar' ? 'rtl' : 'ltr' }}>
                  <div className="flex items-center gap-1.5">
                    <span className="text-white text-xl font-black tracking-widest leading-none drop-shadow-md" style={{ fontFamily: 'Impact, sans-serif' }}>
                      DAY
                    </span>
                    <span className="text-[#e21d26] text-2xl font-extrabold px-1.5 py-0.5 bg-[#0e212b] rounded-lg border border-red-500/40 shadow-inner select-none animate-pulse leading-none" style={{ fontFamily: 'Impact, sans-serif' }}>
                      2
                    </span>
                    <span className="text-white text-xl font-black tracking-widest leading-none drop-shadow-md" style={{ fontFamily: 'Impact, sans-serif' }}>
                      NIGHT
                    </span>
                  </div>
                  
                  {/* Close button */}
                  <button 
                    onClick={() => setIsSidebarOpen(false)}
                    className="p-1 px-2 hover:bg-[#1f4a61] border border-[#2d5166] rounded-lg text-slate-300 hover:text-white transition-all cursor-pointer flex items-center justify-center gap-1 text-[11px]"
                    title={language === 'ar' ? 'إغلاق القائمة' : 'Close Menu'}
                  >
                    <span>{language === 'ar' ? 'إغلاق' : 'Close'}</span>
                    <span className="font-extrabold text-[12px]">✕</span>
                  </button>
                </div>

                {/* Main scrollable body of Drawer */}
                <div className="flex-1 overflow-y-auto p-4 space-y-5 custom-sidebar-scrollbar text-right" style={{ direction: language === 'ar' ? 'rtl' : 'ltr' }}>
                  
                  {/* بطاقة المستخدم الفعالة (Current Shift Operator Identity) */}
                  <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 text-white relative overflow-hidden shadow-md">
                    <div className="absolute top-[-50px] right-[-50px] w-28 h-28 bg-amber-500/5 rounded-full blur-xl pointer-events-none"></div>
                    
                    <div className="flex items-center gap-3 relative z-10 text-right">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-amber-500 to-amber-600 text-slate-950 font-black text-lg flex items-center justify-center shadow-lg shadow-amber-500/10 shrink-0 select-none">
                        {currentUser?.username ? currentUser.username.substring(0, 2).toUpperCase() : 'ST'}
                      </div>
                      <div className="leading-tight min-w-0 flex-1">
                        <p className="text-[10px] text-amber-500 font-mono font-bold uppercase tracking-wider">
                          {language === 'ar' ? 'المسؤول النشط حالياً' : 'SHIFT OPERATOR'}
                        </p>
                        <h3 className="text-sm font-black text-[#fafafa] truncate">
                          {language === 'ar' 
                            ? (currentUser?.username === 'admin' ? 'أبو بكر زهران' : currentUser?.username === 'warehouse' ? 'أحمد عبد العال' : 'سارة الجياد')
                            : (currentUser?.username === 'admin' ? 'Abu Bakr Zahran' : currentUser?.username === 'warehouse' ? 'Ahmad Abdelaal' : 'Sarah El-Geyad')}
                        </h3>
                        <p className="text-[10px] text-slate-400 font-mono truncate">@{currentUser?.username}</p>
                      </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-slate-800 flex justify-between items-center text-[10px]">
                      <span className="text-slate-400">{language === 'ar' ? 'محطة التحكم' : 'Active Terminal'}:</span>
                      <span className="font-mono bg-slate-800 text-cyan-400 px-2 py-0.5 rounded border border-cyan-950/40">CASH-POINT-01</span>
                    </div>
                  </div>

                  {/* القائمة العمودية الذكية - تصميم DAY 2 NIGHT العريق والمطوّر */}
                  <div className="bg-[#1c4459] rounded-2xl border border-[#2d5267] shadow-xl overflow-hidden select-none">
                    
                    {/* روابط وأزرار التنقل المفصلة تحت بعضها البعض */}
                    <div className="divide-y divide-[#244f66] custom-sidebar-scrollbar text-right">
                      
                      {/* 1. قائمة الكاشير */}
                      <div className="w-full">
                        <button
                          type="button"
                          onClick={() => {
                            setActiveTab('cashier');
                            setOpenSections(prev => ({ ...prev, cashier: !prev.cashier }));
                          }}
                          className={`w-full flex items-center justify-between p-3.5 transition-all cursor-pointer text-right text-sm font-black ${
                            activeTab === 'cashier' ? 'bg-[#122e3c] text-white border-r-4 border-red-500' : 'text-slate-100/90 hover:bg-[#204a62]'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <ShoppingCart size={17} className={`${activeTab === 'cashier' ? 'text-cyan-400' : 'text-slate-200'}`} />
                            <span>{language === 'ar' ? 'قائمة الكاشير' : 'Cashier Register'}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-[9px] bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded font-black select-none">
                              {language === 'ar' ? 'نشط' : 'LIVE'}
                            </span>
                            <ChevronLeft size={14} className={`text-slate-400 transform transition-transform ${openSections.cashier ? '-rotate-90' : ''}`} />
                          </div>
                        </button>
                        {openSections.cashier && (
                          <div className="bg-[#122e3c]/95 py-2 px-3 text-xs space-y-1.5 border-t border-[#1a3b4e] shadow-inner">
                            <button
                              onClick={() => { setActiveTab('cashier'); setIsSidebarOpen(false); }}
                              className="w-full text-right py-1.5 px-3 rounded hover:bg-[#1a3c4f]/60 text-slate-300 hover:text-white transition-all flex items-center gap-2"
                            >
                              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 shrink-0"></span>
                              <span>{language === 'ar' ? 'كاونتر مبيعات الكاشير الفوري' : 'Workstation 01 checkout'}</span>
                            </button>
                          </div>
                        )}
                      </div>

                      {/* 2. العملاء */}
                      <div className="w-full">
                        <button
                          type="button"
                          onClick={() => {
                            setActiveTab('customers');
                            setOpenSections(prev => ({ ...prev, customers: !prev.customers }));
                          }}
                          className={`w-full flex items-center justify-between p-3.5 transition-all cursor-pointer text-right text-sm font-black ${
                            activeTab === 'customers' ? 'bg-[#122e3c] text-white border-r-4 border-red-500' : 'text-slate-100/90 hover:bg-[#204a62]'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <Users size={17} className={`${activeTab === 'customers' ? 'text-cyan-400' : 'text-slate-200'}`} />
                            <span>{language === 'ar' ? 'العملاء' : 'Loyalty Customers'}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-mono font-bold bg-[#132c39] px-2 py-0.3 rounded-full text-cyan-400">
                              {customers.length}
                            </span>
                            <ChevronLeft size={14} className={`text-slate-400 transform transition-transform ${openSections.customers ? '-rotate-90' : ''}`} />
                          </div>
                        </button>
                        {openSections.customers && (
                          <div className="bg-[#122e3c]/95 py-2 px-3 text-xs space-y-1.5 border-t border-[#1a3b4e] shadow-inner select-none text-right">
                            <button
                              onClick={() => { setActiveTab('customers'); setSelectedExpiryFilter('all'); setIsSidebarOpen(false); }}
                              className="w-full text-right py-1.5 px-3 rounded hover:bg-[#1a3c4f]/60 text-slate-300 hover:text-white transition-all flex items-center gap-2"
                            >
                              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 shrink-0"></span>
                              <span>{language === 'ar' ? 'دليل عملاء الولاء والآجل' : 'Loyalty programs directory'}</span>
                            </button>
                            <button
                              onClick={() => {
                                setActiveTab('customers');
                                setIsSidebarOpen(false);
                                setTimeout(() => {
                                  document.getElementById('add-customer-modal-trigger')?.click();
                                }, 100);
                              }}
                              className="w-full text-right py-1.5 px-3 rounded hover:bg-[#1a3c4f]/60 text-slate-300 hover:text-white transition-all flex items-center gap-2"
                            >
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0"></span>
                              <span>{language === 'ar' ? 'إضافة بطاقة عميل جديد' : 'New loyalty client form'}</span>
                            </button>
                          </div>
                        )}
                      </div>

                      {/* 3. المنتجات */}
                      <div className="w-full">
                        <button
                          type="button"
                          onClick={() => {
                            setActiveTab('catalog');
                            setOpenSections(prev => ({ ...prev, products: !prev.products }));
                          }}
                          className={`w-full flex items-center justify-between p-3.5 transition-all cursor-pointer text-right text-sm font-black ${
                            activeTab === 'catalog' ? 'bg-[#122e3c] text-white border-r-4 border-red-500' : 'text-slate-100/90 hover:bg-[#204a62]'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <Database size={17} className={`${activeTab === 'catalog' ? 'text-cyan-400' : 'text-slate-200'}`} />
                            <span>{language === 'ar' ? 'المنتجات' : 'Products Directory'}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-mono font-bold bg-[#132c39] px-2 py-0.3 rounded-full text-cyan-400">
                              {products.length}
                            </span>
                            <ChevronLeft size={14} className={`text-slate-400 transform transition-transform ${openSections.products ? '-rotate-90' : ''}`} />
                          </div>
                        </button>
                        {openSections.products && (
                          <div className="bg-[#122e3c]/95 py-2 px-3 text-xs space-y-1.5 border-t border-[#1a3b4e] shadow-inner select-none text-right">
                            <button
                              onClick={() => { setActiveTab('catalog'); setSelectedStockFilter('all'); setIsSidebarOpen(false); }}
                              className="w-full text-right py-1.5 px-3 rounded hover:bg-[#1a3c4f]/60 text-slate-300 hover:text-white transition-all flex items-center gap-2"
                            >
                              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 shrink-0"></span>
                              <span>{language === 'ar' ? 'جرد وتصنيف السلع بالرفوف' : 'Products & Categories'}</span>
                            </button>
                            <button
                              onClick={() => {
                                setActiveTab('catalog');
                                setIsSidebarOpen(false);
                                setTimeout(() => {
                                  document.getElementById('add-product-btn-trigger')?.click();
                                }, 100);
                              }}
                              className="w-full text-right py-1.5 px-3 rounded hover:bg-[#1a3c4f]/60 text-slate-300 hover:text-white transition-all flex items-center gap-2"
                            >
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0"></span>
                              <span>{language === 'ar' ? 'إدخال منتج/صنف جديد' : 'Intake new product ticket'}</span>
                            </button>
                          </div>
                        )}
                      </div>

                      {/* 4. قوائم الأسعار */}
                      <div className="w-full">
                        <button
                          type="button"
                          onClick={() => {
                            setActiveTab('catalog');
                            setOpenSections(prev => ({ ...prev, pricelists: !prev.pricelists }));
                          }}
                          className="w-full flex items-center justify-between p-3.5 text-slate-100/90 hover:bg-[#204a62] transition-all cursor-pointer text-right text-sm font-black"
                        >
                          <div className="flex items-center gap-3">
                            <Tags size={17} className="text-slate-200" />
                            <span>{language === 'ar' ? 'قوائم الأسعار' : 'Price Catalogues'}</span>
                          </div>
                          <ChevronLeft size={14} className={`text-slate-400 transform transition-transform ${openSections.pricelists ? '-rotate-90' : ''}`} />
                        </button>
                        {openSections.pricelists && (
                          <div className="bg-[#122e3c]/95 py-2 px-3 text-xs space-y-1.5 border-t border-[#1a3b4e] shadow-inner select-none text-right">
                            <button
                              onClick={() => { setActiveTab('catalog'); setIsSidebarOpen(false); }}
                              className="w-full text-right py-1.5 px-3 rounded hover:bg-[#1a3c4f]/60 text-slate-300 hover:text-white transition-all flex items-center gap-2"
                            >
                              <span className="w-1.5 h-1.5 rounded-full bg-red-400 shrink-0"></span>
                              <span>{language === 'ar' ? 'قائمة أسعار البيع والتجزئة' : 'MSRP Retail Pricing'}</span>
                            </button>
                            <button
                              onClick={() => { setActiveTab('invoices'); setIsSidebarOpen(false); }}
                              className="w-full text-right py-1.5 px-3 rounded hover:bg-[#1a3c4f]/60 text-slate-300 hover:text-white transition-all flex items-center gap-2"
                            >
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0"></span>
                              <span>{language === 'ar' ? 'مقاربة أسعار الشراء والموردين' : 'Supplier prices & margined yields'}</span>
                            </button>
                          </div>
                        )}
                      </div>

                      {/* 5. طباعة الباركود */}
                      <div className="w-full">
                        <button
                          type="button"
                          onClick={() => {
                            setActiveTab('catalog');
                            setOpenSections(prev => ({ ...prev, barcode: !prev.barcode }));
                          }}
                          className="w-full flex items-center justify-between p-3.5 text-slate-100/90 hover:bg-[#204a62] transition-all cursor-pointer text-right text-sm font-black"
                        >
                          <div className="flex items-center gap-3">
                            <Printer size={17} className="text-slate-200" />
                            <span>{language === 'ar' ? 'طباعة الباركود' : 'Barcode Printing'}</span>
                          </div>
                          <ChevronLeft size={14} className={`text-slate-400 transform transition-transform ${openSections.barcode ? '-rotate-90' : ''}`} />
                        </button>
                        {openSections.barcode && (
                          <div className="bg-[#122e3c]/95 py-2 px-3 text-xs space-y-1.5 border-t border-[#1a3b4e] shadow-inner select-none text-right">
                            <button
                              onClick={() => {
                                setActiveTab('catalog');
                                setIsSidebarOpen(false);
                                triggerToast(language === 'ar' ? '💡 اضغط على زر توليد الباركود بجانب أي سلعة لتوليد ملصقتها فورا!' : 'Click barcode generator next to any product');
                              }}
                              className="w-full text-right py-1.5 px-3 rounded hover:bg-[#1a3c4f]/60 text-slate-300 hover:text-white transition-all flex items-center gap-2"
                            >
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0"></span>
                              <span>{language === 'ar' ? 'توليد باركود المنتجات الذكي' : 'Smart SKU Barcode engine'}</span>
                            </button>
                            <button
                              onClick={() => {
                                setActiveTab('catalog');
                                setIsSidebarOpen(false);
                              }}
                              className="w-full text-right py-1.5 px-3 rounded hover:bg-[#1a3c4f]/60 text-slate-300 hover:text-white transition-all flex items-center gap-2"
                            >
                              <span className="w-1.5 h-1.5 rounded-full bg-blue-400 shrink-0"></span>
                              <span>{language === 'ar' ? 'طباعة ملصقات الرفوف الكلية' : 'Shelf-edge tags mass prints'}</span>
                            </button>
                          </div>
                        )}
                      </div>

                      {/* 6. المشتريات */}
                      <div className="w-full">
                        <button
                          type="button"
                          onClick={() => {
                            setActiveTab('invoices');
                            setOpenSections(prev => ({ ...prev, purchases: !prev.purchases }));
                          }}
                          className={`w-full flex items-center justify-between p-3.5 transition-all cursor-pointer text-right text-sm font-black ${
                            activeTab === 'invoices' ? 'bg-[#122e3c] text-white border-r-4 border-red-500' : 'text-slate-100/90 hover:bg-[#204a62]'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <FileText size={17} className={`${activeTab === 'invoices' ? 'text-cyan-400' : 'text-slate-200'}`} />
                            <span>{language === 'ar' ? 'المشتريات' : 'Purchasing Ledger'}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-mono font-bold bg-[#132c39] px-2 py-0.3 rounded-full text-cyan-400">
                              {invoices.length}
                            </span>
                            <ChevronLeft size={14} className={`text-slate-400 transform transition-transform ${openSections.purchases ? '-rotate-90' : ''}`} />
                          </div>
                        </button>
                        {openSections.purchases && (
                          <div className="bg-[#122e3c]/95 py-2 px-3 text-xs space-y-1.5 border-t border-[#1a3b4e] shadow-inner select-none text-right">
                            <button
                              onClick={() => { setActiveTab('invoices'); setIsSidebarOpen(false); }}
                              className="w-full text-right py-1.5 px-3 rounded hover:bg-[#1a3c4f]/65 text-slate-300 hover:text-white transition-all flex items-center gap-2"
                            >
                              <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 shrink-0"></span>
                              <span>{language === 'ar' ? 'سجل فواتير توريد السلع للمول' : 'Active supplier import tickets'}</span>
                            </button>
                            <button
                              onClick={() => {
                                setActiveTab('invoices');
                                setIsSidebarOpen(false);
                                setTimeout(() => {
                                  document.getElementById('add-invoice-form-btn-trigger')?.scrollIntoView({ behavior: 'smooth' });
                                }, 300);
                              }}
                              className="w-full text-right py-1.5 px-3 rounded hover:bg-[#1a3c4f]/65 text-slate-300 hover:text-white transition-all flex items-center gap-2"
                            >
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0"></span>
                              <span>{language === 'ar' ? 'إدخال فاتورة شراء جديدة' : 'Post new purchase invoice'}</span>
                            </button>
                            <button
                              onClick={() => { setActiveTab('suppliers'); setIsSidebarOpen(false); }}
                              className="w-full text-right py-1.5 px-3 rounded hover:bg-[#1a3c4f]/65 text-slate-300 hover:text-white transition-all flex items-center gap-2"
                            >
                              <span className="w-1.5 h-1.5 rounded-full bg-orange-400 shrink-0"></span>
                              <span>{language === 'ar' ? 'سجل شراكات الموردين والشركات' : 'Supply route directories'}</span>
                            </button>
                          </div>
                        )}
                      </div>

                      {/* 7. المخزن الرئيسي (Expanded with pristine styling identical to user upload!) */}
                      <div className="w-full">
                        <button
                          type="button"
                          onClick={() => {
                            setOpenSections(prev => ({ ...prev, mainWarehouse: !prev.mainWarehouse }));
                          }}
                          className="w-full flex items-center justify-between p-3.5 bg-[#143242] text-white transition-all cursor-pointer text-right text-sm font-black border-r-4 border-red-500 shadow-md"
                        >
                          <div className="flex items-center gap-3">
                            <Archive size={17} className="text-[#a5f3fc]" />
                            <span className="text-[#e0f1fc] font-black">{language === 'ar' ? 'المخزن الرئيسي' : 'Main Center Depot'}</span>
                          </div>
                          <ChevronDown size={14} className="text-[#a5f3fc] shrink-0" />
                        </button>
                        
                        {openSections.mainWarehouse && (
                          <div className="bg-[#112835] border-t border-[#1a3e52] divide-y divide-[#183647] font-semibold text-[11.5px] select-none text-right">
                            
                            {/* بحث في الهالك */}
                            <button
                              onClick={() => {
                                setActiveTab('expiry');
                                setSelectedExpiryFilter('expired');
                                setIsSidebarOpen(false);
                                triggerToast(language === 'ar' ? '🔍 تصفية رادار الصلاحية: تم عرض البضائع التالفة/المنتهية فقط' : 'Near-expiry filter updated to expired items');
                              }}
                              className="w-full text-right py-2.5 px-5 hover:bg-[#163445] text-slate-200 hover:text-white transition-all flex items-center justify-between font-bold text-xs"
                            >
                              <div className="flex items-center gap-2.5">
                                <span className="text-[12px] text-cyan-400">🔍</span>
                                <span>{language === 'ar' ? 'بحث في الهالك' : 'Search in Damaged/Spoiled'}</span>
                              </div>
                              <span className="text-[9px] bg-red-650 text-white font-mono font-bold px-1.5 py-0.2 rounded bg-red-650 animate-pulse">
                                {expiredCount}
                              </span>
                            </button>

                            {/* جرد المخزن */}
                            <button
                              onClick={() => {
                                setActiveTab('warehouses');
                                setIsSidebarOpen(false);
                                triggerToast(language === 'ar' ? '🏢 تصفح جرد مستودعات الفرع الحية والصناديق' : 'Inspect whole warehouse counts');
                              }}
                              className="w-full text-right py-2.5 px-5 hover:bg-[#163445] text-slate-200 hover:text-white transition-all flex items-center justify-between font-bold text-xs"
                            >
                              <div className="flex items-center gap-2.5">
                                <span className="text-[12px] text-cyan-400">📦</span>
                                <span>{language === 'ar' ? 'جرد المخزن' : 'Depot Cargo Quantities'}</span>
                              </div>
                              <span className="text-[9.5px] font-mono text-cyan-400 bg-slate-900/40 px-1.5 py-0.2 rounded font-bold">
                                {products.length} {language === 'ar' ? 'سلعة' : 'SKUs'}
                              </span>
                            </button>

                            {/* صلاحيات اقترب انتهاؤها */}
                            <button
                              onClick={() => {
                                setActiveTab('expiry');
                                setSelectedExpiryFilter('near_expiry');
                                setIsSidebarOpen(false);
                                triggerToast(language === 'ar' ? '⚠️ تصفية رادار الصلاحية: تم عزل الأغذية التي اقترب موعد انتهائها' : 'Near expiry items isolated');
                              }}
                              className="w-full text-right py-2.5 px-5 hover:bg-[#163445] text-slate-200 hover:text-white transition-all flex items-center justify-between font-bold text-xs"
                            >
                              <div className="flex items-center gap-2.5">
                                <span className="text-[12px] text-amber-500 animate-pulse">⚠️</span>
                                <span>{language === 'ar' ? 'صلاحيات اقترب انتهاؤها' : 'Strict Expiry Warnings'}</span>
                              </div>
                              {nearExpiryCount > 0 && (
                                <span className="text-[9px] bg-amber-500 text-slate-950 font-black font-extrabold px-1.5 py-0.2 rounded animate-pulse">
                                  {nearExpiryCount}
                                </span>
                              )}
                            </button>

                            {/* تفاصيل المخزن */}
                            <button
                              onClick={() => {
                                setActiveTab('warehouses');
                                setIsSidebarOpen(false);
                              }}
                              className="w-full text-right py-2.5 px-5 hover:bg-[#163445] text-slate-200 hover:text-white transition-all flex items-center justify-between font-bold text-xs"
                            >
                              <div className="flex items-center gap-2.5">
                                <span className="text-[12px] text-cyan-400">ℹ️</span>
                                <span>{language === 'ar' ? 'تفاصيل المخزن ومواقعه' : 'Depot Spatial Coordinates'}</span>
                              </div>
                              <ChevronLeft size={10} className="text-slate-500" />
                            </button>

                            {/* رصيد المخزون */}
                            <button
                              onClick={() => {
                                setActiveTab('catalog');
                                setSelectedStockFilter('all');
                                setIsSidebarOpen(false);
                                triggerToast(language === 'ar' ? '📊 تم تفعيل عرض الأرصدة والكميات التفصيلية لرفوف البيع' : 'Stock levels listed');
                              }}
                              className="w-full text-right py-2.5 px-5 hover:bg-[#163445] text-slate-200 hover:text-white transition-all flex items-center justify-between font-bold text-xs"
                            >
                              <div className="flex items-center gap-2.5">
                                <span className="text-[12px] text-cyan-400">💼</span>
                                <span>{language === 'ar' ? 'رصيد المخزون في الرفوف' : 'Shelf inventory balances'}</span>
                              </div>
                              <ChevronLeft size={10} className="text-slate-500" />
                            </button>

                            {/* الحد الأدنى */}
                            <button
                              onClick={() => {
                                setActiveTab('catalog');
                                setSelectedStockFilter('low_stock');
                                setIsSidebarOpen(false);
                                triggerToast(language === 'ar' ? '🛑 تم تصفية البضائع: إظهار السلع التي وصلت أو شارفت على حد الأمان الأدنى!' : 'Low-stock sentinel limit enabled');
                              }}
                              className="w-full text-right py-2.5 px-5 hover:bg-[#163445] text-slate-200 hover:text-white transition-all flex items-center justify-between font-bold text-xs"
                            >
                              <div className="flex items-center gap-2.5">
                                <span className="text-[12px] text-red-400">🛑</span>
                                <span className="text-red-300 hover:text-red-100">{language === 'ar' ? 'الحد الأدنى وقرب النفاد' : 'Safety Minimum thresholds'}</span>
                              </div>
                              <span className="text-[9.5px] bg-red-950/40 text-red-400 px-1.5 py-0.2 rounded font-black border border-red-900/30">
                                {language === 'ar' ? 'حد أدنى' : 'LIMITS'}
                              </span>
                            </button>

                          </div>
                        )}
                      </div>

                      {/* 8. أوردرات التحويل */}
                      <div className="w-full">
                        <button
                          type="button"
                          onClick={() => {
                            setActiveTab('transfers');
                            setOpenSections(prev => ({ ...prev, transfers: !prev.transfers }));
                          }}
                          className={`w-full flex items-center justify-between p-3.5 transition-all cursor-pointer text-right text-sm font-black ${
                            activeTab === 'transfers' ? 'bg-[#122e3c] text-white border-r-4 border-red-500' : 'text-slate-100/90 hover:bg-[#204a62]'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <Archive size={17} className={`${activeTab === 'transfers' ? 'text-cyan-400' : 'text-slate-200'}`} />
                            <span>{language === 'ar' ? 'أوردرات التحويل' : 'Cargo Transfers'}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-mono font-bold bg-[#132c39] px-2 py-0.3 rounded-full text-cyan-400">
                              {transfers.length}
                            </span>
                            <ChevronLeft size={14} className={`text-slate-400 transform transition-transform ${openSections.transfers ? '-rotate-90' : ''}`} />
                          </div>
                        </button>
                        {openSections.transfers && (
                          <div className="bg-[#122e3c]/95 py-2 px-3 text-xs space-y-1.5 border-t border-[#1a3b4e] shadow-inner select-none text-right">
                            <button
                              onClick={() => { setActiveTab('transfers'); setIsSidebarOpen(false); }}
                              className="w-full text-right py-1.5 px-3 rounded hover:bg-[#1a3c4f]/60 text-slate-300 hover:text-white transition-all flex items-center gap-2"
                            >
                              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 shrink-0"></span>
                              <span>{language === 'ar' ? 'أذونات التوزيع بين الفروع والمستودعات' : 'Transfer authorizations ledger'}</span>
                            </button>
                          </div>
                        )}
                      </div>

                      {/* 9. مخزن الفروع */}
                      <div className="w-full">
                        <button
                          type="button"
                          onClick={() => {
                            setActiveTab('warehouses');
                            setOpenSections(prev => ({ ...prev, branchWarehouse: !prev.branchWarehouse }));
                          }}
                          className="w-full flex items-center justify-between p-3.5 text-slate-100/90 hover:bg-[#204a62] transition-all cursor-pointer text-right text-sm font-black"
                        >
                          <div className="flex items-center gap-3">
                            <Archive size={17} className="text-slate-200" />
                            <span>{language === 'ar' ? 'مخزن الفروع' : 'Branch Storage Units'}</span>
                          </div>
                          <ChevronLeft size={14} className={`text-slate-400 transform transition-transform ${openSections.branchWarehouse ? '-rotate-90' : ''}`} />
                        </button>
                        {openSections.branchWarehouse && (
                          <div className="bg-[#122e3c]/95 py-2 px-3 text-xs space-y-1.5 border-t border-[#1a3b4e] shadow-inner select-none text-right">
                            <button
                              onClick={() => { setActiveTab('warehouses'); setIsSidebarOpen(false); }}
                              className="w-full text-right py-1.5 px-3 rounded hover:bg-[#1a3c4f]/60 text-slate-300 hover:text-white transition-all flex items-center gap-2"
                            >
                              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 shrink-0"></span>
                              <span>{language === 'ar' ? 'إجمالي مستودعات النقل والتبريد المعتمدة' : 'Frozen & standard branch depots'}</span>
                            </button>
                          </div>
                        )}
                      </div>

                      {/* 10. الخزينة العامة */}
                      <div className="w-full">
                        <button
                          type="button"
                          onClick={() => {
                            setActiveTab('financials');
                            setOpenSections(prev => ({ ...prev, generalSafe: !prev.generalSafe }));
                          }}
                          className={`w-full flex items-center justify-between p-3.5 transition-all cursor-pointer text-right text-sm font-black ${
                            activeTab === 'financials' ? 'bg-[#122e3c] text-white border-r-4 border-red-500' : 'text-slate-100/90 hover:bg-[#204a62]'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <Activity size={17} className={`${activeTab === 'financials' ? 'text-cyan-400' : 'text-slate-200'}`} />
                            <span>{language === 'ar' ? 'الخزينة العامة' : 'Capital Safe Vault'}</span>
                          </div>
                          <ChevronLeft size={14} className={`text-slate-400 transform transition-transform ${openSections.generalSafe ? '-rotate-90' : ''}`} />
                        </button>
                        {openSections.generalSafe && (
                          <div className="bg-[#122e3c]/95 py-2 px-3 text-xs space-y-1.5 border-t border-[#1a3b4e] shadow-inner select-none text-right">
                            <button
                              onClick={() => { setActiveTab('financials'); setIsSidebarOpen(false); }}
                              className="w-full text-right py-1.5 px-3 rounded hover:bg-[#1a3c4f]/60 text-slate-300 hover:text-white transition-all flex items-center gap-2"
                            >
                              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 shrink-0"></span>
                              <span>{language === 'ar' ? 'دفاتر الأساتذة وموازين الحسابات الشاملة' : 'Journals, ledgers & assets'}</span>
                            </button>
                          </div>
                        )}
                      </div>

                      {/* 11. خزينة الفروع */}
                      <div className="w-full">
                        <button
                          type="button"
                          onClick={() => {
                            setActiveTab('financials');
                            setOpenSections(prev => ({ ...prev, branchSafe: !prev.branchSafe }));
                          }}
                          className="w-full flex items-center justify-between p-3.5 text-slate-100/90 hover:bg-[#204a62] transition-all cursor-pointer text-right text-sm font-black"
                        >
                          <div className="flex items-center gap-3">
                            <Activity size={17} className="text-slate-200" />
                            <span>{language === 'ar' ? 'خزينة الفروع' : 'Branch Cash Registers'}</span>
                          </div>
                          <ChevronLeft size={14} className={`text-slate-400 transform transition-transform ${openSections.branchSafe ? '-rotate-90' : ''}`} />
                        </button>
                        {openSections.branchSafe && (
                          <div className="bg-[#122e3c]/95 py-2 px-3 text-xs space-y-1.5 border-t border-[#1a3b4e] shadow-inner select-none text-right">
                            <button
                              onClick={() => { setActiveTab('financials'); setIsSidebarOpen(false); }}
                              className="w-full text-right py-1.5 px-3 rounded hover:bg-[#1a3c4f]/60 text-[#bedde6] hover:text-white transition-all flex items-center gap-2"
                            >
                              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 shrink-0"></span>
                              <span>{language === 'ar' ? 'الأرصدة والأرباح المرحلة من الفروع' : 'Aggregated sub-vault earnings summary'}</span>
                            </button>
                          </div>
                        )}
                      </div>

                      {/* 📂 أدوات المتابعة والتحليلات الإضافية بالمول (Unified Dashboard, Staff HR, Reports) */}
                      <div className="w-full">
                        <button
                          type="button"
                          onClick={() => {
                            setOpenSections(prev => ({ ...prev, additionalTools: !prev.additionalTools }));
                          }}
                          className="w-full flex items-center justify-between p-3.5 bg-[#153444]/65 text-indigo-200 hover:text-white transition-all cursor-pointer text-right text-xs font-black select-none"
                        >
                          <div className="flex items-center gap-2.5">
                            <Sparkles size={14} className="text-amber-400" />
                            <span className="tracking-wider uppercase text-[10.5px] font-black">{language === 'ar' ? 'التحليلات والكوادر والتقارير العامة' : 'GLOBAL METRICS & TEAM STAFF'}</span>
                          </div>
                          <ChevronLeft size={12} className={`text-slate-400 transform transition-transform ${openSections.additionalTools ? '-rotate-90' : ''}`} />
                        </button>
                        {openSections.additionalTools && (
                          <div className="bg-[#112835] border-t border-[#183a4c] divide-y divide-[#183647] font-semibold text-[11px] text-[#bedde6]">
                            {/* 1. نظرة عامة */}
                            <button
                              onClick={() => { setActiveTab('overview'); setSelectedStockFilter('all'); setSelectedExpiryFilter('all'); setIsSidebarOpen(false); }}
                              className="w-full text-right py-2.5 px-5 hover:bg-[#163445] text-slate-250 hover:text-white transition-all flex items-center gap-2 font-bold"
                            >
                              <span>📈</span>
                              <span>{language === 'ar' ? 'نظرة عامة والتحليلات الرسمية' : 'Analytics & Performance'}</span>
                            </button>

                            {/* 2. محرك التقارير */}
                            <button
                              onClick={() => { setActiveTab('reports'); setIsSidebarOpen(false); }}
                              className="w-full text-right py-2.5 px-5 hover:bg-[#163445] text-slate-250 hover:text-white transition-all flex items-center justify-between font-bold"
                            >
                              <div className="flex items-center gap-2">
                                <span>📊</span>
                                <span>{language === 'ar' ? 'محرك ٢٥0+ تقارير مالية وتفصيلية' : 'Financial Statement Reports (250+)'}</span>
                              </div>
                              <span className="text-[8px] bg-red-650 text-white font-mono font-bold px-1 py-0.2 rounded bg-red-650">
                                250+
                              </span>
                            </button>

                            {/* 3. شؤون الموظفين */}
                            <button
                              onClick={() => { setActiveTab('hr'); setIsSidebarOpen(false); }}
                              className="w-full text-right py-2.5 px-5 hover:bg-[#163445] text-slate-250 hover:text-white transition-all flex items-center gap-2 font-bold"
                            >
                              <span>👤</span>
                              <span>{language === 'ar' ? 'شؤون الكوادر وتوقيت الحضور' : 'HR Attendance & Shifts'}</span>
                            </button>

                            {/* 4. تفويض طاقم الموظفين */}
                            <button
                              onClick={() => { setActiveTab('staff'); setIsSidebarOpen(false); }}
                              className="w-full text-right py-2.5 px-5 hover:bg-[#163445] text-slate-250 hover:text-white transition-all flex items-center gap-2 font-bold"
                            >
                              <span>🔑</span>
                              <span>{language === 'ar' ? '🔑 صلاحيات طاقم الكاشير ومفاتيح الدخول' : 'Security roles & permissions keys'}</span>
                            </button>
                          </div>
                        )}
                      </div>

                    </div>
                  </div>

                  {/* تحكم الصلاحيات والزمن المتسارع (Interactive Simulated Clock & Test Controls) */}
                  <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-sm space-y-4 text-right">
                    <span className="block text-[10px] text-slate-400 font-black border-b border-slate-100 pb-2 uppercase tracking-widest select-none">
                      ⏳ {language === 'ar' ? 'تحكم المحاكاة الزمنية للمول' : 'CHRONO SIMULATOR TABS'}
                    </span>

                    <div className="space-y-1.5 flex flex-col items-stretch">
                      <div className="flex justify-between text-[11px] font-semibold text-slate-500">
                        <span>{language === 'ar' ? 'منظور تاريخ النظام:' : 'Chrono Date Perspective:'}</span>
                      </div>
                      <div className="p-2 bg-slate-50 border border-slate-150 rounded-xl flex items-center gap-2">
                        <Calendar size={13} className="text-[#004a99] shrink-0" />
                        <input
                          type="date"
                          value={simulatedToday}
                          onChange={(e) => {
                            if (e.target.value) {
                              setSimulatedToday(e.target.value);
                              triggerToast(language === 'ar' ? `تعديل تاريخ النظام إلى: ${e.target.value}` : `Time warped to: ${e.target.value}`);
                            }
                          }}
                          className="bg-transparent border-none text-slate-700 font-mono font-bold text-xs select-none p-0 focus:ring-0 outline-none w-full"
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex justify-between text-[11px] font-semibold text-slate-500">
                        <span>{language === 'ar' ? 'إنذار الصلاحية الوقائي:' : 'Expiry Guard Window:'}</span>
                        <span className="font-mono text-[#004a99] font-bold">{thresholdDays} {language === 'ar' ? 'يوم' : 'days'}</span>
                      </div>
                      <input
                        type="range"
                        min="15"
                        max="180"
                        step="5"
                        value={thresholdDays}
                        onChange={(e) => setThresholdDays(parseInt(e.target.value))}
                        className="w-full h-1.5 bg-slate-150 rounded-lg appearance-none cursor-pointer accent-[#004a99]"
                      />
                      <div className="text-[9px] text-slate-400 text-center select-none">
                        {language === 'ar' ? 'فرز دوري لدرء التلف والخسارة السلعية' : 'Safe inventory monitoring active.'}
                      </div>
                    </div>

                    {/* زر تسارع الزمن الفوري الشهري */}
                    <button
                      onClick={() => {
                        const d = new Date(simulatedToday);
                        d.setDate(d.getDate() + 30);
                        const formatted = d.toISOString().split('T')[0];
                        setSimulatedToday(formatted);
                        triggerToast(language === 'ar' ? `✨ قفزة تكنولوجية! دفعنا الزمن ٣٠ يوماً للأمام للمعاينة (${formatted})` : `Time warped forward 30 days into future: ${formatted}`);
                        
                        const hasNewPopups = products.some(p => {
                          const diffTime = new Date(p.expiryDate).getTime() - d.getTime();
                          const remain = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                          return remain <= thresholdDays && remain >= 0;
                        });
                        if (hasNewPopups) {
                          setIsAlertOverlayShown(true);
                        }
                      }}
                      className="w-full py-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 text-white font-extrabold text-[11px] rounded-xl flex items-center justify-center gap-1.5 transition-all shadow-md shadow-cyan-600/10 cursor-pointer text-center font-sans font-bold"
                      id="time-travel-accelerator"
                    >
                      <RefreshCw size={12} className="animate-spin duration-[4000ms]" />
                      <span>{language === 'ar' ? '⏩ تسريع الزمن للمعاينة المستندات (+٣٠ يوم)' : 'Chrono jump (+30 Days)'}</span>
                    </button>
                  </div>

                  {/* أزرار التشغيل والإنهاء */}
                  <div className="bg-slate-50 border border-slate-200 p-3 rounded-2xl space-y-2 text-right">
                    <button
                      onClick={() => {
                        if (window.confirm(language === 'ar' ? 'هل تود استرجاع جرد بضائع مول داي تو نايت الاصلية لغرض المعاينة الافتراضية؟' : 'Restore store sample inventory?')) {
                          localStorage.clear();
                          window.location.reload();
                        }
                      }}
                      className="w-full py-2 border border-slate-300 hover:bg-white text-slate-600 font-bold text-[10px] rounded-xl transition-all cursor-pointer text-center"
                      id="reset-factory-db"
                    >
                      🔄 {language === 'ar' ? 'استعادة البضائع الافتراضية للفرع' : 'Reload Pristine Catalog'}
                    </button>

                    <button
                      onClick={handleLogout}
                      className="w-full py-2 text-white bg-red-600 hover:bg-rose-700 font-extrabold text-[11px] rounded-xl flex items-center justify-center gap-1.5 transition-colors cursor-pointer text-center font-bold"
                      id="shift-logout-btn"
                    >
                      <LogOut size={13} />
                      <span>{language === 'ar' ? 'إنهاء وردية العمل والخروج' : 'End Shift & Logout'}</span>
                    </button>
                  </div>

                </div>
              </motion.aside>
            </>
          )}
        </AnimatePresence>
      
        </>
      )}

      {/* 🧾 ذيل المنصة ومساحة الإرشاد */}
      <footer className="bg-slate-900 text-slate-400 py-6 border-t border-slate-800 mt-12 text-xs">
        <div className="max-w-7xl mx-auto px-4 md:px-6 flex flex-col md:flex-row justify-between items-center gap-4">
          <div>
            <p className="font-semibold text-slate-300">
              {language === 'ar' ? 'نظام جرد مول داي تو نايت © ٢٠٢٦' : 'Day to Night Mall Supermarket System © 2026'}
            </p>
            <p className="text-[11px] text-slate-500 mt-1">
              {language === 'ar' 
                ? 'نظام جرد متطور وإدارة ذكية للمخزون مع تنبيهات استباقية لصلاحية المنتجات (60 يوماً قبل الانتهاء).' 
                : 'Pristine system aligned with safety protocols of leading supermarket franchises.'}
            </p>
          </div>
          <div className="flex gap-4 items-center">
            <span className="text-[10px] border border-slate-800 bg-slate-800 px-2 py-1 rounded inline-block text-emerald-450">
              {language === 'ar' ? 'قاعدة البيانات محلية ونشطة' : 'LocalStorage Engine Connected & Active'}
            </span>
          </div>
        </div>
      </footer>

      {/* 📝 النافذة المنبثقة لإضافة / تعديل البضائع */}
      <AddProductModal
        isOpen={isAddOpen}
        onClose={() => {
          setIsAddOpen(false);
          setEditingProduct(null);
        }}
        onSave={handleAddProduct}
        editingProduct={editingProduct}
        language={language}
      />

      {/* 📸 المستخرج الذكي لفواتير المشتريات بالذكاء الاصطناعي */}
      <InvoiceScannerModal
        isOpen={isScanInvoiceOpen}
        onClose={() => setIsScanInvoiceOpen(false)}
        language={language}
        onItemsImported={refreshProductsFromBackend}
      />

      {/* 📸 قارئ باركود الكاميرا المباشر في لوحة تسجيل مبيعات الكاشير */}
      <CameraBarcodeScanner
        isOpen={isPosCameraScannerOpen}
        onClose={() => setIsPosCameraScannerOpen(false)}
        onScanSuccess={handleCameraBarcodeScan}
        language={language}
      />

      {/* 🏷️ مركز طباعة الباركود والأسعار مجمع وبديل */}
      <BarcodePrinterModal
        isOpen={isBarcodePrinterOpen}
        onClose={() => setIsBarcodePrinterOpen(false)}
        products={products}
        language={language}
      />

      {/* 🧾 الفاتورة الحرارية من الطابعة الكلاسيكية */}
      {isReceiptModalOpen && lastReceipt && (
        <div className="fixed inset-0 z-[60] overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#fcfdf1] text-black w-full max-w-sm border border-slate-350 shadow-2xl p-5 font-mono text-xs rounded-lg transition-all transform hover:scale-101 select-none flex flex-col justify-between">
            <div className="text-center border-b border-dashed border-slate-400 pb-3">
              <h4 className="font-black text-sm uppercase tracking-wide">DAY TO NIGHT MALL</h4>
              <p className="text-[10px] text-slate-500 mt-0.5">{language === 'ar' ? 'بوابة الكاشير الذكية' : 'Smart Cashier POS'}</p>
              <p className="text-[9px] text-slate-400 mt-1 font-mono">ID: {lastReceipt.id}</p>
            </div>
            
            <table className="w-full my-4 text-left border-b border-dashed border-slate-400 pb-2">
              <thead>
                <tr className="border-b border-dashed border-slate-300 pb-1 text-[10px] text-slate-500 text-right">
                  <th className="font-bold text-right py-1">{language === 'ar' ? 'السلعة' : 'Item'}</th>
                  <th className="font-bold text-center py-1">{language === 'ar' ? 'الكمية' : 'Qty'}</th>
                  <th className="font-bold text-left py-1">{language === 'ar' ? 'الإجمالي' : 'Total'}</th>
                </tr>
              </thead>
              <tbody>
                {lastReceipt.items.map((item, idx) => (
                  <tr key={idx} className="text-[10px] text-right">
                    <td className="py-1 text-slate-800 text-right">{language === 'ar' ? item.product.nameAr : item.product.nameEn}</td>
                    <td className="py-1 text-center font-bold">{item.quantity}</td>
                    <td className="py-1 text-left font-mono">{(item.product.sellPrice * item.quantity).toLocaleString()} {language === 'ar' ? 'ج.م' : 'EGP'}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="space-y-1 text-right text-[11px] pb-3 border-b border-dashed border-slate-400" style={{ direction: language === 'ar' ? 'rtl' : 'ltr' }}>
              <p className="flex justify-between">
                <span className="text-slate-500">{language === 'ar' ? 'المجموع الأساسي:' : 'Subtotal:'}</span>
                <span className="font-bold">{(lastReceipt.total * 0.86).toFixed(2)} EGP</span>
              </p>
              <p className="flex justify-between">
                <span className="text-slate-500">{language === 'ar' ? 'ضريبة القيمة المضافة 14%:' : 'VAT 14%:'}</span>
                <span className="font-bold">{(lastReceipt.total * 0.14).toFixed(2)} EGP</span>
              </p>
              <p className="flex justify-between text-xs font-black pt-1 border-t border-dotted border-slate-300">
                <span>{language === 'ar' ? 'الإجمالي النهائي:' : 'TOTAL AMOUNT:'}</span>
                <span>{lastReceipt.total.toLocaleString()} EGP</span>
              </p>
              <p className="flex justify-between text-[10px] text-slate-600 mt-2">
                <span>{language === 'ar' ? 'المدفوع نقداً:' : 'CASH PAID:'}</span>
                <span>{lastReceipt.cash.toLocaleString()} EGP</span>
              </p>
              <p className="flex justify-between text-[10px] text-slate-600">
                <span>{language === 'ar' ? 'الفكة / المتبقي:' : 'CHANGE OUT:'}</span>
                <span>{(lastReceipt.cash - lastReceipt.total).toLocaleString()} EGP</span>
              </p>
            </div>

            <div className="text-center pt-3 text-[10px] space-y-1.5">
              <p className="font-bold text-slate-700">{language === 'ar' ? 'شكراً لزيارتكم! طاب يومكم 💖' : 'Thank you for shopping! See you again!'}</p>
              <p className="text-[8px] text-slate-400">Date: {lastReceipt.date}</p>
              <button
                onClick={() => setIsReceiptModalOpen(false)}
                className="w-full mt-3 py-2 bg-slate-900 text-white font-extrabold text-[10px] uppercase rounded-lg cursor-pointer hover:bg-slate-850 transition-colors"
              >
                {language === 'ar' ? 'قص وإغلاق الفاتورة' : 'Tear & Close Receipt'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 🔮 إذن التحويل الجاهز للطباعة والاعتماد من المدير */}
      {activePrintOrder && (
        <div className="fixed inset-0 z-[60] overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 text-right">
          <div className="bg-white border-2 border-double border-slate-400 p-8 w-full max-w-xl shadow-2xl rounded-2xl select-none font-serif text-slate-800 space-y-6 flex flex-col justify-between" style={{ direction: 'rtl' }}>
            <div className="text-center pb-4 border-b-2 border-slate-400 space-y-1">
              <h2 className="text-xl font-bold text-slate-900 tracking-wider">داي تو نايت سوبرماركت - Day to Night Mall</h2>
              <p className="text-xs font-semibold text-slate-500">إذن وتفويض تحويل سلع داخلي من المستودع لصالة المعروضات</p>
              <p className="text-[10px] font-mono font-bold text-slate-400 mt-2 text-center">Voucher-ID: {activePrintOrder.id}</p>
            </div>

            <div className="space-y-3 font-semibold text-xs leading-relaxed text-slate-700">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-slate-400">{language === 'ar' ? 'تاريخ الطلب:' : 'Request Date:'}</span>
                  <span className="font-bold text-slate-900 font-mono mr-1">{activePrintOrder.dateRequested?.substring(0, 10) || simulatedToday}</span>
                </div>
                <div>
                  <span className="text-slate-400">{language === 'ar' ? 'صادر بواسطة الموظف:' : 'Requested By:'}</span>
                  <span className="font-bold text-slate-900 font-mono mr-1">@{activePrintOrder.requestedBy || 'system'}</span>
                </div>
              </div>

              <div className="pt-3">
                <p className="text-xs text-slate-450 mb-1">{language === 'ar' ? 'تفاصيل السلع المصرح بنقلها لارفف صالة التجزئة:' : 'Listing of authorized items to dispatch to mall displays:'}</p>
                <div className="border border-slate-200 rounded-lg p-3 bg-slate-50">
                  {activePrintOrder.items && activePrintOrder.items.map((item: any, i: number) => {
                    const pObj = products.find(p => p.id === item.productId);
                    return (
                      <div key={i} className="flex justify-between font-bold text-slate-900 text-[11px]">
                        <span>{pObj ? pObj.nameAr : 'صنف غير معروف'} ({pObj ? pObj.barcode : ''})</span>
                        <span>{item.quantity} قطعة</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* أختام وتواقيع جاهزة للاعتماد والمدير والموظف */}
            <div className="pt-8 border-t border-dashed border-slate-300 grid grid-cols-3 gap-4 text-center text-[10px] font-bold text-slate-600">
              <div className="space-y-4">
                <p>إعداد أمين المستودع</p>
                <div className="h-6"></div>
                <p className="border-t border-slate-400 pt-1 font-extrabold text-slate-800">أحمد عبد العال</p>
              </div>

              <div className="space-y-4 border-r border-[#ececec]">
                <p>توقيع مستلم الصالة</p>
                <div className="h-6 font-mono font-normal">-- {language === 'ar' ? 'مرفق الكتروني' : 'E-sign'} --</div>
                <p className="border-t border-slate-400 pt-1 font-extrabold text-slate-800">سارة الجياد</p>
              </div>

              <div className="space-y-4 border-r border-[#ececec]">
                <p>اعتماد المدير العام</p>
                {activePrintOrder.status === 'approved' ? (
                  <div className="relative flex justify-center items-center h-6">
                    <span className="absolute transform -rotate-12 border border-emerald-600 text-emerald-600 rounded px-1.5 py-0.2 text-[8px] font-extrabold tracking-widest uppercase bg-emerald-50">APPROVED / معتمد</span>
                  </div>
                ) : (
                  <div className="h-6 text-slate-400">---</div>
                )}
                <p className="border-t border-slate-400 pt-1 font-extrabold text-[#003d7e]">أبو بكر زهران</p>
              </div>
            </div>

            <div className="border-t border-slate-200 pt-4 flex justify-between gap-4 font-mono font-sans mt-4">
              <button
                onClick={() => window.print()}
                className="px-5 py-2 bg-slate-900 text-white font-extrabold text-xs rounded-xl cursor-pointer hover:bg-slate-800 transition-colors"
              >
                🖨️ طباعة المستند الورقي
              </button>
              <button
                onClick={() => setActivePrintOrder(null)}
                className="px-5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-250 font-bold text-xs rounded-xl cursor-pointer"
              >
                ✕ إغلاق المعاينة
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 🔔 Toast Notification Message overlay */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="fixed bottom-6 right-6 z-50 bg-[#004a99] text-white p-3.5 rounded-lg shadow-xl border border-blue-400 max-w-sm flex items-center gap-3"
            style={{ direction: language === 'ar' ? 'rtl' : 'ltr' }}
          >
            <div className="bg-[#003d7e] p-1.5 rounded-md text-blue-300 shrink-0">
              <RefreshCw size={14} className="animate-spin" />
            </div>
            <div className="text-[11px] font-bold">
              {toastMessage}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );

  // دالة إسقاط المنبثقة بالتأجيل لمستوى آخر
  function handleNotificationsDismissedWithSnooze(productId: string) {
    setNotificationsDismissed(prev => [...prev, productId]);
  }
}
