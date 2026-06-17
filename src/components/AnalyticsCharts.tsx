/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { Product } from '../types';
import { CATEGORIES, getProductExpiryStatus, SYSTEM_TODAY } from '../data';

interface ChartsProps {
  products: Product[];
  language: 'ar' | 'en';
  transactions?: any[];
  financialPeriod?: 'all' | 'daily' | 'monthly';
  selectedFinancialDay?: string;
  selectedFinancialMonth?: string;
}

export const AnalyticsCharts: React.FC<ChartsProps> = ({ 
  products, 
  language,
  transactions,
  financialPeriod,
  selectedFinancialDay,
  selectedFinancialMonth
}) => {
  // 1. حساب قيمة المخزون لكل قسم
  const categoryData = CATEGORIES.map((cat) => {
    const catProducts = products.filter((p) => p.category === cat.key);
    const shelfValueCost = catProducts.reduce((sum, p) => sum + p.shelfStock * p.buyPrice, 0);
    const warehouseValueCost = catProducts.reduce((sum, p) => sum + p.warehouseStock * p.buyPrice, 0);
    const totalCost = shelfValueCost + warehouseValueCost;
    
    return {
      name: language === 'ar' ? cat.nameAr : cat.nameEn,
      totalCost: Math.round(totalCost),
      productCount: catProducts.length,
    };
  }).filter(data => data.totalCost > 0);

  // 2. حساب تفصيل صحة الصلاحية
  let validCount = 0;
  let nearExpiryCount = 0;
  let expiredCount = 0;

  products.forEach((p) => {
    const { status } = getProductExpiryStatus(p.expirationDate, SYSTEM_TODAY);
    if (status === 'valid') validCount++;
    else if (status === 'near_expiry') nearExpiryCount++;
    else if (status === 'expired') expiredCount++;
  });

  const healthData = [
    { 
      name: language === 'ar' ? 'سليم وصالح' : 'Valid Products', 
      value: validCount, 
      color: '#10B981' 
    },
    { 
      name: language === 'ar' ? 'ينتهي خلال 60 يوم' : 'Expires < 60 days', 
      value: nearExpiryCount, 
      color: '#F59E0B' 
    },
    { 
      name: language === 'ar' ? 'منتهي الصلاحية' : 'Expired Products', 
      value: expiredCount, 
      color: '#EF4444' 
    },
  ].filter(d => d.value > 0);

  const hasTx = Array.isArray(transactions) && transactions.length > 0;

  const activeTx = hasTx ? transactions.filter((tx) => {
    if (financialPeriod === 'daily') {
      return tx.date === selectedFinancialDay;
    } else if (financialPeriod === 'monthly') {
      return tx.date.startsWith(selectedFinancialMonth || "");
    }
    return true; // Use all
  }) : [];

  // 3. حساب تحليل المبيعات والأرباح والخسائر لكل قسم
  const salesPerformanceData = CATEGORIES.map((cat) => {
    let totalSales = 0;
    let totalProfit = 0;
    let totalLoss = 0;

    if (hasTx) {
      const catTx = activeTx.filter(tx => tx.category === cat.key);
      totalSales = catTx.reduce((sum, tx) => sum + (tx.type === 'sale' ? tx.quantity * tx.sellPrice : 0), 0);
      totalProfit = catTx.reduce((sum, tx) => sum + (tx.type === 'sale' ? tx.quantity * (tx.sellPrice - tx.buyPrice) : 0), 0);
      totalLoss = catTx.reduce((sum, tx) => sum + (tx.type === 'loss' ? tx.quantity * tx.buyPrice : 0), 0);
    } else {
      const catProducts = products.filter((p) => p.category === cat.key);
      totalSales = catProducts.reduce((sum, p) => sum + (p.unitsSold || 0) * p.sellPrice, 0);
      totalProfit = catProducts.reduce((sum, p) => sum + (p.unitsSold || 0) * (p.sellPrice - p.buyPrice), 0);
      totalLoss = catProducts.reduce((sum, p) => sum + (p.unitsLost || 0) * p.buyPrice, 0);
    }
    
    return {
      name: language === 'ar' ? cat.nameAr : cat.nameEn,
      sales: Math.round(totalSales),
      profit: Math.round(totalProfit),
      loss: Math.round(totalLoss),
    };
  }).filter(data => data.sales > 0 || data.loss > 0);

  // 4. فرز الأصناف للتوالف والربح الأعلى
  let topProfitableProducts: any[] = [];
  let highestLostProducts: any[] = [];

  if (hasTx) {
    const productProfitMap: Record<string, { product: any, profit: number, sales: number }> = {};
    activeTx.forEach(tx => {
      if (tx.type === 'sale') {
        if (!productProfitMap[tx.productId]) {
          productProfitMap[tx.productId] = { product: tx, profit: 0, sales: 0 };
        }
        productProfitMap[tx.productId].profit += tx.quantity * (tx.sellPrice - tx.buyPrice);
        productProfitMap[tx.productId].sales += tx.quantity;
      }
    });
    topProfitableProducts = Object.values(productProfitMap)
      .sort((a, b) => b.profit - a.profit)
      .slice(0, 3)
      .map(x => ({
        ...x.product,
        unitsSold: x.sales
      }));

    const productLossMap: Record<string, { product: any, loss: number, lost: number }> = {};
    activeTx.forEach(tx => {
      if (tx.type === 'loss') {
        if (!productLossMap[tx.productId]) {
          productLossMap[tx.productId] = { product: tx, loss: 0, lost: 0 };
        }
        productLossMap[tx.productId].loss += tx.quantity * tx.buyPrice;
        productLossMap[tx.productId].lost += tx.quantity;
      }
    });
    highestLostProducts = Object.values(productLossMap)
      .sort((a, b) => b.loss - a.loss)
      .slice(0, 3)
      .map(x => ({
        ...x.product,
        unitsLost: x.lost
      }));
  } else {
    topProfitableProducts = [...products]
      .filter(p => (p.unitsSold || 0) > 0)
      .sort((a, b) => {
        const profitA = (a.unitsSold || 0) * (a.sellPrice - a.buyPrice);
        const profitB = (b.unitsSold || 0) * (b.sellPrice - b.buyPrice);
        return profitB - profitA;
      })
      .slice(0, 3);

    highestLostProducts = [...products]
      .filter(p => (p.unitsLost || 0) > 0)
      .sort((a, b) => {
        const lossA = (a.unitsLost || 0) * a.buyPrice;
        const lossB = (b.unitsLost || 0) * b.buyPrice;
        return lossB - lossA;
      })
      .slice(0, 3);
  }

  return (
    <div className="space-y-6">
      {/* الصف الأول: رأس المال وتوزيع جودة وصلاحية المخزون */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* رسم بياني بار كود لقيم الفئات */}
        <div className="lg:col-span-2 bg-white rounded-xl p-5 border border-slate-200 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="font-extrabold text-[#003d7e] text-sm md:text-base flex items-center gap-2">
              <span className="w-2.5 h-2.5 bg-[#004a99] rounded-full"></span>
              {language === 'ar' ? 'رأس المال المستثمر حسب القسم (جنيه مصري)' : 'Capital Cost Invested by Section (EGP)'}
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              {language === 'ar' 
                ? 'توزيع الميزانية المستثمرة في البضائع الموجودة على الرفوف والمخزن الداخلي' 
                : 'Distribution of capital money across shelves and back-store warehouse'}
            </p>
          </div>
          <div className="h-64 mt-6">
            {categoryData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-slate-400 text-sm">
                {language === 'ar' ? 'لا توجد بيانات بضائع لعرضها الكترونياً' : 'No inventory data available'}
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={categoryData}
                  margin={{ top: 10, right: 10, left: -20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                  <XAxis 
                    dataKey="name" 
                    tick={{ fill: '#64748B', fontSize: 10, fontWeight: 'bold' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis 
                    tick={{ fill: '#64748B', fontSize: 10 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#1E293B', 
                      borderRadius: '8px', 
                      border: 'none',
                      color: '#fff',
                      direction: language === 'ar' ? 'rtl' : 'ltr'
                    }}
                    itemStyle={{ color: '#E2E8F0' }}
                    labelStyle={{ color: '#94A3B8', fontWeight: 'bold' }}
                  />
                  <Bar 
                    dataKey="totalCost" 
                    name={language === 'ar' ? 'قيمة المخزون' : 'Stock Value'} 
                    fill="#004a99" 
                    radius={[4, 4, 0, 0]}
                    maxBarSize={45}
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* رسم بياني دائري لتوزيع حالة المنتجات وصلاحيتها */}
        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="font-extrabold text-slate-850 text-sm md:text-base flex items-center gap-2">
              <span className="w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse"></span>
              {language === 'ar' ? 'توزيع جودة وصلاحية المخزون' : 'Inventory Freshness Allocation'}
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              {language === 'ar' 
                ? 'مراقبة فورية للصلاحية والتنبيهات ذات الـ 60 يوماً' 
                : 'Real-time monitoring of expiration risk & safety margins'}
            </p>
          </div>
          
          <div className="h-56 relative flex items-center justify-center mt-4">
            {healthData.length === 0 ? (
              <div className="text-sm text-slate-400">
                {language === 'ar' ? 'لا توجد بيانات' : 'No data'}
              </div>
            ) : (
              <div className="w-full h-full relative">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={healthData}
                      cx="50%"
                      cy="45%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {healthData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ 
                        backgroundColor: '#1E293B', 
                        borderRadius: '8px', 
                        border: 'none',
                        color: '#fff',
                        direction: language === 'ar' ? 'rtl' : 'ltr'
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                {/* النص في منتصف الدائرة */}
                <div className="absolute top-[40%] left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none">
                  <p className="text-2xl font-bold text-slate-705">{products.length}</p>
                  <p className="text-[10px] text-slate-400">
                    {language === 'ar' ? 'إجمالي المنتجات' : 'Total Items'}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* وسيلة إيضاح الألوان */}
          <div className="space-y-2 mt-2">
            {healthData.map((item, idx) => (
              <div key={idx} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5 text-slate-600">
                  <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ backgroundColor: item.color }} />
                  <span>{item.name}</span>
                </div>
                <span className="font-semibold text-slate-700">
                  {item.value} {language === 'ar' ? 'صنف' : 'items'} ({Math.round((item.value / products.length) * 100)}%)
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* الصف الثاني: تفصيل المبيعات والأرباح والخسائر لكل قسم والأصناف المتصدرة */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* مقارنة الأداء لكل قسم */}
        <div className="lg:col-span-2 bg-white rounded-xl p-5 border border-slate-200 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="font-extrabold text-slate-800 text-sm md:text-base flex items-center gap-2">
              <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full"></span>
              {language === 'ar' ? 'تحليل المبيعات والأرباح والخسائر حسب القسم (ج.م)' : 'Sales, Profits & Losses per Department (EGP)'}
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              {language === 'ar' 
                ? 'مقارنة حجم المبيعات الإجمالي والربح الصافي وخسائر التوالف التابعة لكل قسم بالتفصيل' 
                : 'Comparative view of total revenues, net profit, and inventory losses per section'}
            </p>
          </div>
          <div className="h-64 mt-6">
            {salesPerformanceData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-slate-400 text-sm">
                {language === 'ar' ? 'لا توجد عمليات بيع أو توالف مسجلة حتى الآن' : 'No sales or write-offs registered yet'}
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={salesPerformanceData}
                  margin={{ top: 10, right: 10, left: -20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                  <XAxis 
                    dataKey="name" 
                    tick={{ fill: '#64748B', fontSize: 10, fontWeight: 'bold' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis 
                    tick={{ fill: '#64748B', fontSize: 10 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#1E293B', 
                      borderRadius: '8px', 
                      border: 'none',
                      color: '#fff',
                      direction: language === 'ar' ? 'rtl' : 'ltr'
                    }}
                    itemStyle={{ color: '#E2E8F0' }}
                    labelStyle={{ color: '#94A3B8', fontWeight: 'bold' }}
                  />
                  <Legend verticalAlign="top" height={36} iconSize={10} wrapperStyle={{ fontSize: 11, fontWeight: 'bold' }} />
                  <Bar 
                    dataKey="sales" 
                    name={language === 'ar' ? 'المبيعات' : 'Sales'} 
                    fill="#10B981" 
                    radius={[3, 3, 0, 0]}
                  />
                  <Bar 
                    dataKey="profit" 
                    name={language === 'ar' ? 'أرباح المبيعات' : 'Sales Profit'} 
                    fill="#3B82F6" 
                    radius={[3, 3, 0, 0]}
                  />
                  <Bar 
                    dataKey="loss" 
                    name={language === 'ar' ? 'خسائر وتوالف' : 'Write-Off Losses'} 
                    fill="#EF4444" 
                    radius={[3, 3, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* كتل الأصناف الأكثر أداءً وخسارة */}
        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="space-y-5">
            {/* الأكثر أرباحاً */}
            <div>
              <h4 className="font-extrabold text-xs flex items-center gap-1.5 text-emerald-600 border-b border-emerald-50 pb-2">
                <span>📈</span>
                {language === 'ar' ? 'الأصناف الأكثر ربحية بالمول' : 'Top Profitable Products'}
              </h4>
              <div className="space-y-2 mt-2">
                {topProfitableProducts.length === 0 ? (
                  <p className="text-[11px] text-slate-400 py-1">{language === 'ar' ? 'لا مبيعات بعد' : 'No sales yet'}</p>
                ) : (
                  topProfitableProducts.map((p) => {
                    const profit = (p.unitsSold || 0) * (p.sellPrice - p.buyPrice);
                    return (
                      <div key={p.id} className="flex justify-between items-center text-xs">
                        <div className="min-w-0 pr-2 leading-tight">
                          <p className="font-bold text-slate-700 truncate">{language === 'ar' ? p.nameAr : p.nameEn}</p>
                          <p className="text-[9px] text-slate-400 font-mono mt-0.5">
                            {p.unitsSold || 0} {language === 'ar' ? 'مباع' : 'sold'}
                          </p>
                        </div>
                        <span className="font-mono font-bold text-emerald-600 shrink-0 bg-emerald-50 px-2 py-0.5 rounded">
                          {profit.toLocaleString(undefined, { maximumFractionDigits: 1 })} ج.م
                        </span>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* الأكثر فاقداً / خسارة */}
            <div>
              <h4 className="font-extrabold text-xs flex items-center gap-1.5 text-rose-600 border-b border-rose-50 pb-2">
                <span>📉</span>
                {language === 'ar' ? 'الأصناف الأكثر خسارة وتلفاً' : 'Highest Losses / Spoiled Items'}
              </h4>
              <div className="space-y-2 mt-2">
                {highestLostProducts.length === 0 ? (
                  <p className="text-[11px] text-slate-400 py-1">{language === 'ar' ? 'لا منتهيات تالفة' : 'No losses yet'}</p>
                ) : (
                  highestLostProducts.map((p) => {
                    const loss = (p.unitsLost || 0) * p.buyPrice;
                    return (
                      <div key={p.id} className="flex justify-between items-center text-xs">
                        <div className="min-w-0 pr-2 leading-tight">
                          <p className="font-bold text-slate-700 truncate">{language === 'ar' ? p.nameAr : p.nameEn}</p>
                          <p className="text-[9px] text-slate-400 font-mono mt-0.5">
                            {p.unitsLost || 0} {language === 'ar' ? 'تالف' : 'lost'}
                          </p>
                        </div>
                        <span className="font-mono font-bold text-rose-600 shrink-0 bg-rose-50 px-2 py-0.5 rounded">
                          {loss.toLocaleString(undefined, { maximumFractionDigits: 1 })} ج.م
                        </span>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 text-[10px] text-slate-400 font-bold leading-relaxed">
            {language === 'ar' 
              ? '💡 يتم حساب الخسائر بناءً على ثمن الشراء الفعلي لجميع العبوات المصنفة كبضاعة تالفة أو منتهية الصلاحية تم إعدامها.' 
              : '💡 Losses are calculated directly using the cost prices of discarded/disposed products.'}
          </div>
        </div>
      </div>
    </div>
  );
};
