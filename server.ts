import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;
const DB_FILE = path.join(process.cwd(), "products_db.json");

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/day2night";

const JSONFileSchema = new mongoose.Schema({
  filename: { type: String, unique: true },
  content: String
});
const JSONFileModel = mongoose.model("JSONFile", JSONFileSchema);

const dbCache: Record<string, string> = {};

const originalReadFileSync = fs.readFileSync;
const originalWriteFileSync = fs.writeFileSync;
const originalExistsSync = fs.existsSync;

(fs as any).readFileSync = function(pathLike: any, options: any) {
  const fileStr = String(pathLike);
  const basename = path.basename(fileStr);
  if (basename.endsWith('_db.json')) {
    if (dbCache[basename] !== undefined) {
      return dbCache[basename];
    }
  }
  return originalReadFileSync.apply(this, arguments as any);
};

(fs as any).writeFileSync = function(pathLike: any, data: any, options: any) {
  const fileStr = String(pathLike);
  const basename = path.basename(fileStr);
  if (basename.endsWith('_db.json')) {
    dbCache[basename] = String(data);
    JSONFileModel.updateOne(
      { filename: basename }, 
      { content: String(data) }, 
      { upsert: true }
    ).catch((err: any) => console.error("MongoDB Sync Error for", basename, err));
  }
  return originalWriteFileSync.apply(this, arguments as any);
};

(fs as any).existsSync = function(pathLike: any) {
  const fileStr = String(pathLike);
  const basename = path.basename(fileStr);
  if (basename.endsWith('_db.json')) {
    if (dbCache[basename] !== undefined) return true;
  }
  return originalExistsSync.apply(this, arguments as any);
};

async function loadMongoDBIntoCache() {
  try {
    const allFiles = await JSONFileModel.find({});
    for (const file of allFiles) {
      if (file.filename && file.content) {
        dbCache[file.filename] = file.content;
      }
    }
    console.log(`Loaded ${allFiles.length} database files from MongoDB into memory cache.`);
  } catch(e) {
    console.error("Failed to load from MongoDB", e);
  }
}

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

app.post("/api/mongo-test", (req, res) => {
  if (mongoose.connection.readyState === 1) {
    res.json({ success: true, message: "MongoDB is connected!" });
  } else {
    res.status(500).json({ success: false, message: "MongoDB is not connected", state: mongoose.connection.readyState });
  }
});

let aiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY is not defined in the environment secrets. Please configure it in Settings > Secrets.");
    }
    aiClient = new GoogleGenAI({
      apiKey: apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }
  return aiClient;
}

// Initial products catalogue for database seeding
const INITIAL_PRODUCTS_SEED = [
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
    expirationDate: '2026-07-20',
    supplierName: 'جهينة لمنتجات الألبان',
    supplierPhone: '16630',
    batchNumber: 'B-JUH-992',
    lastUpdated: '2026-06-10'
  },
  {
    id: 'p-2',
    nameAr: 'جبنة دومتي فيتا علبة 500 جرام',
    nameEn: 'Domty Feta Cheese 500g',
    barcode: '6224000329105',
    category: 'dairy',
    shelfStock: 80,
    warehouseStock: 200,
    minStockAlert: 90,
    buyPrice: 28.00,
    sellPrice: 34.00,
    expirationDate: '2026-08-01',
    supplierName: 'دومتي للأغذية',
    supplierPhone: '16115',
    batchNumber: 'B-DOM-331',
    lastUpdated: '2026-06-12'
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
    expirationDate: '2026-06-25',
    supplierName: 'جهينة لمنتجات الألبان',
    supplierPhone: '16630',
    batchNumber: 'B-ALM-102',
    lastUpdated: '2026-06-14'
  },
  {
    id: 'p-4',
    nameAr: 'مكرونة ريجينا بنة (قلم) 400 جرام',
    nameEn: 'Regina Penne Pasta 400g',
    barcode: '6221034002427',
    category: 'groceries',
    shelfStock: 15,
    warehouseStock: 0,
    minStockAlert: 50,
    buyPrice: 18.00,
    sellPrice: 22.00,
    expirationDate: '2026-05-10',
    supplierName: 'دومتي للأغذية',
    supplierPhone: '16115',
    batchNumber: 'B-REG-011',
    lastUpdated: '2026-06-01'
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
    expirationDate: '2026-08-10',
    supplierName: 'دومتي للأغذية',
    supplierPhone: '16115',
    batchNumber: 'B-CRY-880',
    lastUpdated: '2026-06-11'
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
    expirationDate: '2026-12-15',
    supplierName: 'الشركة المصرية لتجارة اللحوم',
    supplierPhone: '0223456789',
    batchNumber: 'B-KOK-404',
    lastUpdated: '2026-06-05'
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
    expirationDate: '2026-06-30',
    supplierName: 'مزارع دينا للفواكه والخضار',
    supplierPhone: '19044',
    batchNumber: 'B-APP-772',
    lastUpdated: '2026-06-14'
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
    expirationDate: '2026-06-18',
    supplierName: 'مخبوزات وحلويات داي تو نايت',
    supplierPhone: 'داخلي',
    batchNumber: 'B-BAK-151',
    lastUpdated: '2026-06-15'
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
    expirationDate: '2029-06-15',
    supplierName: 'هلال ومصيلحي للمنظفات',
    supplierPhone: '01012345678',
    batchNumber: 'B-ARI-202',
    lastUpdated: '2026-06-15'
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
    expirationDate: '2026-06-05',
    supplierName: 'دومتي للأغذية',
    supplierPhone: '16115',
    batchNumber: 'B-GAL-301',
    lastUpdated: '2026-05-20'
  },
  {
    id: 'p-11',
    nameAr: 'معجون أسنان كولجيت حماية مكثفة 75 مل',
    nameEn: 'Colgate Max Fresh Toothpaste 75ml',
    barcode: '8718951234567',
    category: 'cosmetics',
    shelfStock: 15,
    warehouseStock: 80,
    minStockAlert: 25,
    buyPrice: 38.00,
    sellPrice: 46.00,
    expirationDate: '2027-02-15',
    supplierName: 'هلال ومصيلحي للمنظفات',
    supplierPhone: '01012345678',
    batchNumber: 'B-COL-711',
    lastUpdated: '2026-06-03'
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
    expirationDate: '2031-12-30',
    supplierName: 'العربي جروب للأجهزة',
    supplierPhone: '19319',
    batchNumber: 'B-TOR-001',
    lastUpdated: '2026-06-11'
  }
];

// Preset simulated statistics for demo/realism
const PRESET_STATS: Record<string, { unitsSold: number, unitsLost: number }> = {
  'p-1': { unitsSold: 215, unitsLost: 12 },
  'p-2': { unitsSold: 180, unitsLost: 8 },
  'p-3': { unitsSold: 310, unitsLost: 22 },
  'p-4': { unitsSold: 140, unitsLost: 0 },
  'p-5': { unitsSold: 95, unitsLost: 3 },
  'p-6': { unitsSold: 120, unitsLost: 5 },
  'p-7': { unitsSold: 85, unitsLost: 15 },
  'p-8': { unitsSold: 240, unitsLost: 28 },
  'p-9': { unitsSold: 60, unitsLost: 2 },
  'p-10': { unitsSold: 450, unitsLost: 10 },
  'p-11': { unitsSold: 75, unitsLost: 1 },
  'p-12': { unitsSold: 18, unitsLost: 0 }
};

// Read database file helper
function readDatabase(): any[] {
  let list: any[];
  if (!fs.existsSync(DB_FILE)) {
    fs.writeFileSync(DB_FILE, JSON.stringify(INITIAL_PRODUCTS_SEED, null, 2), "utf8");
    list = JSON.parse(JSON.stringify(INITIAL_PRODUCTS_SEED));
  } else {
    try {
      const data = fs.readFileSync(DB_FILE, "utf8");
      list = JSON.parse(data);
    } catch (err) {
      console.error("Failed to read database, falling back to seed data", err);
      list = JSON.parse(JSON.stringify(INITIAL_PRODUCTS_SEED));
    }
  }

  // Ensure every item has unitsSold and unitsLost (initialized to preset or 0) and batches pre-populated
  let changed = false;
  list.forEach((p) => {
    if (p.unitsSold === undefined || p.unitsLost === undefined) {
      const presets = PRESET_STATS[p.id] || { unitsSold: 0, unitsLost: 0 };
      if (p.unitsSold === undefined) p.unitsSold = presets.unitsSold;
      if (p.unitsLost === undefined) p.unitsLost = presets.unitsLost;
      changed = true;
    }
    // Seed default batches for old/new stock to support average price and FIFO/LIFO out of the box
    if (!p.batches || p.batches.length === 0) {
      const totalStock = (p.shelfStock || 0) + (p.warehouseStock || 0);
      const oldQty = Math.floor(totalStock * 0.4);
      const newQty = Math.max(0, totalStock - oldQty);
      p.batches = [
        {
          id: `batch-${p.id}-old`,
          buyPrice: Number((p.buyPrice * 0.90).toFixed(2)), // 10% cheaper
          sellPrice: p.sellPrice,
          quantity: oldQty,
          initialQuantity: oldQty,
          expiryDate: p.expirationDate,
          dateAdded: "2026-05-15"
        },
        {
          id: `batch-${p.id}-new`,
          buyPrice: p.buyPrice,
          sellPrice: p.sellPrice,
          quantity: newQty,
          initialQuantity: newQty,
          expiryDate: p.expirationDate,
          dateAdded: "2026-06-12"
        }
      ];
      // Keep dynamic buyPrice as weighted average
      const totalCost = p.batches.reduce((sum: number, b: any) => sum + (b.quantity * b.buyPrice), 0);
      const finalWeight = totalStock > 0 ? Number((totalCost / totalStock).toFixed(2)) : p.buyPrice;
      p.buyPrice = finalWeight;
      changed = true;
    }
  });

  if (changed) {
    writeDatabase(list);
  }
  return list;
}

// Write database file helper
function writeDatabase(data: any[]) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), "utf8");
  } catch (err) {
    console.error("Failed to persist database file", err);
  }
}

// Ensure first run writes seed data
// readDatabase() now called inside startServer after MongoDB loads

const TRANSACTIONS_FILE = path.join(process.cwd(), "transactions_db.json");

function getProductInfo(productId: string) {
  const p = INITIAL_PRODUCTS_SEED.find(item => item.id === productId);
  return p ? {
    nameAr: p.nameAr,
    nameEn: p.nameEn,
    buyPrice: p.buyPrice,
    sellPrice: p.sellPrice,
    category: p.category
  } : {
    nameAr: "منتج مجهول",
    nameEn: "Unknown Product",
    buyPrice: 0,
    sellPrice: 0,
    category: "other"
  };
}

function seedTransactions(): any[] {
  const list: any[] = [];
  const dates = [
    { date: '2026-06-15', pctSold: 0.35, pctLost: 0.35 },
    { date: '2026-06-14', pctSold: 0.25, pctLost: 0.25 },
    { date: '2026-06-13', pctSold: 0.15, pctLost: 0.15 },
    { date: '2026-06-12', pctSold: 0.12, pctLost: 0.10 },
    { date: '2026-06-10', pctSold: 0.08, pctLost: 0.10 },
    { date: '2026-05-28', pctSold: 0.03, pctLost: 0.03 },
    { date: '2026-05-25', pctSold: 0.02, pctLost: 0.02 }
  ];

  for (const pId of Object.keys(PRESET_STATS)) {
    const preset = PRESET_STATS[pId];
    const info = getProductInfo(pId);

    // Distribute unitsSold
    let remainingSold = preset.unitsSold;
    dates.forEach((d, index) => {
      let qty = Math.round(preset.unitsSold * d.pctSold);
      if (index === dates.length - 1) {
        qty = remainingSold;
      } else {
        qty = Math.min(qty, remainingSold);
      }
      remainingSold -= qty;

      if (qty > 0) {
        list.push({
          id: `t-sale-${pId}-${d.date}-${index}`,
          type: 'sale',
          date: d.date,
          productId: pId,
          nameAr: info.nameAr,
          nameEn: info.nameEn,
          quantity: qty,
          buyPrice: info.buyPrice,
          sellPrice: info.sellPrice,
          category: info.category,
          timestamp: `${d.date} 12:00:00`
        });
      }
    });

    // Distribute unitsLost
    let remainingLost = preset.unitsLost;
    dates.forEach((d, index) => {
      let qty = Math.round(preset.unitsLost * d.pctLost);
      if (index === dates.length - 1) {
        qty = remainingLost;
      } else {
        qty = Math.min(qty, remainingLost);
      }
      remainingLost -= qty;

      if (qty > 0) {
        list.push({
          id: `t-loss-${pId}-${d.date}-${index}`,
          type: 'loss',
          date: d.date,
          productId: pId,
          nameAr: info.nameAr,
          nameEn: info.nameEn,
          quantity: qty,
          buyPrice: info.buyPrice,
          sellPrice: info.sellPrice,
          category: info.category,
          timestamp: `${d.date} 18:00:00`
        });
      }
    });
  }

  return list;
}

function readTransactions(): any[] {
  if (!fs.existsSync(TRANSACTIONS_FILE)) {
    const seeded = seedTransactions();
    fs.writeFileSync(TRANSACTIONS_FILE, JSON.stringify(seeded, null, 2), "utf8");
    return seeded;
  }
  try {
    const data = fs.readFileSync(TRANSACTIONS_FILE, "utf8");
    return JSON.parse(data);
  } catch (e) {
    return [];
  }
}

function writeTransactions(data: any[]) {
  try {
    fs.writeFileSync(TRANSACTIONS_FILE, JSON.stringify(data, null, 2), "utf8");
  } catch (e) {}
}

// Run transaction reading to ensure pre-population
// readTransactions() now called inside startServer after MongoDB loads

// 1. GET all products
app.get("/api/products", (req, res) => {
  const dbData = readDatabase();
  res.json(dbData);
});

// 1b. GET all transactions
app.get("/api/transactions", (req, res) => {
  const transactions = readTransactions();
  res.json(transactions);
});

// 2. POST create / edit product
app.post("/api/products", (req, res) => {
  const incoming = req.body;
  const dbData = readDatabase();
  
  const existingIdx = dbData.findIndex((p) => p.id === incoming.id);
  
  if (existingIdx !== -1) {
    // Edit
    dbData[existingIdx] = { ...dbData[existingIdx], ...incoming };
    writeDatabase(dbData);
    res.json({ success: true, message: "Product updated successfully", product: dbData[existingIdx] });
  } else {
    // Generate simple ID if missing
    if (!incoming.id) {
      incoming.id = "p-" + Date.now();
    }
    dbData.push(incoming);
    writeDatabase(dbData);
    res.json({ success: true, message: "Product created successfully", product: incoming });
  }
});

// 3. DELETE product
app.delete("/api/products/:id", (req, res) => {
  const { id } = req.params;
  let dbData = readDatabase();
  const initialLength = dbData.length;
  dbData = dbData.filter((p) => p.id !== id);
  
  if (dbData.length < initialLength) {
    writeDatabase(dbData);
    res.json({ success: true, message: "Product deleted successfully" });
  } else {
    res.status(404).json({ success: false, message: "Product not found" });
  }
});

// ==========================================
// 💳 Advanced Customer, Invoices & Transfer persistent databases
// ==========================================
const CUSTOMERS_FILE = path.join(process.cwd(), "customers_db.json");
const INVOICES_FILE = path.join(process.cwd(), "invoices_db.json");
const TRANSFERS_FILE = path.join(process.cwd(), "transfers_db.json");
const SUPPLIERS_FILE = path.join(process.cwd(), "suppliers_db.json");
const SUPPLIER_PAYMENTS_FILE = path.join(process.cwd(), "supplier_payments_db.json");

const INITIAL_SUPPLIERS_BACKEND = [
  { id: "sup-1", nameAr: "جهينة لمنتجات الألبان", nameEn: "Juhayna Dairy Corp", phone: "16630", email: "info@juhayna.com", category: "dairy" },
  { id: "sup-2", nameAr: "دومتي للأغذية", nameEn: "Domty Foods", phone: "16115", email: "sales@domty.com", category: "dairy" },
  { id: "sup-3", nameAr: "الشركة المصرية لتجارة اللحوم", nameEn: "Egyptian Meat Co", phone: "0223456789", email: "meat@egyptian.com", category: "meat" },
  { id: "sup-4", nameAr: "مزارع دينا للفواكه والخضار", nameEn: "Dina Farms", phone: "19044", email: "produce@dinafarms.com", category: "produce" },
  { id: "sup-5", nameAr: "هلال ومصيلحي للمنظفات", nameEn: "Helal & Moselhy Soap", phone: "01012345678", email: "helal@clean.com", category: "cleaning" },
  { id: "sup-6", nameAr: "العربي جروب للأجهزة", nameEn: "El-Araby Group", phone: "19319", email: "service@elaraby.com", category: "electronics" }
];

const INITIAL_CUSTOMERS = [
  { id: "c-1", name: "مصطفى كساب", phone: "01032847586", governorate: "القاهرة", points: 280 },
  { id: "c-2", name: "أحمد عبد الوهاب", phone: "01155382029", governorate: "الجيزة", points: 154 },
  { id: "c-3", name: "رشا الدالي", phone: "01239485761", governorate: "الإسكندرية", points: 520 },
  { id: "c-4", name: "محمد أبو طالب", phone: "01529384756", governorate: "الدقهلية", points: 90 }
];

const INITIAL_TRANSFERS = [
  {
    id: "tr-1",
    orderNumber: "TR-2026-001",
    date: "2026-06-14",
    items: [
      { productId: "p-1", productNameAr: "حليب جهينة كامل الدسم 1 لتر", productNameEn: "Juhayna Full Cream Milk 1L", quantity: 50 },
      { productId: "p-2", productNameAr: "جبنة دومتي فيتا علبة 500 جرام", productNameEn: "Domty Feta Cheese 500g", quantity: 30 }
    ],
    status: "approved",
    approvedBy: "admin",
    lastUpdated: "2026-06-14"
  },
  {
    id: "tr-2",
    orderNumber: "TR-2026-002",
    date: "2026-06-15",
    items: [
      { productId: "p-5", productNameAr: "زيت عباد الشمس كريستال 1.6 لتر", productNameEn: "Crystal Sunflower Oil 1.6L", quantity: 20 }
    ],
    status: "pending",
    approvedBy: undefined,
    lastUpdated: "2026-06-15"
  }
];

const INITIAL_INVOICES = [
  {
    id: "inv-1",
    invoiceNumber: "INV-9921",
    supplierName: "جهينة لمنتجات الألبان",
    supplierPhone: "16630",
    date: "2026-06-12",
    items: [
      {
        productId: "p-1",
        productNameAr: "حليب جهينة كامل الدسم 1 لتر",
        productNameEn: "Juhayna Full Cream Milk 1L",
        barcode: "6221007011012",
        category: "dairy",
        quantity: 100,
        buyPrice: 32.50,
        sellPrice: 38.00,
        expiryDate: "2026-07-20"
      }
    ],
    totalAmount: 3250,
    isPosted: true
  }
];

function readCustomers(): any[] {
  if (!fs.existsSync(CUSTOMERS_FILE)) {
    fs.writeFileSync(CUSTOMERS_FILE, JSON.stringify(INITIAL_CUSTOMERS, null, 2), "utf8");
    return INITIAL_CUSTOMERS;
  }
  try {
    return JSON.parse(fs.readFileSync(CUSTOMERS_FILE, "utf8"));
  } catch (e) {
    return INITIAL_CUSTOMERS;
  }
}

function writeCustomers(data: any[]) {
  try {
    fs.writeFileSync(CUSTOMERS_FILE, JSON.stringify(data, null, 2), "utf8");
  } catch (e) {}
}

function readInvoices(): any[] {
  if (!fs.existsSync(INVOICES_FILE)) {
    fs.writeFileSync(INVOICES_FILE, JSON.stringify(INITIAL_INVOICES, null, 2), "utf8");
    return INITIAL_INVOICES;
  }
  try {
    return JSON.parse(fs.readFileSync(INVOICES_FILE, "utf8"));
  } catch (e) {
    return INITIAL_INVOICES;
  }
}

function writeInvoices(data: any[]) {
  try {
    fs.writeFileSync(INVOICES_FILE, JSON.stringify(data, null, 2), "utf8");
  } catch (e) {}
}

function readSuppliers(): any[] {
  if (!fs.existsSync(SUPPLIERS_FILE)) {
    fs.writeFileSync(SUPPLIERS_FILE, JSON.stringify(INITIAL_SUPPLIERS_BACKEND, null, 2), "utf8");
    return INITIAL_SUPPLIERS_BACKEND;
  }
  try {
    return JSON.parse(fs.readFileSync(SUPPLIERS_FILE, "utf8"));
  } catch (e) {
    return INITIAL_SUPPLIERS_BACKEND;
  }
}

function writeSuppliers(data: any[]) {
  try {
    fs.writeFileSync(SUPPLIERS_FILE, JSON.stringify(data, null, 2), "utf8");
  } catch (e) {}
}

function readSupplierPayments(): any[] {
  if (!fs.existsSync(SUPPLIER_PAYMENTS_FILE)) {
    fs.writeFileSync(SUPPLIER_PAYMENTS_FILE, JSON.stringify([], null, 2), "utf8");
    return [];
  }
  try {
    return JSON.parse(fs.readFileSync(SUPPLIER_PAYMENTS_FILE, "utf8"));
  } catch (e) {
    return [];
  }
}

function writeSupplierPayments(data: any[]) {
  try {
    fs.writeFileSync(SUPPLIER_PAYMENTS_FILE, JSON.stringify(data, null, 2), "utf8");
  } catch (e) {}
}

function readTransfers(): any[] {
  if (!fs.existsSync(TRANSFERS_FILE)) {
    fs.writeFileSync(TRANSFERS_FILE, JSON.stringify(INITIAL_TRANSFERS, null, 2), "utf8");
    return INITIAL_TRANSFERS;
  }
  try {
    return JSON.parse(fs.readFileSync(TRANSFERS_FILE, "utf8"));
  } catch (e) {
    return INITIAL_TRANSFERS;
  }
}

function writeTransfers(data: any[]) {
  try {
    fs.writeFileSync(TRANSFERS_FILE, JSON.stringify(data, null, 2), "utf8");
  } catch (e) {}
}

// 4. POST sell items (Deduct from shelf stock with FIFO/LIFO batch depletion)
app.post("/api/products/sell", (req, res) => {
  const { items, simulatedToday, deductionMethod, customerId, pointsRedeemed, pointsEarned } = req.body; 
  // Expects items: array of { productId: string, quantity: number, sellPrice: number, discountType?: 'egp'|'percent', discountValue?: number }
  if (!items || !Array.isArray(items)) {
    return res.status(400).json({ success: false, message: "Invalid payload. 'items' array required." });
  }

  const dbData = readDatabase();
  const method = deductionMethod || "fifo"; // 'fifo' or 'lifo'
  const updatedIds: string[] = [];
  const errors: string[] = [];
  const transRecords: any[] = [];

  for (const sale of items) {
    const product = dbData.find((p) => p.id === sale.productId);
    if (product) {
      if (product.shelfStock >= sale.quantity) {
        // 1. Deduct shelf Stock
        product.shelfStock -= sale.quantity;
        product.unitsSold = (product.unitsSold || 0) + sale.quantity;
        updatedIds.push(product.id);

        // 1b. If composite product (bundle), deplete ingredients/components stocks and batches
        if (product.isComposite && Array.isArray(product.components)) {
          product.components.forEach((comp: any) => {
            const componentProduct = dbData.find((p) => p.id === comp.productId);
            if (componentProduct) {
              const neededQty = comp.quantity * sale.quantity;
              componentProduct.shelfStock = Math.max(0, componentProduct.shelfStock - neededQty);
              componentProduct.unitsSold = (componentProduct.unitsSold || 0) + neededQty;
              
              let compRemaining = neededQty;
              let compActiveBatches = (componentProduct.batches || []).filter((b: any) => b.quantity > 0);
              if (method === "lifo") {
                compActiveBatches.sort((a: any, b: any) => new Date(b.dateAdded).getTime() - new Date(a.dateAdded).getTime());
              } else {
                compActiveBatches.sort((a: any, b: any) => new Date(a.dateAdded).getTime() - new Date(b.dateAdded).getTime());
              }
              for (const cb of compActiveBatches) {
                if (compRemaining <= 0) break;
                const originalCompBatch = componentProduct.batches.find((ob: any) => ob.id === cb.id);
                if (originalCompBatch) {
                  const taken = Math.min(compRemaining, originalCompBatch.quantity);
                  originalCompBatch.quantity -= taken;
                  compRemaining -= taken;
                }
              }
              updatedIds.push(componentProduct.id);
            }
          });
        }

        // 2. FIFO / LIFO Batch depletion to compute precise COST and update batch stock
        let remainingToDeplete = sale.quantity;
        let totalBuyCostOfSale = 0;
        
        let activeBatches = (product.batches || []).filter((b: any) => b.quantity > 0);
        
        // Sort according to selection
        if (method === "lifo") {
          activeBatches.sort((a: any, b: any) => new Date(b.dateAdded).getTime() - new Date(a.dateAdded).getTime());
        } else {
          // default to FIFO oldest first
          activeBatches.sort((a: any, b: any) => new Date(a.dateAdded).getTime() - new Date(b.dateAdded).getTime());
        }

        for (const b of activeBatches) {
          if (remainingToDeplete <= 0) break;
          const originalBatch = product.batches.find((ob: any) => ob.id === b.id);
          if (originalBatch) {
            const taken = Math.min(remainingToDeplete, originalBatch.quantity);
            originalBatch.quantity -= taken;
            remainingToDeplete -= taken;
            totalBuyCostOfSale += taken * originalBatch.buyPrice;
          }
        }

        // If the batches didn't have enough recorded (e.g. residual), fall back to product base cost
        if (remainingToDeplete > 0) {
          totalBuyCostOfSale += remainingToDeplete * product.buyPrice;
        }

        const calculatedBuyPrice = Number((totalBuyCostOfSale / sale.quantity).toFixed(2));
        
        // Log individual transaction
        const sellPriceAfterDiscount = sale.finalPrice !== undefined ? sale.finalPrice : sale.sellPrice;

        transRecords.push({
          id: `t-sale-${product.id}-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          type: 'sale',
          date: simulatedToday || new Date().toISOString().split('T')[0],
          productId: product.id,
          nameAr: product.nameAr,
          nameEn: product.nameEn,
          quantity: sale.quantity,
          buyPrice: calculatedBuyPrice, // Actual batch cost!
          sellPrice: sellPriceAfterDiscount,
          category: product.category,
          timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19)
        });

        // Recalculate weighted average buy price of remaining product stock
        const totalStockRemaining = product.shelfStock + product.warehouseStock;
        if (totalStockRemaining > 0 && product.batches && product.batches.length > 0) {
          const remainingCost = product.batches.reduce((sum: number, b: any) => sum + (b.quantity * b.buyPrice), 0);
          product.buyPrice = Number((remainingCost / totalStockRemaining).toFixed(2));
        }

      } else {
        errors.push(`العنصر [${product.nameAr}] ليس لديه كمية كافية على الرفوف. المتاح: ${product.shelfStock}`);
      }
    } else {
      errors.push(`الصنف ذو المعرف ${sale.productId} غير متوفر.`);
    }
  }

  if (errors.length > 0 && updatedIds.length === 0) {
    return res.status(400).json({ success: false, errors });
  }

  // 3. Process loyalty points if customer exists
  if (customerId) {
    const customers = readCustomers();
    const customer = customers.find((c: any) => c.id === customerId);
    if (customer) {
      if (pointsRedeemed && pointsRedeemed > 0) {
        customer.points = Math.max(0, customer.points - pointsRedeemed);
      }
      if (pointsEarned && pointsEarned > 0) {
        customer.points = (customer.points || 0) + pointsEarned;
      }
      writeCustomers(customers);
    }
  }

  if (transRecords.length > 0) {
    const txList = readTransactions();
    txList.push(...transRecords);
    writeTransactions(txList);
  }

  writeDatabase(dbData);
  res.json({ success: true, products: dbData, errors: errors.length > 0 ? errors : undefined });
});

// ==========================================
// 👤 Customers API Endpoints
// ==========================================
app.get("/api/customers", (req, res) => {
  res.json(readCustomers());
});

app.post("/api/customers", (req, res) => {
  const incoming = req.body; // Expects { id?: string, name: string, phone: string, governorate: string, points?: number, classification?: string }
  const customers = readCustomers();
  
  if (incoming.id) {
    // Edit
    const idx = customers.findIndex(c => c.id === incoming.id);
    if (idx !== -1) {
      customers[idx] = { ...customers[idx], ...incoming };
      writeCustomers(customers);
      return res.json({ success: true, customers, customer: customers[idx] });
    }
  }
  
  // Create
  const newCust = {
    id: "c-" + Date.now(),
    name: incoming.name || incoming.nameAr || "",
    nameAr: incoming.nameAr || incoming.name || "",
    phone: incoming.phone,
    governorate: incoming.governorate,
    points: incoming.points || 0,
    classification: incoming.classification || ""
  };
  customers.push(newCust);
  writeCustomers(customers);
  res.json({ success: true, customers, customer: newCust });
});

// Direct points balance adjust endpoint
app.post("/api/customers/points", (req, res) => {
  const { id, action, amount, reason } = req.body;
  const customers = readCustomers();
  const idx = customers.findIndex(c => c.id === id);
  if (idx !== -1) {
    const cust = customers[idx];
    const amountNum = Number(amount) || 0;
    if (action === "add") {
      cust.points = (cust.points || 0) + amountNum;
    } else if (action === "deduct") {
      cust.points = Math.max(0, (cust.points || 0) - amountNum);
    } else if (action === "set") {
      cust.points = Math.max(0, amountNum);
    }
    
    if (reason) {
      if (!cust.pointsHistory) cust.pointsHistory = [];
      cust.pointsHistory.unshift({
        date: new Date().toISOString().split('T')[0],
        action,
        amount: amountNum,
        reason,
        newPoints: cust.points
      });
    }

    writeCustomers(customers);
    
    pushSystemAuditLog(
      "system",
      `تم تعديل نقاط العميل [${cust.name || cust.nameAr}] بمقدار (${action === 'add' ? '+' : '-'}${amountNum}) لأجل: ${reason || 'تعديل يدوي'}`,
      `Updated points for customer [${cust.name || cust.nameAr}] by (${action === 'add' ? '+' : '-'}${amountNum}) for: ${reason || 'Manual update'}`,
      req
    );

    res.json({ success: true, customers, customer: cust });
  } else {
    res.status(404).json({ success: false, message: "Customer not found" });
  }
});

// Bulk Import Customers from Excel/CSV
app.post("/api/customers/bulk", (req, res) => {
  const { customers: bulkList } = req.body;
  if (!bulkList || !Array.isArray(bulkList)) {
    return res.status(400).json({ success: false, message: "Invalid bulk list payload" });
  }

  const customers = readCustomers();
  const added: any[] = [];
  const updated: any[] = [];

  bulkList.forEach((incoming: any) => {
    const phoneClean = String(incoming.phone || "").trim();
    if (!phoneClean) return;

    const existingIdx = customers.findIndex(c => String(c.phone || "").trim() === phoneClean);
    if (existingIdx !== -1) {
      const ext = customers[existingIdx];
      ext.name = incoming.name || ext.name || ext.nameAr || "";
      ext.nameAr = incoming.nameAr || incoming.name || ext.nameAr || "";
      ext.governorate = incoming.governorate || ext.governorate || "القاهرة";
      if (incoming.points !== undefined && incoming.points !== null) {
        ext.points = (ext.points || 0) + Number(incoming.points);
      }
      if (incoming.classification) {
        ext.classification = incoming.classification;
      }
      updated.push(ext);
    } else {
      const newCust = {
        id: "c-" + Date.now() + "-" + Math.floor(Math.random() * 1000),
        name: incoming.name || incoming.nameAr || "",
        nameAr: incoming.nameAr || incoming.name || "",
        phone: phoneClean,
        governorate: incoming.governorate || "القاهرة",
        points: Number(incoming.points) || 0,
        classification: incoming.classification || ""
      };
      customers.push(newCust);
      added.push(newCust);
    }
  });

  writeCustomers(customers);

  pushSystemAuditLog(
    "system",
    `تم استيراد عملاء مجمعين عن طريق ملف إكسيل/CSV: إضافة (${added.length}) عملاء جدد وتحديث (${updated.length}) عملاء موجودين.`,
    `Imported bulk customers from Excel/CSV: added (${added.length}) new clients and updated (${updated.length}) existing clients.`,
    req
  );

  res.json({ success: true, customers, addedCount: added.length, updatedCount: updated.length });
});

// ==========================================
// 📦 Suppliers API Endpoints (إدارة الموردين)
// ==========================================
app.get("/api/suppliers", (req, res) => {
  res.json(readSuppliers());
});

app.post("/api/suppliers", (req, res) => {
  const incoming = req.body; // Expects { id, nameAr, nameEn, phone, email, category }
  const suppliers = readSuppliers();
  if (incoming.id) {
    // Edit existing
    const idx = suppliers.findIndex(s => s.id === incoming.id);
    if (idx !== -1) {
      suppliers[idx] = { ...suppliers[idx], ...incoming };
    }
  } else {
    // Create new
    const newSup = {
      id: "sup-" + Date.now(),
      nameAr: incoming.nameAr || "مورد جديد",
      nameEn: incoming.nameEn || incoming.nameAr || "New Supplier",
      phone: incoming.phone || "0100",
      email: incoming.email || "",
      category: incoming.category || "groceries"
    };
    suppliers.push(newSup);
  }
  writeSuppliers(suppliers);
  res.json({ success: true, suppliers });
});

// ==========================================
// 💸 Supplier Payments API (حسابات الموردين والدفعات النقدية)
// ==========================================
app.get("/api/suppliers/payments", (req, res) => {
  res.json(readSupplierPayments());
});

app.post("/api/suppliers/payments", (req, res) => {
  const incoming = req.body; // Expects { supplierName, amount, date, notes }
  const payments = readSupplierPayments();
  const newPayment = {
    id: "pay-" + Date.now(),
    supplierName: incoming.supplierName,
    amount: Number(incoming.amount || 0),
    date: incoming.date || new Date().toISOString().split('T')[0],
    notes: incoming.notes || "دفعة نقدية"
  };
  payments.push(newPayment);
  writeSupplierPayments(payments);

  pushSystemAuditLog(
    "system",
    `تم تسجيل دفعة نقدية بقيمة [${newPayment.amount} ج.م] لصالح المورد (${newPayment.supplierName})`,
    `Recorded cash payment of [${newPayment.amount} EGP] to supplier (${newPayment.supplierName})`,
    req
  );

  res.json({ success: true, payments });
});

// ==========================================
// 📦 Purchase & Return Invoices API (فواتير المشتريات، المرتجعات، الفواتير المعلقة)
// ==========================================
app.get("/api/invoices", (req, res) => {
  res.json(readInvoices());
});

app.post("/api/invoices", (req, res) => {
  const incoming = req.body; // Expects { invoiceNumber, supplierName, supplierPhone, date, items: [...], totalAmount, isPosted, invoiceType }
  const invoices = readInvoices();
  const dbData = readDatabase();

  const isPosted = incoming.isPosted !== false;
  const invoiceType = incoming.invoiceType || "purchase"; // 'purchase' | 'return'

  const newInvoice = {
    id: "inv-" + Date.now(),
    invoiceNumber: incoming.invoiceNumber || ((invoiceType === 'return' ? "RET-" : "INV-") + Math.floor(1000 + Math.random() * 9000)),
    supplierName: incoming.supplierName || "مورد عام",
    supplierPhone: incoming.supplierPhone || "غير متوفر",
    date: incoming.date || new Date().toISOString().split('T')[0],
    items: incoming.items || [],
    totalAmount: Number(incoming.totalAmount || 0),
    isPosted: isPosted,
    invoiceType: invoiceType
  };

  // If posted immediately, process the stock adjustments
  if (isPosted) {
    newInvoice.items.forEach((item: any) => {
      let product = dbData.find(p => p.id === item.productId || p.barcode === item.barcode);
      const itemQty = Number(item.quantity || 0);

      if (invoiceType === "purchase") {
        if (product) {
          // Product exists - add to warehouse Depot
          product.warehouseStock = (product.warehouseStock || 0) + itemQty;
          product.buyPrice = Number(item.buyPrice || product.buyPrice);
          product.sellPrice = Number(item.sellPrice || product.sellPrice);
          product.lastUpdated = newInvoice.date;

          if (!product.batches) product.batches = [];
          product.batches.push({
            id: `batch-inv-item-${newInvoice.id}-${Date.now()}-${Math.floor(Math.random()*100)}`,
            buyPrice: Number(item.buyPrice),
            sellPrice: Number(item.sellPrice),
            quantity: itemQty,
            initialQuantity: itemQty,
            expiryDate: item.expiryDate || product.expirationDate,
            dateAdded: newInvoice.date
          });

          // Recalculate Weighted Average buyPrice
          const totalStock = product.shelfStock + product.warehouseStock;
          if (totalStock > 0) {
            const totalCost = product.batches.reduce((sum: number, b: any) => sum + (b.quantity * b.buyPrice), 0);
            product.buyPrice = Number((totalCost / totalStock).toFixed(2));
          }
        } else {
          // Create new product
          const newProductId = "p-inv-new-" + Date.now() + "-" + Math.floor(Math.random()*100);
          const newProd = {
            id: newProductId,
            nameAr: item.productNameAr,
            nameEn: item.productNameEn || item.productNameAr,
            barcode: item.barcode || ("BAR-" + Date.now()),
            category: item.category || "groceries",
            shelfStock: 0,
            warehouseStock: itemQty,
            minStockAlert: 20,
            buyPrice: Number(item.buyPrice),
            sellPrice: Number(item.sellPrice),
            expirationDate: item.expiryDate || new Date(Date.now() + 365*24*3600*1000).toISOString().split('T')[0],
            supplierName: newInvoice.supplierName,
            supplierPhone: newInvoice.supplierPhone,
            batchNumber: "B-" + newInvoice.invoiceNumber,
            lastUpdated: newInvoice.date,
            batches: [
              {
                id: `batch-inv-item-new-${Date.now()}`,
                buyPrice: Number(item.buyPrice),
                sellPrice: Number(item.sellPrice),
                quantity: itemQty,
                initialQuantity: itemQty,
                expiryDate: item.expiryDate || new Date(Date.now() + 365*24*3600*1000).toISOString().split('T')[0],
                dateAdded: newInvoice.date
              }
            ]
          };
          dbData.push(newProd);
          item.productId = newProductId;
        }
      } else if (invoiceType === "return") {
        // Return item to supplier - DESTRUCTIVE SUBTRACTION from stocks
        if (product) {
          // Try to subtract from warehouse first, then shelf
          let qtyToDeduct = itemQty;
          if (product.warehouseStock >= qtyToDeduct) {
            product.warehouseStock -= qtyToDeduct;
            qtyToDeduct = 0;
          } else {
            qtyToDeduct -= product.warehouseStock;
            product.warehouseStock = 0;
            product.shelfStock = Math.max(0, product.shelfStock - qtyToDeduct);
          }
          product.lastUpdated = newInvoice.date;
        }
      }
    });

    writeDatabase(dbData);
  }

  invoices.push(newInvoice);
  writeInvoices(invoices);

  const logAr = invoiceType === "purchase"
    ? `تم تسجيل فاتورة توريد مشتريات [${newInvoice.invoiceNumber}] من (${newInvoice.supplierName}) [الحالة: ${isPosted ? 'مرحلة مخزنياً' : 'معلقة / مسودة'}]`
    : `تم تسجيل فاتورة مرتجعات بضاعة [${newInvoice.invoiceNumber}] للمورد (${newInvoice.supplierName}) وإجراء التسوية المخزنية`;
  const logEn = invoiceType === "purchase"
    ? `Recorded purchase invoice [${newInvoice.invoiceNumber}] from (${newInvoice.supplierName}) [Status: ${isPosted ? 'Posted' : 'Draft/Pending'}]`
    : `Recorded merchandise return invoice [${newInvoice.invoiceNumber}] to supplier (${newInvoice.supplierName})`;

  pushSystemAuditLog("system", logAr, logEn, req);

  res.json({ success: true, invoices, products: dbData, invoice: newInvoice });
});

// ترحيل الفاتورة المعلقة (Post a Pending Invoice)
app.post("/api/invoices/:id/post", (req, res) => {
  const { id } = req.params;
  const invoices = readInvoices();
  const dbData = readDatabase();
  const invoice = invoices.find(inv => inv.id === id);

  if (!invoice) {
    return res.status(404).json({ success: false, message: "Invoice not found" });
  }

  if (invoice.isPosted) {
    return res.status(400).json({ success: false, message: "Invoice is already posted" });
  }

  invoice.isPosted = true;

  // Process items
  invoice.items.forEach((item: any) => {
    let product = dbData.find(p => p.id === item.productId || p.barcode === item.barcode);
    const itemQty = Number(item.quantity || 0);

    if (invoice.invoiceType === "return") {
      if (product) {
        let qtyToDeduct = itemQty;
        if (product.warehouseStock >= qtyToDeduct) {
          product.warehouseStock -= qtyToDeduct;
          qtyToDeduct = 0;
        } else {
          qtyToDeduct -= product.warehouseStock;
          product.warehouseStock = 0;
          product.shelfStock = Math.max(0, product.shelfStock - qtyToDeduct);
        }
        product.lastUpdated = invoice.date;
      }
    } else {
      // purchase
      if (product) {
        product.warehouseStock = (product.warehouseStock || 0) + itemQty;
        product.buyPrice = Number(item.buyPrice || product.buyPrice);
        product.sellPrice = Number(item.sellPrice || product.sellPrice);
        product.lastUpdated = invoice.date;

        if (!product.batches) product.batches = [];
        product.batches.push({
          id: `batch-inv-item-${invoice.id}-${Date.now()}-${Math.floor(Math.random()*100)}`,
          buyPrice: Number(item.buyPrice),
          sellPrice: Number(item.sellPrice),
          quantity: itemQty,
          initialQuantity: itemQty,
          expiryDate: item.expiryDate || product.expirationDate,
          dateAdded: invoice.date
        });

        // Recalculate Weighted Average buyPrice
        const totalStock = product.shelfStock + product.warehouseStock;
        if (totalStock > 0) {
          const totalCost = product.batches.reduce((sum: number, b: any) => sum + (b.quantity * b.buyPrice), 0);
          product.buyPrice = Number((totalCost / totalStock).toFixed(2));
        }
      } else {
        const newProductId = "p-inv-new-" + Date.now();
        const newProd = {
          id: newProductId,
          nameAr: item.productNameAr,
          nameEn: item.productNameEn || item.productNameAr,
          barcode: item.barcode || ("BAR-" + Date.now()),
          category: item.category || "groceries",
          shelfStock: 0,
          warehouseStock: itemQty,
          minStockAlert: 20,
          buyPrice: Number(item.buyPrice),
          sellPrice: Number(item.sellPrice),
          expirationDate: item.expiryDate || new Date(Date.now() + 365*24*3600*1000).toISOString().split('T')[0],
          supplierName: invoice.supplierName,
          supplierPhone: invoice.supplierPhone,
          batchNumber: "B-" + invoice.invoiceNumber,
          lastUpdated: invoice.date,
          batches: [
            {
              id: `batch-inv-item-new-${Date.now()}`,
              buyPrice: Number(item.buyPrice),
              sellPrice: Number(item.sellPrice),
              quantity: itemQty,
              initialQuantity: itemQty,
              expiryDate: item.expiryDate || new Date(Date.now() + 365*24*3600*1000).toISOString().split('T')[0],
              dateAdded: invoice.date
            }
          ]
        };
        dbData.push(newProd);
        item.productId = newProductId;
      }
    }
  });

  writeDatabase(dbData);
  writeInvoices(invoices);

  pushSystemAuditLog(
    "system",
    `تم ترحيل الفاتورة المعلقة رقم [${invoice.invoiceNumber}] بنجاح وتحديث مستويات المخزون وحساب متوسط التكلفة`,
    `Successfully posted pending invoice [${invoice.invoiceNumber}] updating live stocks & cost averages`,
    req
  );

  res.json({ success: true, invoices, products: dbData, invoice });
});

// حذف فاتورة معلقة (Delete / Cancel a Pending draft Invoice)
app.delete("/api/invoices/:id", (req, res) => {
  const { id } = req.params;
  let invoices = readInvoices();
  const invoice = invoices.find(inv => inv.id === id);

  if (!invoice) {
    return res.status(404).json({ success: false, message: "Invoice not found" });
  }

  if (invoice.isPosted) {
    return res.status(400).json({ success: false, message: "Cannot delete a posted invoice" });
  }

  invoices = invoices.filter(inv => inv.id !== id);
  writeInvoices(invoices);

  pushSystemAuditLog(
    "system",
    `تم حذف مسودة الفاتورة المعلقة رقم [${invoice.invoiceNumber}] لمورد (${invoice.supplierName}) بنجاح`,
    `Successfully deleted pending draft invoice [${invoice.invoiceNumber}] of supplier (${invoice.supplierName})`,
    req
  );

  res.json({ success: true, invoices });
});

// ==========================================
// 🚚 Internal Transfer Orders (أوزونات التحويل من المخزن إلى المول معتمدة وجاهزة للطباعة)
// ==========================================
app.get("/api/transfers", (req, res) => {
  res.json(readTransfers());
});

app.post("/api/transfers", (req, res) => {
  const incoming = req.body; // Expects { items: [...] }
  const transfers = readTransfers();

  const newTransfer = {
    id: "tr-" + Date.now(),
    orderNumber: "TR-" + new Date().getFullYear() + "-" + Math.floor(10000 + Math.random() * 90000),
    date: incoming.date || new Date().toISOString().split('T')[0],
    items: incoming.items || [],
    status: "pending",
    approvedBy: undefined,
    lastUpdated: new Date().toISOString().split('T')[0]
  };

  transfers.unshift(newTransfer);
  writeTransfers(transfers);
  res.json({ success: true, transfers, transfer: newTransfer });
});

app.post("/api/transfers/:id/status", (req, res) => {
  const { id } = req.params;
  const { status, approvedBy, simulatedToday } = req.body; // Expects status: 'approved' | 'rejected'
  const transfers = readTransfers();
  const dbData = readDatabase();

  const transfer = transfers.find(t => t.id === id);
  if (!transfer) {
    return res.status(404).json({ success: false, message: "Transfer order not found" });
  }

  if (transfer.status !== "pending") {
    return res.status(400).json({ success: false, message: "هذا الطلب تم البت فيه مسبقاً" });
  }

  transfer.status = status;
  transfer.approvedBy = approvedBy || "admin";
  transfer.lastUpdated = simulatedToday || new Date().toISOString().split('T')[0];

  let auditAr = "";
  let auditEn = "";

  if (status === "approved") {
    // Deduct from warehouseStock, Add to shelfStock
    const errors: string[] = [];
    transfer.items.forEach((item: any) => {
      const p = dbData.find((prod: any) => prod.id === item.productId);
      if (p) {
        if (p.warehouseStock >= item.quantity) {
          p.warehouseStock -= item.quantity;
          p.shelfStock += item.quantity;
        } else {
          // If not enough in warehouse, move whatever is available
          const avail = p.warehouseStock;
          p.warehouseStock = 0;
          p.shelfStock += avail;
          errors.push(`الصنف [${p.nameAr}] لديه ${avail} فقط في المخزن، تم تحويلهم للرف.`);
        }
      }
    });

    writeDatabase(dbData);
    auditAr = `تم اعتماد إذن التحويل رقم [${transfer.orderNumber}] ونقل المنتجات من المخزن بالكامل إلى الرفوف بالمول`;
    auditEn = `Approved transfer authorization [${transfer.orderNumber}], moving items from internal warehouse store to ready mall shelves`;
  } else {
    auditAr = `تم رفض إذن التحويل رقم [${transfer.orderNumber}] وإلغاء الطلب`;
    auditEn = `Rejected transfer authorization [${transfer.orderNumber}] - order canceled`;
  }

  writeTransfers(transfers);

  pushSystemAuditLog(
    approvedBy || "admin",
    auditAr,
    auditEn,
    req
  );

  res.json({ success: true, transfers, products: dbData, transfer });
});

// ==========================================
// ↩️ Returns & Spoilage API Endpoints (المرتجع للعملاء مع إعادة السك للمخزون)
// ==========================================
app.post("/api/products/return", (req, res) => {
  const { productId, quantity, customerId, pointsFrictionalValue, simulatedToday } = req.body;
  if (!productId || !quantity) {
    return res.status(400).json({ success: false, message: "Missing return coordinates" });
  }

  const dbData = readDatabase();
  const product = dbData.find(p => p.id === productId);

  if (!product) {
    return res.status(404).json({ success: false, message: "Product not found" });
  }

  const qty = Number(quantity);
  // Re-sk/insert into mall shelves stock
  product.shelfStock = (product.shelfStock || 0) + qty;
  // Reduce units sold count if non-negative
  if (product.unitsSold !== undefined) {
    product.unitsSold = Math.max(0, product.unitsSold - qty);
  }

  // Deduct Points from customer if applicable
  if (customerId && pointsFrictionalValue > 0) {
    const customers = readCustomers();
    const customer = customers.find((c: any) => c.id === customerId);
    if (customer) {
      customer.points = Math.max(0, (customer.points || 0) - pointsFrictionalValue);
      writeCustomers(customers);
    }
  }

  // Record custom return transaction
  const txList = readTransactions();
  txList.push({
    id: `t-return-${product.id}-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    type: 'sale', // logged as sale with negative quantity or custom sale so financial calculations reverse it!
    date: simulatedToday || new Date().toISOString().split('T')[0],
    productId: product.id,
    nameAr: product.nameAr,
    nameEn: product.nameEn,
    quantity: -qty, // Negative quantity reverses sales totals & profit calculations perfectly!
    buyPrice: product.buyPrice,
    sellPrice: product.sellPrice,
    category: product.category,
    timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19)
  });

  writeTransactions(txList);
  writeDatabase(dbData);

  pushSystemAuditLog(
    "system",
    `تم تسجيل صنف مرتجع من عميل: [${product.nameAr}] بعدد (${qty} قطعة) وتم استرجاع الكمية لرفوف المول`,
    `Registered product return: [${product.nameEn}] quantity (${qty} units) returned to floor shelves stock`,
    req
  );

  res.json({ success: true, products: dbData });
});

// 5. POST reset to factory stock values
app.post("/api/products/reset", (req, res) => {
  writeDatabase(INITIAL_PRODUCTS_SEED);
  const seeded = seedTransactions();
  writeTransactions(seeded);
  res.json({ success: true, products: INITIAL_PRODUCTS_SEED, transactions: seeded });
});

// 6. POST quick actions (discount, restock, dispose, authorize supplier shipment)
app.post("/api/products/quick-action", (req, res) => {
  const { action, productId, payload } = req.body;
  const dbData = readDatabase();
  const product = dbData.find((p) => p.id === productId);

  if (!product) {
    return res.status(404).json({ success: false, message: "Product not found" });
  }

  if (action === "discount") {
    // discount percentage
    const percentage = payload.percentage || 20;
    product.isDiscounted = true;
    product.discountPercentage = percentage;
    product.sellPrice = Number((product.sellPrice * (1 - percentage / 100)).toFixed(2));
    product.lastUpdated = payload.today || "2026-06-15";
  } else if (action === "restock") {
    // move index
    const qty = payload.quantity || 0;
    const toMove = Math.min(qty, product.warehouseStock);
    product.shelfStock += toMove;
    product.warehouseStock -= toMove;
    product.lastUpdated = payload.today || "2026-06-15";
  } else if (action === "dispose") {
    // write off
    const discardedQty = product.shelfStock + product.warehouseStock;
    product.unitsLost = (product.unitsLost || 0) + discardedQty;
    product.shelfStock = 0;
    product.warehouseStock = 0;
    product.lastUpdated = payload.today || "2026-06-15";

    if (discardedQty > 0) {
      const txList = readTransactions();
      txList.push({
        id: `t-loss-${product.id}-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        type: 'loss',
        date: payload.simulatedToday || payload.today || new Date().toISOString().split('T')[0],
        productId: product.id,
        nameAr: product.nameAr,
        nameEn: product.nameEn,
        quantity: discardedQty,
        buyPrice: product.buyPrice,
        sellPrice: product.sellPrice,
        category: product.category,
        timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19)
      });
      writeTransactions(txList);
    }
  } else if (action === "supplier_restock") {
    // add from supplier
    const qty = payload.quantity || 0;
    product.warehouseStock += qty;
    product.lastUpdated = payload.today || "2026-06-15";
  }

  writeDatabase(dbData);
  res.json({ success: true, products: dbData, product });
});

// ==========================================
// 🔐 طاقم العمل، الصلاحيات، وسجلات الأمان الفورية (Dynamic Staff Secrets, Clearances & Audit Trails)
// ==========================================
const STAFF_FILE = path.join(process.cwd(), "staff_db.json");
const LOGS_FILE = path.join(process.cwd(), "logs_db.json");

const INITIAL_STAFF_SEED = [
  {
    username: "admin",
    nameAr: "أ. أبو بكر زهران",
    nameEn: "Mr. Abu Bakr",
    role: "admin",
    password: "123",
    status: "offline",
    lastLogin: "-"
  },
  {
    username: "warehouse",
    nameAr: "م. أحمد عبد العال",
    nameEn: "Eng. Ahmad",
    role: "warehouse",
    password: "456",
    status: "offline",
    lastLogin: "-"
  },
  {
    username: "cashier",
    nameAr: "سارة الجياد",
    nameEn: "Sarah Al-Jiad",
    role: "cashier",
    password: "789",
    status: "offline",
    lastLogin: "-"
  }
];

const INITIAL_LOGS_SEED = [
  {
    id: "log-1",
    timestamp: "2026-06-15 10:00:00",
    username: "system",
    name: "مراقبة الاتصال",
    role: "admin",
    actionAr: "تم تفعيل حزمة الأمان والحماية الحية لشبكة جرد المول بنجاح",
    actionEn: "Security and Audit cluster launched for the shopping mall mesh network",
    ip: "10.0.0.1"
  }
];

function readStaff(): any[] {
  if (!fs.existsSync(STAFF_FILE)) {
    fs.writeFileSync(STAFF_FILE, JSON.stringify(INITIAL_STAFF_SEED, null, 2), "utf8");
    return INITIAL_STAFF_SEED;
  }
  try {
    const data = fs.readFileSync(STAFF_FILE, "utf8");
    return JSON.parse(data);
  } catch (err) {
    return INITIAL_STAFF_SEED;
  }
}

function writeStaff(data: any[]) {
  try {
    fs.writeFileSync(STAFF_FILE, JSON.stringify(data, null, 2), "utf8");
  } catch (err) {}
}

function readLogs(): any[] {
  if (!fs.existsSync(LOGS_FILE)) {
    fs.writeFileSync(LOGS_FILE, JSON.stringify(INITIAL_LOGS_SEED, null, 2), "utf8");
    return INITIAL_LOGS_SEED;
  }
  try {
    const data = fs.readFileSync(LOGS_FILE, "utf8");
    return JSON.parse(data);
  } catch (err) {
    return INITIAL_LOGS_SEED;
  }
}

function writeLogs(data: any[]) {
  try {
    fs.writeFileSync(LOGS_FILE, JSON.stringify(data.slice(-200), null, 2), "utf8"); // الاحتفاظ بآخر 200 سجل فقط لحماية الأداء
  } catch (err) {}
}

function pushSystemAuditLog(username: string, actionAr: string, actionEn: string, req?: express.Request) {
  const staffList = readStaff();
  const logs = readLogs();
  const employee = staffList.find(s => s.username === username);
  
  const ip = req ? (req.headers["x-forwarded-for"] || req.socket.remoteAddress || "127.0.0.1") : "127.0.0.1";
  const now = new Date();
  const formattedTime = now.toISOString().replace("T", " ").substring(0, 19);

  const newLog = {
    id: "log-" + Date.now() + "-" + Math.floor(Math.random() * 1000),
    timestamp: formattedTime,
    username: username,
    name: employee ? employee.nameAr : (username === "system" ? "مدير النظام" : username),
    role: employee ? employee.role : "guest",
    actionAr,
    actionEn,
    ip: String(ip).replace("::ffff:", "")
  };

  logs.unshift(newLog); // الأحدث أولاً
  writeLogs(logs);
}

// 🔐 [أ] جلب قائمة طاقم العمل والورديات
app.get("/api/auth/staff", (req, res) => {
  const staff = readStaff();
  // إخفاء كلمات المرور لأغراض الأمان
  const safeStaff = staff.map(({ password, ...rest }) => rest);
  res.json(safeStaff);
});

// 🔐 [ب] تسجيل الدخول الموحد للوردية
app.post("/api/auth/login", (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ success: false, message: "Missing username or password" });
  }

  const staff = readStaff();
  const employee = staff.find(s => s.username.toLowerCase() === username.toLowerCase());

  if (!employee) {
    return res.status(401).json({ 
      success: false, 
      messageAr: "اسم المستخدم غير مسجل في قاعدة بيانات الطاقم", 
      messageEn: "Username not recognized in system registry" 
    });
  }

  if (employee.password !== password) {
    return res.status(401).json({ 
      success: false, 
      messageAr: "العتبة السرية خاطئة! يرجى التأكد من الرقم السري للوردية.", 
      messageEn: "Incorrect credential password. Access denied." 
    });
  }

  // تحديث حالة الاتصال للنشط
  employee.status = "online";
  const now = new Date();
  employee.lastLogin = now.toISOString().replace("T", " ").substring(0, 16);
  writeStaff(staff);

  pushSystemAuditLog(
    employee.username, 
    `قام بتسجيل الدخول الفوري للوردية وبدأ العمل بنشاط`, 
    `Logged into system and acquired shifts workspace`, 
    req
  );

  const { password: _, ...safeEmployee } = employee;
  res.json({ success: true, user: safeEmployee });
});

// 🔐 [ج] تسجيل خروج الموظف من الوردية
app.post("/api/auth/logout", (req, res) => {
  const { username } = req.body;
  const staff = readStaff();
  const employee = staff.find(s => s.username === username);

  if (employee) {
    employee.status = "offline";
    writeStaff(staff);
    pushSystemAuditLog(
      username, 
      `أنهى جلسته وسجل الخروج بأمان من بوابة الأمان للوردية`, 
      `Logged out safely from authorized workspace`, 
      req
    );
  }
  res.json({ success: true });
});

// 🔐 [د] تعديل تفويض وصلاحيات موظف (خاص بالمدير فقط / Admin Only)
app.post("/api/auth/staff/role", (req, res) => {
  const { adminUsername, targetUsername, newRole } = req.body;

  const staff = readStaff();
  const adminUser = staff.find(s => s.username === adminUsername);

  if (!adminUser || adminUser.role !== "admin") {
    return res.status(403).json({ 
      success: false, 
      messageAr: "اختراق بالصلاحية: يجب أن تكون مديراً مأذوناً لتعديل امتيازات الطاقم!", 
      messageEn: "Privilege Escalation Blocked: Role modifications restricted to Administrators only." 
    });
  }

  const targetUser = staff.find(s => s.username === targetUsername);
  if (!targetUser) {
    return res.status(404).json({ success: false, messageAr: "الموظف المستهدف غير موجود", messageEn: "Target employee not found" });
  }

  const oldRole = targetUser.role;
  targetUser.role = newRole;
  writeStaff(staff);

  pushSystemAuditLog(
    adminUsername,
    `قام بتعديل وتفويض صلاحية الموظف (${targetUser.nameAr}) من [${oldRole}] إلى رتبة جديدة: [${newRole}]`,
    `Delegated and modified employee (${targetUser.username}) privileges from [${oldRole}] to [${newRole}]`,
    req
  );

  // إرسال البيانات المحدثة
  const safeStaff = staff.map(({ password, ...rest }) => rest);
  res.json({ success: true, staff: safeStaff });
});

// 🔐 [د-ب] إضافة موظف تشغيلي جديد للطاقم (خاص بالمدير فقط / Admin Only)
app.post("/api/auth/staff/add", (req, res) => {
  const { adminUsername, username, nameAr, nameEn, role, password, shiftTime, registerId } = req.body;
  
  if (!username || !password || !nameAr || !nameEn || !role) {
    return res.status(400).json({ success: false, messageAr: "بيانات ناقصة! يرجى ملء كافة التفاصيل المطلوبة.", messageEn: "Missing required fields for new crew member" });
  }

  const staff = readStaff();
  const adminUser = staff.find(s => s.username === adminUsername);

  if (!adminUser || adminUser.role !== "admin") {
    return res.status(403).json({ 
      success: false, 
      messageAr: "ممنوع: صلاحية إضافة الموظفين وصياغة هوياتهم مقصورة على المدير العام فقط!", 
      messageEn: "Permission Denied: Crew generation is restricted to the General Manager." 
    });
  }

  const exists = staff.some(s => s.username.toLowerCase() === username.toLowerCase().trim());
  if (exists) {
    return res.status(400).json({ 
      success: false, 
      messageAr: "اسم المستخدم هذا مسجل مسبقاً! يرجى اختيار اسم مستخدم فريد.", 
      messageEn: "Username already registered! Choose another unique tag." 
    });
  }

  const newCrew = {
    username: username.toLowerCase().trim(),
    nameAr: nameAr.trim(),
    nameEn: nameEn.trim(),
    role,
    password: password.trim(),
    status: "offline",
    lastLogin: "-",
    shiftTime: shiftTime || "09:00 AM - 05:00 PM",
    registerId: registerId || "REG-A-01",
    totalCheckouts: 0
  };

  staff.push(newCrew);
  writeStaff(staff);

  pushSystemAuditLog(
    adminUsername,
    `قام بإنشاء حساب موظف تشغيلي جديد (${nameAr}) برتبة: [${role}] بجدول وردية: [${newCrew.shiftTime}]`,
    `Generated newly approved workspace employee (${username}) as [${role}] on Shift: [${newCrew.shiftTime}]`,
    req
  );

  const safeStaff = staff.map(({ password, ...rest }) => rest);
  res.json({ success: true, staff: safeStaff });
});

// 🔐 [د-ج] حذف وإلغاء تفويض موظف من النظام (خاص بالمدير فقط / Admin Only)
app.post("/api/auth/staff/delete", (req, res) => {
  const { adminUsername, targetUsername } = req.body;

  const staff = readStaff();
  const adminUser = staff.find(s => s.username === adminUsername);

  if (!adminUser || adminUser.role !== "admin") {
    return res.status(403).json({ 
      success: false, 
      messageAr: "صلاحية مرفوضة: إلغاء حسابات الموظفين مقصور للمدير العام فقط!", 
      messageEn: "Access Denied: Deregistering crew is restricted to Administrators." 
    });
  }

  if (targetUsername === adminUsername) {
    return res.status(400).json({ 
      success: false, 
      messageAr: "خطأ أمني: لا يمكنك حذف حسابك الشخصي النشط!", 
      messageEn: "Deregistration Error: You cannot delete your currently active Administrator session!" 
    });
  }

  const targetIndex = staff.findIndex(s => s.username === targetUsername);
  if (targetIndex === -1) {
    return res.status(404).json({ success: false, messageAr: "الموظف المطلوب غير مسجل بالخادم", messageEn: "Target crew member not found" });
  }

  const deletedEmployee = staff[targetIndex];
  staff.splice(targetIndex, 1);
  writeStaff(staff);

  pushSystemAuditLog(
    adminUsername,
    `قام بحذف وإلغاء وثيقة الموظف العملي (${deletedEmployee.nameAr}) وإخراجه نهائياً من الوردية`,
    `Terminated & deleted crew access for employee (${targetUsername}) - All clearances suspended.`,
    req
  );

  const safeStaff = staff.map(({ password, ...rest }) => rest);
  res.json({ success: true, staff: safeStaff });
});


// 🔐 [هـ] جلب سجلات الحماية والمراجعة الأمنية الحية للمول
app.get("/api/logs", (req, res) => {
  const logs = readLogs();
  res.json(logs);
});

// 🔐 [و] إضافة سجل مخصص للمعاملات (شراء، بيع، تعبئة، تلاف)
app.post("/api/logs/custom", (req, res) => {
  const { username, actionAr, actionEn } = req.body;
  if (username) {
    pushSystemAuditLog(username, actionAr, actionEn, req);
  }
  res.json({ success: true });
});

// ==========================================
// 🏢 Warehouses Database & Endpoints
// ==========================================
const WAREHOUSES_FILE = path.join(process.cwd(), "warehouses_db.json");

const INITIAL_WAREHOUSES = [
  { id: "w-1", name: "المستودع الرئيسي المغذى", responsible: "أحمد عبد العال", location: "المنطقة الصناعية - الجيزة", capacity: "10,000 كرتونة" },
  { id: "w-2", name: "مخزن السلع المبردة والألبان", responsible: "سارة الجياد", location: "بدروم المول الرئيسي", capacity: "3,000 لتر" },
  { id: "w-3", name: "مستودع الأجهزة المنزلية والإلكترونيات", responsible: "أبو بكر زهران", location: "الطابق الأرضي - صالة ب", capacity: "500 وحدة" }
];

function readWarehouses(): any[] {
  if (!fs.existsSync(WAREHOUSES_FILE)) {
    fs.writeFileSync(WAREHOUSES_FILE, JSON.stringify(INITIAL_WAREHOUSES, null, 2), "utf8");
    return INITIAL_WAREHOUSES;
  }
  try {
    return JSON.parse(fs.readFileSync(WAREHOUSES_FILE, "utf8"));
  } catch (e) {
    return INITIAL_WAREHOUSES;
  }
}

function writeWarehouses(data: any[]) {
  try {
    fs.writeFileSync(WAREHOUSES_FILE, JSON.stringify(data, null, 2), "utf8");
  } catch (e) {}
}

app.get("/api/warehouses", (req, res) => {
  res.json(readWarehouses());
});

app.post("/api/warehouses", (req, res) => {
  const incoming = req.body;
  const list = readWarehouses();
  if (incoming.id) {
    const idx = list.findIndex(w => w.id === incoming.id);
    if (idx !== -1) {
      list[idx] = { ...list[idx], ...incoming };
      writeWarehouses(list);
      return res.json({ success: true, warehouses: list, warehouse: list[idx] });
    }
  }
  const newW = {
    id: "w-" + Date.now(),
    name: incoming.name,
    responsible: incoming.responsible || "أحمد عبد العال",
    location: incoming.location || "صالة المعروضات",
    capacity: incoming.capacity || "غير محدد"
  };
  list.push(newW);
  writeWarehouses(list);
  res.json({ success: true, warehouses: list, warehouse: newW });
});


// ==========================================
// 📊 FULL ACCOUNTING CYCLE: Ledger, Treasury, Assets & Loans
// ==========================================
const FINANCIAL_FILE = path.join(process.cwd(), "financials_db.json");

const INITIAL_FINANCIALS = {
  accounts: [
    { code: "101", name: "خزينة الكاشير والصندوق", type: "debit", balance: 45000 },
    { code: "102", name: "الحساب البنكي التجاري الدولي", type: "debit", balance: 250000 },
    { code: "103", name: "الأصول الثابتة (رفوف، ثلاجات، عقارات)", type: "debit", balance: 180000 },
    { code: "104", name: "بضاعة المخزن وأرصدة السلع", type: "debit", balance: 95000 },
    { code: "105", name: "ذمم حسابات العملاء والبيع بالآجل (A/R)", type: "debit", balance: 15000 },
    { code: "201", name: "رأس المال المدفوع التأسيسي", type: "credit", balance: 450000 },
    { code: "202", name: "قروض تمويلية وأقساط بنكية معلقة", type: "credit", balance: 120000 },
    { code: "203", name: "ذمم حسابات الموردين والدائنين التجارية (A/P)", type: "credit", balance: 22000 },
    { code: "301", name: "إيرادات المبيعات المحققة", type: "credit", balance: 0 },
    { code: "401", name: "تكلفة البضاعة المباعة (مشتريات)", type: "debit", balance: 0 },
    { code: "402", name: "مصاريف إهلاك الأصول ورأس المال الهالك", type: "debit", balance: 0 },
    { code: "403", name: "مصاريف هالك وتلفيات البضاعة", type: "debit", balance: 0 },
    { code: "501", name: "حساب ضريبة القيمة المضافة المحصلة (14% VAT)", type: "credit", balance: 0 }
  ],
  journal: [
    {
      id: "j-1",
      date: "2026-06-14",
      desc: "قيد إثبات بضاعة أول المدة ورأس المال التأسيسي",
      debitCode: "104",
      creditCode: "201",
      amount: 95000,
      postedBy: "system",
      isDraft: false
    },
    {
      id: "j-2",
      date: "2026-06-15",
      desc: "سلفة قرض بنكي بقيمة 120,000 ج.م لشراء ثلاجة تبريد للمول",
      debitCode: "101",
      creditCode: "202",
      amount: 120000,
      postedBy: "admin",
      isDraft: false
    }
  ],
  assets: [
    { id: "a-1", name: "ثلاجة تبريد جهينة الكبرى (عرض)", originalValue: 85000, currentValue: 81000, salvageValue: 5000, rate: 10, acquiredDate: "2026-01-10", notes: "إهلاك خطي سنوي بمعدل 10%" },
    { id: "a-2", name: "أنظمة حواسب كاشير وبوابات باركود فرنسية", originalValue: 35000, currentValue: 32000, salvageValue: 2000, rate: 15, acquiredDate: "2026-02-15", notes: "معدل إهلاك للمعدات التقنية 15%" },
    { id: "a-3", name: "سيارة شيفرولية نقل سلع وتوزيع داخلي", originalValue: 120000, currentValue: 112000, salvageValue: 20000, rate: 8, acquiredDate: "2026-03-01", notes: "تخدم نقل البضائع بين الفروع والمخزن" }
  ],
  loans: [
    { id: "l-1", lender: "البنك الأهلي المصري", loanAmount: 120000, rate: 12, termMonths: 12, startDate: "2026-06-15", installmentsPaid: 0, nextDueDate: "2026-07-15", paidAmount: 0, status: "active" },
    { id: "l-2", lender: "المورد شقير جروب للمعلبات", loanAmount: 45000, rate: 0, termMonths: 6, startDate: "2026-06-01", installmentsPaid: 1, nextDueDate: "2026-07-01", paidAmount: 7500, status: "active" }
  ]
};

function readFinancials(): any {
  if (!fs.existsSync(FINANCIAL_FILE)) {
    fs.writeFileSync(FINANCIAL_FILE, JSON.stringify(INITIAL_FINANCIALS, null, 2), "utf8");
    return INITIAL_FINANCIALS;
  }
  try {
    const data = JSON.parse(fs.readFileSync(FINANCIAL_FILE, "utf8"));
    // Migrate: Ensure new accounts are present if they don't exist
    const newCodes = ["105", "203", "403"];
    let migrated = false;
    newCodes.forEach(code => {
      if (!data.accounts.find((a: any) => a.code === code)) {
        const matchingInit = INITIAL_FINANCIALS.accounts.find((a: any) => a.code === code);
        if (matchingInit) {
          data.accounts.push(JSON.parse(JSON.stringify(matchingInit)));
          migrated = true;
        }
      }
    });
    if (migrated) {
      fs.writeFileSync(FINANCIAL_FILE, JSON.stringify(data, null, 2), "utf8");
    }
    return data;
  } catch (e) {
    return INITIAL_FINANCIALS;
  }
}

function writeFinancials(data: any) {
  try {
    fs.writeFileSync(FINANCIAL_FILE, JSON.stringify(data, null, 2), "utf8");
  } catch (e) {}
}

app.get("/api/financials", (req, res) => {
  res.json(readFinancials());
});

app.post("/api/financials/entries", (req, res) => {
  const { debitCode, creditCode, amount, desc, date, postedBy, isDraft, isAdjustment } = req.body;
  if (!debitCode || !creditCode || !amount) {
    return res.status(400).json({ success: false, message: "Missing journal parameters" });
  }

  const fin = readFinancials();
  
  // Create journal entry
  const newEntry = {
    id: "j-" + Date.now(),
    date: date || new Date().toISOString().split('T')[0],
    desc: desc || "قيد محاسبي مضاف",
    debitCode,
    creditCode,
    amount: Number(amount),
    postedBy: postedBy || "system",
    isDraft: isDraft === true || isDraft === 'true',
    isAdjustment: isAdjustment === true || isAdjustment === 'true'
  };

  if (!newEntry.isDraft) {
    // Adjust account balances immediately
    const debAcc = fin.accounts.find((a: any) => a.code === debitCode);
    const credAcc = fin.accounts.find((a: any) => a.code === creditCode);

    if (debAcc) {
      if (debAcc.type === "debit") debAcc.balance += Number(amount);
      else debAcc.balance -= Number(amount);
    }
    if (credAcc) {
      if (credAcc.type === "credit") credAcc.balance += Number(amount);
      else credAcc.balance -= Number(amount);
    }
  }

  fin.journal.unshift(newEntry);
  writeFinancials(fin);
  res.json({ success: true, financials: fin, entry: newEntry });
});

app.post("/api/financials/entries/post-all", (req, res) => {
  const fin = readFinancials();
  let count = 0;
  
  fin.journal.forEach((entry: any) => {
    if (entry.isDraft) {
      entry.isDraft = false;
      count++;
      
      const debAcc = fin.accounts.find((a: any) => a.code === entry.debitCode);
      const credAcc = fin.accounts.find((a: any) => a.code === entry.creditCode);

      if (debAcc) {
        if (debAcc.type === "debit") debAcc.balance += Number(entry.amount);
        else debAcc.balance -= Number(entry.amount);
      }
      if (credAcc) {
        if (credAcc.type === "credit") credAcc.balance += Number(entry.amount);
        else credAcc.balance -= Number(entry.amount);
      }
    }
  });
  
  if (count > 0) {
    writeFinancials(fin);
  }
  res.json({ success: true, count, financials: fin });
});

app.post("/api/financials/reset", (req, res) => {
  writeFinancials(INITIAL_FINANCIALS);
  res.json({ success: true, count: 0, financials: INITIAL_FINANCIALS });
});

app.post("/api/financials/assets", (req, res) => {
  const incoming = req.body;
  const fin = readFinancials();
  if (incoming.action === "depreciate") {
    // Depreciate asset
    const asset = fin.assets.find((a: any) => a.id === incoming.id);
    if (asset) {
      const depAmt = Number(incoming.amount);
      asset.currentValue = Math.max(asset.salvageValue, asset.currentValue - depAmt);
      // Log journal entry automatically: Debit 402 (Depreciation expense) / Credit 103 (Assets value)
      const newEntry = {
        id: "j-dep-" + Date.now(),
        date: new Date().toISOString().split('T')[0],
        desc: `قيد إثبات إهلاك دوري لـ [${asset.name}]`,
        debitCode: "402",
        creditCode: "103",
        amount: depAmt,
        postedBy: "system"
      };
      fin.journal.unshift(newEntry);
      
      const acc402 = fin.accounts.find((a: any) => a.code === "402");
      const acc103 = fin.accounts.find((a: any) => a.code === "103");
      if (acc402) acc402.balance += depAmt;
      if (acc103) acc103.balance -= depAmt;
    }
  } else {
    // Add new asset
    const newAsset = {
      id: "a-" + Date.now(),
      name: incoming.name,
      originalValue: Number(incoming.originalValue),
      currentValue: Number(incoming.originalValue),
      salvageValue: Number(incoming.salvageValue || 0),
      rate: Number(incoming.rate || 10),
      acquiredDate: incoming.acquiredDate || new Date().toISOString().split('T')[0],
      notes: incoming.notes || ""
    };
    fin.assets.push(newAsset);
    
    // Log journal: Debit Fixed Assets (103) / Credit Bank Account (102)
    const newEntry = {
      id: "j-ast-" + Date.now(),
      date: newAsset.acquiredDate,
      desc: `شراء أصل ثابت جديد وتفعيله: [${newAsset.name}]`,
      debitCode: "103",
      creditCode: "102",
      amount: newAsset.originalValue,
      postedBy: "admin"
    };
    fin.journal.unshift(newEntry);
    
    const acc103 = fin.accounts.find((a: any) => a.code === "103");
    const acc102 = fin.accounts.find((a: any) => a.code === "102");
    if (acc103) acc103.balance += newAsset.originalValue;
    if (acc102) acc102.balance -= newAsset.originalValue;
  }

  writeFinancials(fin);
  res.json({ success: true, financials: fin });
});

app.post("/api/financials/loans", (req, res) => {
  const incoming = req.body;
  const fin = readFinancials();
  if (incoming.action === "pay") {
    const loan = fin.loans.find((l: any) => l.id === incoming.id);
    if (loan) {
      const monthlyPay = Number(incoming.amount);
      loan.paidAmount += monthlyPay;
      loan.installmentsPaid += 1;
      if (loan.paidAmount >= loan.loanAmount) {
        loan.status = "paid";
      }
      // Update due date
      const d = new Date(loan.nextDueDate);
      d.setMonth(d.getMonth() + 1);
      loan.nextDueDate = d.toISOString().split('T')[0];

      // Accounting Journal: Debit Bank loan liability (202) / Credit Safe cash (101)
      const newEntry = {
        id: "j-loan-pay-" + Date.now(),
        date: new Date().toISOString().split('T')[0],
        desc: `سداد قسط تمويل أو قرض لصالح جهة (${loan.lender})`,
        debitCode: "202",
        creditCode: "101",
        amount: monthlyPay,
        postedBy: "cashier"
      };
      fin.journal.unshift(newEntry);

      const acc202 = fin.accounts.find((a: any) => a.code === "202");
      const acc101 = fin.accounts.find((a: any) => a.code === "101");
      if (acc202) acc202.balance -= monthlyPay;
      if (acc101) acc101.balance -= monthlyPay;
    }
  } else {
    // Add loan record
    const newLoan = {
      id: "l-" + Date.now(),
      lender: incoming.lender,
      loanAmount: Number(incoming.loanAmount),
      rate: Number(incoming.rate || 0),
      termMonths: Number(incoming.termMonths || 12),
      startDate: incoming.startDate || new Date().toISOString().split('T')[0],
      installmentsPaid: 0,
      nextDueDate: incoming.nextDueDate || new Date(Date.now() + 30*24*3600*1000).toISOString().split('T')[0],
      paidAmount: 0,
      status: "active"
    };
    fin.loans.push(newLoan);
  }
  writeFinancials(fin);
  res.json({ success: true, financials: fin });
});


// ==========================================
// 👤 STAFF / EMPLOYEES: Attendance (حضور وانصراف) and Holidays Leave Manager
// ==========================================
const HR_FILE = path.join(process.cwd(), "hr_db.json");

const INITIAL_HR = {
  attendance: [
    { username: "admin", date: "2026-06-14", clockIn: "08:45 AM", clockOut: "05:15 PM", status: "present" },
    { username: "warehouse", date: "2026-06-14", clockIn: "08:55 AM", clockOut: "05:00 PM", status: "present" },
    { username: "cashier", date: "2026-06-14", clockIn: "09:00 AM", clockOut: "05:10 PM", status: "present" },
    { username: "warehouse", date: "2026-06-15", clockIn: "08:50 AM", clockOut: "05:05 PM", status: "present" },
    { username: "cashier", date: "2026-06-15", clockIn: "09:02 AM", clockOut: "04:55 PM", status: "present" }
  ],
  leaves: [
    { id: "v-1", username: "cashier", nameAr: "سارة الجياد", type: "طارئة", startDate: "2026-06-20", endDate: "2026-06-22", days: 2, reason: "فحوص طبية عائلية", status: "approved" },
    { id: "v-2", username: "warehouse", nameAr: "أحمد عبد العال", type: "سنوية", startDate: "2026-07-01", endDate: "2026-07-06", days: 5, reason: "إجازة مصيف سنوي مع الأسرة", status: "pending" }
  ]
};

function readHR(): any {
  if (!fs.existsSync(HR_FILE)) {
    fs.writeFileSync(HR_FILE, JSON.stringify(INITIAL_HR, null, 2), "utf8");
    return INITIAL_HR;
  }
  try {
    return JSON.parse(fs.readFileSync(HR_FILE, "utf8"));
  } catch (e) {
    return INITIAL_HR;
  }
}

function writeHR(data: any) {
  try {
    fs.writeFileSync(HR_FILE, JSON.stringify(data, null, 2), "utf8");
  } catch (e) {}
}

app.get("/api/hr", (req, res) => {
  res.json(readHR());
});

app.post("/api/hr/attendance", (req, res) => {
  const { username, action, simulatedToday } = req.body;
  if (!username) return res.status(400).json({ success: false, message: "Missing username" });

  const hr = readHR();
  const dateStr = simulatedToday || new Date().toISOString().split('T')[0];
  const now = new Date();
  const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  const sheetIdx = hr.attendance.findIndex((a: any) => a.username === username && a.date === dateStr);
  
  if (action === "clock-in") {
    if (sheetIdx !== -1) {
      return res.status(400).json({ success: false, messageAr: "قمت بتسجيل الحضور مسبقاً لهذا اليوم!" });
    }
    const record = {
      username,
      date: dateStr,
      clockIn: timeStr,
      clockOut: "-",
      status: "present"
    };
    hr.attendance.push(record);
  } else if (action === "clock-out") {
    if (sheetIdx === -1) {
      // Create record with automatic clock-in set as default start shift
      const record = {
        username,
        date: dateStr,
        clockIn: "09:00 AM",
        clockOut: timeStr,
        status: "present"
      };
      hr.attendance.push(record);
    } else {
      hr.attendance[sheetIdx].clockOut = timeStr;
    }
  }

  writeHR(hr);
  res.json({ success: true, hr });
});

app.post("/api/hr/leaves", (req, res) => {
  const incoming = req.body;
  const hr = readHR();
  if (incoming.action === "decide") {
    // Approve or reject
    const v = hr.leaves.find((l: any) => l.id === incoming.id);
    if (v) {
      v.status = incoming.status; // approved / rejected
    }
  } else {
    // Request leave
    const newL = {
      id: "v-" + Date.now(),
      username: incoming.username,
      nameAr: incoming.nameAr || incoming.username,
      type: incoming.type || "سنوية",
      startDate: incoming.startDate,
      endDate: incoming.endDate,
      days: Number(incoming.days || 1),
      reason: incoming.reason || "بدون ذكر أسباب",
      status: "pending"
    };
    hr.leaves.push(newL);
  }
  writeHR(hr);
  res.json({ success: true, hr });
});

// ==========================================
// CATEGORY AND PRODUCT EXTENDED API ROUTES
// ==========================================

// 5. POST scan invoice image and extract items
app.post("/api/products/scan-invoice", async (req, res) => {
  const { image, mimeType } = req.body;
  if (!image) {
    return res.status(400).json({ success: false, message: "لم يتم استلام صورة الفاتورة" });
  }

  try {
    const ai = getGeminiClient();

    // Prepare content parts
    const imagePart = {
      inlineData: {
        mimeType: mimeType || "image/jpeg",
        data: image // Base64 representation
      }
    };

    const promptText = `
      You are an expert accountant and inventory system scanner. 
      Analyze the attached photo of a purchase invoice (فاتورة شراء) in detail.
      Extract all line items / products. For each item, extract:
      1. Product name in Arabic (nameAr) - provide clean Arabic naming as it would appear on a cash register.
      2. Product name in English (nameEn) - if only Arabic is written, translate or romanize it correctly.
      3. Barcode (barcode) - if written on the invoice clearly, extract it. Otherwise, estimate a valid EAN-like barcode sequence or unique placeholder or empty string if not possible.
      4. Quantity (quantity) - integer units.
      5. Purchase Price per unit (buyPrice) in EGP - unit price.
      6. Suggested Category (category) - Guess the most suitable key from this allowed list only: 
         - "groceries" (مواد تموينية وجافة)
         - "dairy" (ألبان وأجبان وصناعاتها)
         - "meat" (لحوم ودواجن وأسماك)
         - "produce" (خضروات وفواكه طازجة)
         - "bakery" (مخبوزات وحلويات)
         - "cleaning" (منظفات ومستلزمات منزلية)
         - "cosmetics" (عناية شخصية وتجميل)
         - "electronics" (أجهزة كهربائية وملحقات)

      Respond strictly in JSON format matching the schema provided.
    `.trim();

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: { parts: [imagePart, { text: promptText }] },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            items: {
              type: Type.ARRAY,
              description: "List of items found in the invoice",
              items: {
                type: Type.OBJECT,
                properties: {
                  nameAr: { type: Type.STRING },
                  nameEn: { type: Type.STRING },
                  barcode: { type: Type.STRING },
                  quantity: { type: Type.INTEGER },
                  buyPrice: { type: Type.NUMBER },
                  category: { type: Type.STRING }
                },
                required: ["nameAr", "nameEn", "quantity", "buyPrice"]
              }
            }
          },
          required: ["items"]
        }
      }
    });

    const textOutput = response.text || "{}";
    let parsedData;
    try {
      parsedData = JSON.parse(textOutput.trim());
    } catch (parseErr) {
      console.error("Failed to parse Gemini JSON output:", textOutput);
      return res.status(500).json({ 
        success: false, 
        message: "فشل في تحليل استجابة الذكاء الاصطناعي بشكل صحيح", 
        raw: textOutput 
      });
    }

    res.json({ success: true, data: parsedData });

    pushSystemAuditLog(
      "system",
      "تم استخدام الذكاء الاصطناعي بنجاح لقراءة وفك تشفير فاتورة شراء مصورة.",
      "Successfully processed purchase invoice image using Gemini AI vision.",
      req
    );

  } catch (error: any) {
    console.error("Invoice scan error:", error);
    res.status(500).json({ 
      success: false, 
      message: error.message || "حدث خطأ غير متوقع أثناء معالجة الفاتورة المصورة بـ Gemini AI" 
    });
  }
});

const CATEGORIES_FILE = path.join(process.cwd(), "categories_db.json");

function readCategories(): any[] {
  try {
    if (fs.existsSync(CATEGORIES_FILE)) {
      return JSON.parse(fs.readFileSync(CATEGORIES_FILE, "utf8"));
    }
  } catch (err) {
    console.error("Failed to read categories database", err);
  }
  return [];
}

function writeCategories(data: any[]) {
  try {
    fs.writeFileSync(CATEGORIES_FILE, JSON.stringify(data, null, 2), "utf8");
  } catch (err) {
    console.error("Failed to write categories database", err);
  }
}

// 1. GET all categories and subcategories
app.get("/api/categories", (req, res) => {
  res.json(readCategories());
});

// 2. POST create / edit main categories & subcategories
app.post("/api/categories", (req, res) => {
  const incoming = req.body; // Expects { key, nameAr, nameEn, subCategories }
  const categories = readCategories();
  const existingIdx = categories.findIndex(c => c.key === incoming.key);
  if (existingIdx !== -1) {
    categories[existingIdx] = { ...categories[existingIdx], ...incoming };
  } else {
    categories.push({
      key: incoming.key || "cat-" + Date.now(),
      nameAr: incoming.nameAr || "",
      nameEn: incoming.nameEn || "",
      subCategories: incoming.subCategories || []
    });
  }
  writeCategories(categories);
  res.json({ success: true, categories });
});

// 3. POST bulk import products from excel/CSV
app.post("/api/products/bulk", (req, res) => {
  const { products: bulkList } = req.body;
  if (!bulkList || !Array.isArray(bulkList)) {
    return res.status(400).json({ success: false, message: "Invalid payload. 'products' array required." });
  }

  const dbData = readDatabase();
  const added: any[] = [];
  const updated: any[] = [];

  bulkList.forEach((incoming: any) => {
    const barcodeClean = String(incoming.barcode || "").trim();
    if (!barcodeClean) return;

    const existingIdx = dbData.findIndex(p => String(p.barcode || "").trim() === barcodeClean || p.id === incoming.id);
    
    const buyPrice = Number(incoming.buyPrice) || 10;
    const sellPrice = Number(incoming.sellPrice) || 15;
    const shelfStock = Number(incoming.shelfStock) || 0;
    const warehouseStock = Number(incoming.warehouseStock) || 0;

    if (existingIdx !== -1) {
      const ext = dbData[existingIdx];
      ext.nameAr = incoming.nameAr || ext.nameAr || "";
      ext.nameEn = incoming.nameEn || ext.nameEn || "";
      ext.category = incoming.category || ext.category || "groceries";
      ext.subCategory = incoming.subCategory || ext.subCategory || "";
      ext.buyPrice = buyPrice;
      ext.sellPrice = sellPrice;
      ext.shelfStock = shelfStock;
      ext.warehouseStock = warehouseStock;
      ext.expirationDate = incoming.expirationDate || ext.expirationDate || "2027-12-30";
      ext.supplierName = incoming.supplierName || ext.supplierName || "مورد كاشير";
      if (incoming.isComposite !== undefined) {
        ext.isComposite = incoming.isComposite;
        ext.components = incoming.components || [];
      }
      
      const totalStock = shelfStock + warehouseStock;
      ext.batches = [
        {
          id: `batch-${ext.id}-old`,
          buyPrice: Number((buyPrice * 0.95).toFixed(2)),
          sellPrice: sellPrice,
          quantity: Math.floor(totalStock * 0.3),
          initialQuantity: Math.floor(totalStock * 0.3),
          expiryDate: ext.expirationDate,
          dateAdded: "2026-05-15"
        },
        {
          id: `batch-${ext.id}-new`,
          buyPrice: buyPrice,
          sellPrice: sellPrice,
          quantity: Math.max(0, totalStock - Math.floor(totalStock * 0.3)),
          initialQuantity: Math.max(0, totalStock - Math.floor(totalStock * 0.3)),
          expiryDate: ext.expirationDate,
          dateAdded: "2026-06-12"
        }
      ];
      updated.push(ext);
    } else {
      const newId = incoming.id || "p-" + Date.now() + "-" + Math.floor(Math.random() * 1000);
      const totalStock = shelfStock + warehouseStock;
      const newProd = {
        id: newId,
        nameAr: incoming.nameAr || incoming.nameEn || "منتج جديد مستورد",
        nameEn: incoming.nameEn || incoming.nameAr || "New Import Product",
        barcode: barcodeClean,
        category: incoming.category || "groceries",
        subCategory: incoming.subCategory || "",
        shelfStock: shelfStock,
        warehouseStock: warehouseStock,
        minStockAlert: Number(incoming.minStockAlert) || 10,
        buyPrice: buyPrice,
        sellPrice: sellPrice,
        expirationDate: incoming.expirationDate || "2027-12-30",
        supplierName: incoming.supplierName || "مورد كاشير",
        supplierPhone: incoming.supplierPhone || "",
        batchNumber: incoming.batchNumber || "BATCH-EXCEL",
        lastUpdated: new Date().toISOString().split('T')[0],
        unitsSold: 0,
        unitsLost: 0,
        isComposite: incoming.isComposite || false,
        components: incoming.components || [],
        batches: [
          {
            id: `batch-${newId}-old`,
            buyPrice: Number((buyPrice * 0.95).toFixed(2)),
            sellPrice: sellPrice,
            quantity: Math.floor(totalStock * 0.3),
            initialQuantity: Math.floor(totalStock * 0.3),
            expiryDate: incoming.expirationDate || "2027-12-30",
            dateAdded: "2026-05-15"
          },
          {
            id: `batch-${newId}-new`,
            buyPrice: buyPrice,
            sellPrice: sellPrice,
            quantity: Math.max(0, totalStock - Math.floor(totalStock * 0.3)),
            initialQuantity: Math.max(0, totalStock - Math.floor(totalStock * 0.3)),
            expiryDate: incoming.expirationDate || "2027-12-30",
            dateAdded: "2026-06-12"
          }
        ]
      };
      dbData.push(newProd);
      added.push(newProd);
    }
  });

  writeDatabase(dbData);
  pushSystemAuditLog(
    "system",
    `تم استيراد منتجات مجمعة عن طريق ملف إكسيل: إضافة (${added.length}) وتحديث (${updated.length}) صنف في قاعدة البيانات.`,
    `Imported bulk products via Excel: added (${added.length}) and updated (${updated.length}) entries in products database.`,
    req
  );

  res.json({ success: true, products: dbData, addedCount: added.length, updatedCount: updated.length });
});

// 4. POST mass adjust prices (all or by category)
app.post("/api/products/mass-adjust-prices", (req, res) => {
  const { category, subCategory, actionType, adjustType, amountValue } = req.body;
  
  const dbData = readDatabase();
  let affectedCount = 0;
  const numValue = Number(amountValue) || 0;

  dbData.forEach((p) => {
    const catMatches = !category || category === "all" || p.category === category;
    const subCatMatches = !subCategory || subCategory === "all" || p.subCategory === subCategory;

    if (catMatches && subCatMatches) {
      affectedCount++;
      let oldPrice = p.sellPrice;
      if (actionType === "increase") {
        if (adjustType === "percent") {
          p.sellPrice = Number((oldPrice * (1 + numValue / 100)).toFixed(2));
        } else {
          p.sellPrice = Number((oldPrice + numValue).toFixed(2));
        }
      } else if (actionType === "decrease") {
        if (adjustType === "percent") {
          p.sellPrice = Math.max(0, Number((oldPrice * (1 - numValue / 100)).toFixed(2)));
        } else {
          p.sellPrice = Math.max(0, Number((oldPrice - numValue).toFixed(2)));
        }
      } else if (actionType === "set") {
        p.sellPrice = Math.max(0, numValue);
      }
      p.lastUpdated = new Date().toISOString().split('T')[0];
    }
  });

  writeDatabase(dbData);
  pushSystemAuditLog(
    "system",
    `تم تعديل أسعار المنتجات معاً مجمعاً لـ (${affectedCount}) منتج بمقدار (${numValue}) نوع (${adjustType === 'percent' ? '%' : 'جنيه'}).`,
    `Mass adjusted prices for (${affectedCount}) items by (${numValue}) via (${adjustType === 'percent' ? '%' : 'EGP'}) strategy.`,
    req
  );

  res.json({ success: true, products: dbData, affectedCount });
});

// 5. POST bulk import discounts on products
app.post("/api/products/discounts/bulk", (req, res) => {
  const { discounts } = req.body; 
  if (!discounts || !Array.isArray(discounts)) {
    return res.status(400).json({ success: false, message: "Invalid payload. 'discounts' array required." });
  }

  const dbData = readDatabase();
  let updatedCount = 0;

  discounts.forEach((item) => {
    const cleanBarcode = String(item.barcode || "").trim();
    if (!cleanBarcode) return;

    const prod = dbData.find(p => String(p.barcode || "").trim() === cleanBarcode);
    if (prod) {
      const val = Number(item.discountValue) || 0;
      if (val > 0) {
        prod.isDiscounted = true;
        prod.discountType = item.discountType === "egp" ? "egp" : "percent";
        prod.discountValue = val;
        prod.discountPercentage = item.discountType === "percent" ? val : undefined;
      } else {
        prod.isDiscounted = false;
        prod.discountType = undefined;
        prod.discountValue = undefined;
        prod.discountPercentage = undefined;
      }
      prod.lastUpdated = new Date().toISOString().split('T')[0];
      updatedCount++;
    }
  });

  writeDatabase(dbData);
  pushSystemAuditLog(
    "system",
    `تم تطبيق خصومات مجمعة من الإكسيل على (${updatedCount}) منتج بنجاح.`,
    `Successfully set bulk discounts on (${updatedCount}) products from Excel sheet.`,
    req
  );

  res.json({ success: true, products: dbData, updatedCount });
});




// Enable Vite middleware in development or serve built files in production
async function startServer() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Successfully connected to MongoDB Cluster!');
    await loadMongoDBIntoCache();
    
    // Ensure first run writes seed data if db is newly created
    readDatabase();
    readTransactions();
  } catch (err) {
    console.error('Error connecting to MongoDB:', err);
  }

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    // Serve HTML page
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();
