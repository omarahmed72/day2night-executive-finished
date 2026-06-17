var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// server.ts
var import_express = __toESM(require("express"), 1);
var import_path = __toESM(require("path"), 1);
var import_fs = __toESM(require("fs"), 1);
var import_vite = require("vite");
var import_genai = require("@google/genai");
var import_mongoose = __toESM(require("mongoose"), 1);
var import_dotenv = __toESM(require("dotenv"), 1);
import_dotenv.default.config();
var app = (0, import_express.default)();
var PORT = 3e3;
var DB_FILE = import_path.default.join(process.cwd(), "products_db.json");
var MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/day2night";
var JSONFileSchema = new import_mongoose.default.Schema({
  filename: { type: String, unique: true },
  content: String
});
var JSONFileModel = import_mongoose.default.model("JSONFile", JSONFileSchema);
var dbCache = {};
var originalReadFileSync = import_fs.default.readFileSync;
var originalWriteFileSync = import_fs.default.writeFileSync;
var originalExistsSync = import_fs.default.existsSync;
import_fs.default.readFileSync = function(pathLike, options) {
  const fileStr = String(pathLike);
  const basename = import_path.default.basename(fileStr);
  if (basename.endsWith("_db.json")) {
    if (dbCache[basename] !== void 0) {
      return dbCache[basename];
    }
  }
  return originalReadFileSync.apply(this, arguments);
};
import_fs.default.writeFileSync = function(pathLike, data, options) {
  const fileStr = String(pathLike);
  const basename = import_path.default.basename(fileStr);
  if (basename.endsWith("_db.json")) {
    dbCache[basename] = String(data);
    JSONFileModel.updateOne(
      { filename: basename },
      { content: String(data) },
      { upsert: true }
    ).catch((err) => console.error("MongoDB Sync Error for", basename, err));
  }
  return originalWriteFileSync.apply(this, arguments);
};
import_fs.default.existsSync = function(pathLike) {
  const fileStr = String(pathLike);
  const basename = import_path.default.basename(fileStr);
  if (basename.endsWith("_db.json")) {
    if (dbCache[basename] !== void 0) return true;
  }
  return originalExistsSync.apply(this, arguments);
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
  } catch (e) {
    console.error("Failed to load from MongoDB", e);
  }
}
app.use(import_express.default.json({ limit: "50mb" }));
app.use(import_express.default.urlencoded({ limit: "50mb", extended: true }));
app.post("/api/mongo-test", (req, res) => {
  if (import_mongoose.default.connection.readyState === 1) {
    res.json({ success: true, message: "MongoDB is connected!" });
  } else {
    res.status(500).json({ success: false, message: "MongoDB is not connected", state: import_mongoose.default.connection.readyState });
  }
});
var aiClient = null;
function getGeminiClient() {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY is not defined in the environment secrets. Please configure it in Settings > Secrets.");
    }
    aiClient = new import_genai.GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build"
        }
      }
    });
  }
  return aiClient;
}
var INITIAL_PRODUCTS_SEED = [
  {
    id: "p-1",
    nameAr: "\u062D\u0644\u064A\u0628 \u062C\u0647\u064A\u0646\u0629 \u0643\u0627\u0645\u0644 \u0627\u0644\u062F\u0633\u0645 1 \u0644\u062A\u0631",
    nameEn: "Juhayna Full Cream Milk 1L",
    barcode: "6221007011012",
    category: "dairy",
    shelfStock: 120,
    warehouseStock: 450,
    minStockAlert: 100,
    buyPrice: 32.5,
    sellPrice: 38,
    expirationDate: "2026-07-20",
    supplierName: "\u062C\u0647\u064A\u0646\u0629 \u0644\u0645\u0646\u062A\u062C\u0627\u062A \u0627\u0644\u0623\u0644\u0628\u0627\u0646",
    supplierPhone: "16630",
    batchNumber: "B-JUH-992",
    lastUpdated: "2026-06-10"
  },
  {
    id: "p-2",
    nameAr: "\u062C\u0628\u0646\u0629 \u062F\u0648\u0645\u062A\u064A \u0641\u064A\u062A\u0627 \u0639\u0644\u0628\u0629 500 \u062C\u0631\u0627\u0645",
    nameEn: "Domty Feta Cheese 500g",
    barcode: "6224000329105",
    category: "dairy",
    shelfStock: 80,
    warehouseStock: 200,
    minStockAlert: 90,
    buyPrice: 28,
    sellPrice: 34,
    expirationDate: "2026-08-01",
    supplierName: "\u062F\u0648\u0645\u062A\u064A \u0644\u0644\u0623\u063A\u0630\u064A\u0629",
    supplierPhone: "16115",
    batchNumber: "B-DOM-331",
    lastUpdated: "2026-06-12"
  },
  {
    id: "p-3",
    nameAr: "\u0632\u0628\u0627\u062F\u064A \u0637\u0628\u064A\u0639\u064A \u0627\u0644\u0645\u0631\u0627\u0639\u064A 105 \u062C\u0631\u0627\u0645",
    nameEn: "Almarai Natural Yogurt 105g",
    barcode: "6281006112024",
    category: "dairy",
    shelfStock: 250,
    warehouseStock: 100,
    minStockAlert: 150,
    buyPrice: 6.8,
    sellPrice: 8.5,
    expirationDate: "2026-06-25",
    supplierName: "\u062C\u0647\u064A\u0646\u0629 \u0644\u0645\u0646\u062A\u062C\u0627\u062A \u0627\u0644\u0623\u0644\u0628\u0627\u0646",
    supplierPhone: "16630",
    batchNumber: "B-ALM-102",
    lastUpdated: "2026-06-14"
  },
  {
    id: "p-4",
    nameAr: "\u0645\u0643\u0631\u0648\u0646\u0629 \u0631\u064A\u062C\u064A\u0646\u0627 \u0628\u0646\u0629 (\u0642\u0644\u0645) 400 \u062C\u0631\u0627\u0645",
    nameEn: "Regina Penne Pasta 400g",
    barcode: "6221034002427",
    category: "groceries",
    shelfStock: 15,
    warehouseStock: 0,
    minStockAlert: 50,
    buyPrice: 18,
    sellPrice: 22,
    expirationDate: "2026-05-10",
    supplierName: "\u062F\u0648\u0645\u062A\u064A \u0644\u0644\u0623\u063A\u0630\u064A\u0629",
    supplierPhone: "16115",
    batchNumber: "B-REG-011",
    lastUpdated: "2026-06-01"
  },
  {
    id: "p-5",
    nameAr: "\u0632\u064A\u062A \u0639\u0628\u0627\u062F \u0627\u0644\u0634\u0645\u0633 \u0643\u0631\u064A\u0633\u062A\u0627\u0644 1.6 \u0644\u062A\u0631",
    nameEn: "Crystal Sunflower Oil 1.6L",
    barcode: "6221324551093",
    category: "groceries",
    shelfStock: 45,
    warehouseStock: 120,
    minStockAlert: 40,
    buyPrice: 120,
    sellPrice: 145,
    expirationDate: "2026-08-10",
    supplierName: "\u062F\u0648\u0645\u062A\u064A \u0644\u0644\u0623\u063A\u0630\u064A\u0629",
    supplierPhone: "16115",
    batchNumber: "B-CRY-880",
    lastUpdated: "2026-06-11"
  },
  {
    id: "p-6",
    nameAr: "\u0641\u0631\u0627\u062E \u0643\u0648\u0643\u064A \u0645\u062C\u0645\u062F\u0647 \u0635\u062F\u0648\u0631 \u0628\u0627\u0646\u064A\u0647 1 \u0643\u064A\u0644\u0648",
    nameEn: "Koki Frozen Chicken Pane 1kg",
    barcode: "6221056441019",
    category: "meat",
    shelfStock: 60,
    warehouseStock: 180,
    minStockAlert: 50,
    buyPrice: 165,
    sellPrice: 195,
    expirationDate: "2026-12-15",
    supplierName: "\u0627\u0644\u0634\u0631\u0643\u0629 \u0627\u0644\u0645\u0635\u0631\u064A\u0629 \u0644\u062A\u062C\u0627\u0631\u0629 \u0627\u0644\u0644\u062D\u0648\u0645",
    supplierPhone: "0223456789",
    batchNumber: "B-KOK-404",
    lastUpdated: "2026-06-05"
  },
  {
    id: "p-7",
    nameAr: "\u062A\u0641\u0627\u062D \u0623\u062D\u0645\u0631 \u0633\u0643\u0631\u064A \u0625\u064A\u0637\u0627\u0644\u064A \u0637\u0627\u0632\u062C 1 \u0643\u064A\u0644\u0648",
    nameEn: "Fresh Italian Red Apple 1kg",
    barcode: "0000000000101",
    category: "produce",
    shelfStock: 90,
    warehouseStock: 150,
    minStockAlert: 60,
    buyPrice: 60,
    sellPrice: 75,
    expirationDate: "2026-06-30",
    supplierName: "\u0645\u0632\u0627\u0631\u0639 \u062F\u064A\u0646\u0627 \u0644\u0644\u0641\u0648\u0627\u0643\u0647 \u0648\u0627\u0644\u062E\u0636\u0627\u0631",
    supplierPhone: "19044",
    batchNumber: "B-APP-772",
    lastUpdated: "2026-06-14"
  },
  {
    id: "p-8",
    nameAr: "\u0643\u0631\u0648\u0627\u0633\u0648\u0646 \u0632\u0628\u062F\u0629 \u0637\u0627\u0632\u062C \u0628\u0627\u0644\u0634\u0648\u0643\u0648\u0644\u0627\u062A\u0629 (\u062D\u0628\u0629)",
    nameEn: "Fresh Butter Chocolate Croissant",
    barcode: "0000000000202",
    category: "bakery",
    shelfStock: 40,
    warehouseStock: 0,
    minStockAlert: 20,
    buyPrice: 12,
    sellPrice: 18,
    expirationDate: "2026-06-18",
    supplierName: "\u0645\u062E\u0628\u0648\u0632\u0627\u062A \u0648\u062D\u0644\u0648\u064A\u0627\u062A \u062F\u0627\u064A \u062A\u0648 \u0646\u0627\u064A\u062A",
    supplierPhone: "\u062F\u0627\u062E\u0644\u064A",
    batchNumber: "B-BAK-151",
    lastUpdated: "2026-06-15"
  },
  {
    id: "p-9",
    nameAr: "\u0645\u0633\u062D\u0648\u0642 \u063A\u0633\u064A\u0644 \u0623\u0631\u064A\u0627\u0644 \u0644\u0644\u063A\u0633\u0627\u0644\u0627\u062A \u0627\u0644\u0623\u0648\u062A\u0648\u0645\u0627\u062A\u064A\u0643 4 \u0643\u064A\u0644\u0648",
    nameEn: "Ariel Automatic Detergent 4kg",
    barcode: "4015600508561",
    category: "cleaning",
    shelfStock: 50,
    warehouseStock: 150,
    minStockAlert: 30,
    buyPrice: 280,
    sellPrice: 320,
    expirationDate: "2029-06-15",
    supplierName: "\u0647\u0644\u0627\u0644 \u0648\u0645\u0635\u064A\u0644\u062D\u064A \u0644\u0644\u0645\u0646\u0638\u0641\u0627\u062A",
    supplierPhone: "01012345678",
    batchNumber: "B-ARI-202",
    lastUpdated: "2026-06-15"
  },
  {
    id: "p-10",
    nameAr: "\u0634\u0648\u0643\u0648\u0644\u0627\u062A\u0629 \u062C\u0627\u0644\u0627\u0643\u0633\u064A \u0628\u0646\u062F\u0642 36 \u062C\u0631\u0627\u0645",
    nameEn: "Galaxy Hazelnut Chocolate 36g",
    barcode: "6221198081115",
    category: "bakery",
    shelfStock: 140,
    warehouseStock: 300,
    minStockAlert: 80,
    buyPrice: 15,
    sellPrice: 19,
    expirationDate: "2026-06-05",
    supplierName: "\u062F\u0648\u0645\u062A\u064A \u0644\u0644\u0623\u063A\u0630\u064A\u0629",
    supplierPhone: "16115",
    batchNumber: "B-GAL-301",
    lastUpdated: "2026-05-20"
  },
  {
    id: "p-11",
    nameAr: "\u0645\u0639\u062C\u0648\u0646 \u0623\u0633\u0646\u0627\u0646 \u0643\u0648\u0644\u062C\u064A\u062A \u062D\u0645\u0627\u064A\u0629 \u0645\u0643\u062B\u0641\u0629 75 \u0645\u0644",
    nameEn: "Colgate Max Fresh Toothpaste 75ml",
    barcode: "8718951234567",
    category: "cosmetics",
    shelfStock: 15,
    warehouseStock: 80,
    minStockAlert: 25,
    buyPrice: 38,
    sellPrice: 46,
    expirationDate: "2027-02-15",
    supplierName: "\u0647\u0644\u0627\u0644 \u0648\u0645\u0635\u064A\u0644\u062D\u064A \u0644\u0644\u0645\u0646\u0638\u0641\u0627\u062A",
    supplierPhone: "01012345678",
    batchNumber: "B-COL-711",
    lastUpdated: "2026-06-03"
  },
  {
    id: "p-12",
    nameAr: "\u062E\u0644\u0627\u0637 \u062A\u0648\u0631\u0646\u064A\u062F\u0648 1.5 \u0644\u062A\u0631 600 \u0648\u0627\u062A \u0645\u0637\u062D\u0646\u0629",
    nameEn: "Tornado Blender 1.5L 600W",
    barcode: "6222019011244",
    category: "electronics",
    shelfStock: 8,
    warehouseStock: 14,
    minStockAlert: 5,
    buyPrice: 1100,
    sellPrice: 1350,
    expirationDate: "2031-12-30",
    supplierName: "\u0627\u0644\u0639\u0631\u0628\u064A \u062C\u0631\u0648\u0628 \u0644\u0644\u0623\u062C\u0647\u0632\u0629",
    supplierPhone: "19319",
    batchNumber: "B-TOR-001",
    lastUpdated: "2026-06-11"
  }
];
var PRESET_STATS = {
  "p-1": { unitsSold: 215, unitsLost: 12 },
  "p-2": { unitsSold: 180, unitsLost: 8 },
  "p-3": { unitsSold: 310, unitsLost: 22 },
  "p-4": { unitsSold: 140, unitsLost: 0 },
  "p-5": { unitsSold: 95, unitsLost: 3 },
  "p-6": { unitsSold: 120, unitsLost: 5 },
  "p-7": { unitsSold: 85, unitsLost: 15 },
  "p-8": { unitsSold: 240, unitsLost: 28 },
  "p-9": { unitsSold: 60, unitsLost: 2 },
  "p-10": { unitsSold: 450, unitsLost: 10 },
  "p-11": { unitsSold: 75, unitsLost: 1 },
  "p-12": { unitsSold: 18, unitsLost: 0 }
};
function readDatabase() {
  let list;
  if (!import_fs.default.existsSync(DB_FILE)) {
    import_fs.default.writeFileSync(DB_FILE, JSON.stringify(INITIAL_PRODUCTS_SEED, null, 2), "utf8");
    list = JSON.parse(JSON.stringify(INITIAL_PRODUCTS_SEED));
  } else {
    try {
      const data = import_fs.default.readFileSync(DB_FILE, "utf8");
      list = JSON.parse(data);
    } catch (err) {
      console.error("Failed to read database, falling back to seed data", err);
      list = JSON.parse(JSON.stringify(INITIAL_PRODUCTS_SEED));
    }
  }
  let changed = false;
  list.forEach((p) => {
    if (p.unitsSold === void 0 || p.unitsLost === void 0) {
      const presets = PRESET_STATS[p.id] || { unitsSold: 0, unitsLost: 0 };
      if (p.unitsSold === void 0) p.unitsSold = presets.unitsSold;
      if (p.unitsLost === void 0) p.unitsLost = presets.unitsLost;
      changed = true;
    }
    if (!p.batches || p.batches.length === 0) {
      const totalStock = (p.shelfStock || 0) + (p.warehouseStock || 0);
      const oldQty = Math.floor(totalStock * 0.4);
      const newQty = Math.max(0, totalStock - oldQty);
      p.batches = [
        {
          id: `batch-${p.id}-old`,
          buyPrice: Number((p.buyPrice * 0.9).toFixed(2)),
          // 10% cheaper
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
      const totalCost = p.batches.reduce((sum, b) => sum + b.quantity * b.buyPrice, 0);
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
function writeDatabase(data) {
  try {
    import_fs.default.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), "utf8");
  } catch (err) {
    console.error("Failed to persist database file", err);
  }
}
var TRANSACTIONS_FILE = import_path.default.join(process.cwd(), "transactions_db.json");
function getProductInfo(productId) {
  const p = INITIAL_PRODUCTS_SEED.find((item) => item.id === productId);
  return p ? {
    nameAr: p.nameAr,
    nameEn: p.nameEn,
    buyPrice: p.buyPrice,
    sellPrice: p.sellPrice,
    category: p.category
  } : {
    nameAr: "\u0645\u0646\u062A\u062C \u0645\u062C\u0647\u0648\u0644",
    nameEn: "Unknown Product",
    buyPrice: 0,
    sellPrice: 0,
    category: "other"
  };
}
function seedTransactions() {
  const list = [];
  const dates = [
    { date: "2026-06-15", pctSold: 0.35, pctLost: 0.35 },
    { date: "2026-06-14", pctSold: 0.25, pctLost: 0.25 },
    { date: "2026-06-13", pctSold: 0.15, pctLost: 0.15 },
    { date: "2026-06-12", pctSold: 0.12, pctLost: 0.1 },
    { date: "2026-06-10", pctSold: 0.08, pctLost: 0.1 },
    { date: "2026-05-28", pctSold: 0.03, pctLost: 0.03 },
    { date: "2026-05-25", pctSold: 0.02, pctLost: 0.02 }
  ];
  for (const pId of Object.keys(PRESET_STATS)) {
    const preset = PRESET_STATS[pId];
    const info = getProductInfo(pId);
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
          type: "sale",
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
          type: "loss",
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
function readTransactions() {
  if (!import_fs.default.existsSync(TRANSACTIONS_FILE)) {
    const seeded = seedTransactions();
    import_fs.default.writeFileSync(TRANSACTIONS_FILE, JSON.stringify(seeded, null, 2), "utf8");
    return seeded;
  }
  try {
    const data = import_fs.default.readFileSync(TRANSACTIONS_FILE, "utf8");
    return JSON.parse(data);
  } catch (e) {
    return [];
  }
}
function writeTransactions(data) {
  try {
    import_fs.default.writeFileSync(TRANSACTIONS_FILE, JSON.stringify(data, null, 2), "utf8");
  } catch (e) {
  }
}
app.get("/api/products", (req, res) => {
  const dbData = readDatabase();
  res.json(dbData);
});
app.get("/api/transactions", (req, res) => {
  const transactions = readTransactions();
  res.json(transactions);
});
app.post("/api/products", (req, res) => {
  const incoming = req.body;
  const dbData = readDatabase();
  const existingIdx = dbData.findIndex((p) => p.id === incoming.id);
  if (existingIdx !== -1) {
    dbData[existingIdx] = { ...dbData[existingIdx], ...incoming };
    writeDatabase(dbData);
    res.json({ success: true, message: "Product updated successfully", product: dbData[existingIdx] });
  } else {
    if (!incoming.id) {
      incoming.id = "p-" + Date.now();
    }
    dbData.push(incoming);
    writeDatabase(dbData);
    res.json({ success: true, message: "Product created successfully", product: incoming });
  }
});
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
var CUSTOMERS_FILE = import_path.default.join(process.cwd(), "customers_db.json");
var INVOICES_FILE = import_path.default.join(process.cwd(), "invoices_db.json");
var TRANSFERS_FILE = import_path.default.join(process.cwd(), "transfers_db.json");
var SUPPLIERS_FILE = import_path.default.join(process.cwd(), "suppliers_db.json");
var SUPPLIER_PAYMENTS_FILE = import_path.default.join(process.cwd(), "supplier_payments_db.json");
var INITIAL_SUPPLIERS_BACKEND = [
  { id: "sup-1", nameAr: "\u062C\u0647\u064A\u0646\u0629 \u0644\u0645\u0646\u062A\u062C\u0627\u062A \u0627\u0644\u0623\u0644\u0628\u0627\u0646", nameEn: "Juhayna Dairy Corp", phone: "16630", email: "info@juhayna.com", category: "dairy" },
  { id: "sup-2", nameAr: "\u062F\u0648\u0645\u062A\u064A \u0644\u0644\u0623\u063A\u0630\u064A\u0629", nameEn: "Domty Foods", phone: "16115", email: "sales@domty.com", category: "dairy" },
  { id: "sup-3", nameAr: "\u0627\u0644\u0634\u0631\u0643\u0629 \u0627\u0644\u0645\u0635\u0631\u064A\u0629 \u0644\u062A\u062C\u0627\u0631\u0629 \u0627\u0644\u0644\u062D\u0648\u0645", nameEn: "Egyptian Meat Co", phone: "0223456789", email: "meat@egyptian.com", category: "meat" },
  { id: "sup-4", nameAr: "\u0645\u0632\u0627\u0631\u0639 \u062F\u064A\u0646\u0627 \u0644\u0644\u0641\u0648\u0627\u0643\u0647 \u0648\u0627\u0644\u062E\u0636\u0627\u0631", nameEn: "Dina Farms", phone: "19044", email: "produce@dinafarms.com", category: "produce" },
  { id: "sup-5", nameAr: "\u0647\u0644\u0627\u0644 \u0648\u0645\u0635\u064A\u0644\u062D\u064A \u0644\u0644\u0645\u0646\u0638\u0641\u0627\u062A", nameEn: "Helal & Moselhy Soap", phone: "01012345678", email: "helal@clean.com", category: "cleaning" },
  { id: "sup-6", nameAr: "\u0627\u0644\u0639\u0631\u0628\u064A \u062C\u0631\u0648\u0628 \u0644\u0644\u0623\u062C\u0647\u0632\u0629", nameEn: "El-Araby Group", phone: "19319", email: "service@elaraby.com", category: "electronics" }
];
var INITIAL_CUSTOMERS = [
  { id: "c-1", name: "\u0645\u0635\u0637\u0641\u0649 \u0643\u0633\u0627\u0628", phone: "01032847586", governorate: "\u0627\u0644\u0642\u0627\u0647\u0631\u0629", points: 280 },
  { id: "c-2", name: "\u0623\u062D\u0645\u062F \u0639\u0628\u062F \u0627\u0644\u0648\u0647\u0627\u0628", phone: "01155382029", governorate: "\u0627\u0644\u062C\u064A\u0632\u0629", points: 154 },
  { id: "c-3", name: "\u0631\u0634\u0627 \u0627\u0644\u062F\u0627\u0644\u064A", phone: "01239485761", governorate: "\u0627\u0644\u0625\u0633\u0643\u0646\u062F\u0631\u064A\u0629", points: 520 },
  { id: "c-4", name: "\u0645\u062D\u0645\u062F \u0623\u0628\u0648 \u0637\u0627\u0644\u0628", phone: "01529384756", governorate: "\u0627\u0644\u062F\u0642\u0647\u0644\u064A\u0629", points: 90 }
];
var INITIAL_TRANSFERS = [
  {
    id: "tr-1",
    orderNumber: "TR-2026-001",
    date: "2026-06-14",
    items: [
      { productId: "p-1", productNameAr: "\u062D\u0644\u064A\u0628 \u062C\u0647\u064A\u0646\u0629 \u0643\u0627\u0645\u0644 \u0627\u0644\u062F\u0633\u0645 1 \u0644\u062A\u0631", productNameEn: "Juhayna Full Cream Milk 1L", quantity: 50 },
      { productId: "p-2", productNameAr: "\u062C\u0628\u0646\u0629 \u062F\u0648\u0645\u062A\u064A \u0641\u064A\u062A\u0627 \u0639\u0644\u0628\u0629 500 \u062C\u0631\u0627\u0645", productNameEn: "Domty Feta Cheese 500g", quantity: 30 }
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
      { productId: "p-5", productNameAr: "\u0632\u064A\u062A \u0639\u0628\u0627\u062F \u0627\u0644\u0634\u0645\u0633 \u0643\u0631\u064A\u0633\u062A\u0627\u0644 1.6 \u0644\u062A\u0631", productNameEn: "Crystal Sunflower Oil 1.6L", quantity: 20 }
    ],
    status: "pending",
    approvedBy: void 0,
    lastUpdated: "2026-06-15"
  }
];
var INITIAL_INVOICES = [
  {
    id: "inv-1",
    invoiceNumber: "INV-9921",
    supplierName: "\u062C\u0647\u064A\u0646\u0629 \u0644\u0645\u0646\u062A\u062C\u0627\u062A \u0627\u0644\u0623\u0644\u0628\u0627\u0646",
    supplierPhone: "16630",
    date: "2026-06-12",
    items: [
      {
        productId: "p-1",
        productNameAr: "\u062D\u0644\u064A\u0628 \u062C\u0647\u064A\u0646\u0629 \u0643\u0627\u0645\u0644 \u0627\u0644\u062F\u0633\u0645 1 \u0644\u062A\u0631",
        productNameEn: "Juhayna Full Cream Milk 1L",
        barcode: "6221007011012",
        category: "dairy",
        quantity: 100,
        buyPrice: 32.5,
        sellPrice: 38,
        expiryDate: "2026-07-20"
      }
    ],
    totalAmount: 3250,
    isPosted: true
  }
];
function readCustomers() {
  if (!import_fs.default.existsSync(CUSTOMERS_FILE)) {
    import_fs.default.writeFileSync(CUSTOMERS_FILE, JSON.stringify(INITIAL_CUSTOMERS, null, 2), "utf8");
    return INITIAL_CUSTOMERS;
  }
  try {
    return JSON.parse(import_fs.default.readFileSync(CUSTOMERS_FILE, "utf8"));
  } catch (e) {
    return INITIAL_CUSTOMERS;
  }
}
function writeCustomers(data) {
  try {
    import_fs.default.writeFileSync(CUSTOMERS_FILE, JSON.stringify(data, null, 2), "utf8");
  } catch (e) {
  }
}
function readInvoices() {
  if (!import_fs.default.existsSync(INVOICES_FILE)) {
    import_fs.default.writeFileSync(INVOICES_FILE, JSON.stringify(INITIAL_INVOICES, null, 2), "utf8");
    return INITIAL_INVOICES;
  }
  try {
    return JSON.parse(import_fs.default.readFileSync(INVOICES_FILE, "utf8"));
  } catch (e) {
    return INITIAL_INVOICES;
  }
}
function writeInvoices(data) {
  try {
    import_fs.default.writeFileSync(INVOICES_FILE, JSON.stringify(data, null, 2), "utf8");
  } catch (e) {
  }
}
function readSuppliers() {
  if (!import_fs.default.existsSync(SUPPLIERS_FILE)) {
    import_fs.default.writeFileSync(SUPPLIERS_FILE, JSON.stringify(INITIAL_SUPPLIERS_BACKEND, null, 2), "utf8");
    return INITIAL_SUPPLIERS_BACKEND;
  }
  try {
    return JSON.parse(import_fs.default.readFileSync(SUPPLIERS_FILE, "utf8"));
  } catch (e) {
    return INITIAL_SUPPLIERS_BACKEND;
  }
}
function writeSuppliers(data) {
  try {
    import_fs.default.writeFileSync(SUPPLIERS_FILE, JSON.stringify(data, null, 2), "utf8");
  } catch (e) {
  }
}
function readSupplierPayments() {
  if (!import_fs.default.existsSync(SUPPLIER_PAYMENTS_FILE)) {
    import_fs.default.writeFileSync(SUPPLIER_PAYMENTS_FILE, JSON.stringify([], null, 2), "utf8");
    return [];
  }
  try {
    return JSON.parse(import_fs.default.readFileSync(SUPPLIER_PAYMENTS_FILE, "utf8"));
  } catch (e) {
    return [];
  }
}
function writeSupplierPayments(data) {
  try {
    import_fs.default.writeFileSync(SUPPLIER_PAYMENTS_FILE, JSON.stringify(data, null, 2), "utf8");
  } catch (e) {
  }
}
function readTransfers() {
  if (!import_fs.default.existsSync(TRANSFERS_FILE)) {
    import_fs.default.writeFileSync(TRANSFERS_FILE, JSON.stringify(INITIAL_TRANSFERS, null, 2), "utf8");
    return INITIAL_TRANSFERS;
  }
  try {
    return JSON.parse(import_fs.default.readFileSync(TRANSFERS_FILE, "utf8"));
  } catch (e) {
    return INITIAL_TRANSFERS;
  }
}
function writeTransfers(data) {
  try {
    import_fs.default.writeFileSync(TRANSFERS_FILE, JSON.stringify(data, null, 2), "utf8");
  } catch (e) {
  }
}
app.post("/api/products/sell", (req, res) => {
  const { items, simulatedToday, deductionMethod, customerId, pointsRedeemed, pointsEarned } = req.body;
  if (!items || !Array.isArray(items)) {
    return res.status(400).json({ success: false, message: "Invalid payload. 'items' array required." });
  }
  const dbData = readDatabase();
  const method = deductionMethod || "fifo";
  const updatedIds = [];
  const errors = [];
  const transRecords = [];
  for (const sale of items) {
    const product = dbData.find((p) => p.id === sale.productId);
    if (product) {
      if (product.shelfStock >= sale.quantity) {
        product.shelfStock -= sale.quantity;
        product.unitsSold = (product.unitsSold || 0) + sale.quantity;
        updatedIds.push(product.id);
        if (product.isComposite && Array.isArray(product.components)) {
          product.components.forEach((comp) => {
            const componentProduct = dbData.find((p) => p.id === comp.productId);
            if (componentProduct) {
              const neededQty = comp.quantity * sale.quantity;
              componentProduct.shelfStock = Math.max(0, componentProduct.shelfStock - neededQty);
              componentProduct.unitsSold = (componentProduct.unitsSold || 0) + neededQty;
              let compRemaining = neededQty;
              let compActiveBatches = (componentProduct.batches || []).filter((b) => b.quantity > 0);
              if (method === "lifo") {
                compActiveBatches.sort((a, b) => new Date(b.dateAdded).getTime() - new Date(a.dateAdded).getTime());
              } else {
                compActiveBatches.sort((a, b) => new Date(a.dateAdded).getTime() - new Date(b.dateAdded).getTime());
              }
              for (const cb of compActiveBatches) {
                if (compRemaining <= 0) break;
                const originalCompBatch = componentProduct.batches.find((ob) => ob.id === cb.id);
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
        let remainingToDeplete = sale.quantity;
        let totalBuyCostOfSale = 0;
        let activeBatches = (product.batches || []).filter((b) => b.quantity > 0);
        if (method === "lifo") {
          activeBatches.sort((a, b) => new Date(b.dateAdded).getTime() - new Date(a.dateAdded).getTime());
        } else {
          activeBatches.sort((a, b) => new Date(a.dateAdded).getTime() - new Date(b.dateAdded).getTime());
        }
        for (const b of activeBatches) {
          if (remainingToDeplete <= 0) break;
          const originalBatch = product.batches.find((ob) => ob.id === b.id);
          if (originalBatch) {
            const taken = Math.min(remainingToDeplete, originalBatch.quantity);
            originalBatch.quantity -= taken;
            remainingToDeplete -= taken;
            totalBuyCostOfSale += taken * originalBatch.buyPrice;
          }
        }
        if (remainingToDeplete > 0) {
          totalBuyCostOfSale += remainingToDeplete * product.buyPrice;
        }
        const calculatedBuyPrice = Number((totalBuyCostOfSale / sale.quantity).toFixed(2));
        const sellPriceAfterDiscount = sale.finalPrice !== void 0 ? sale.finalPrice : sale.sellPrice;
        transRecords.push({
          id: `t-sale-${product.id}-${Date.now()}-${Math.floor(Math.random() * 1e3)}`,
          type: "sale",
          date: simulatedToday || (/* @__PURE__ */ new Date()).toISOString().split("T")[0],
          productId: product.id,
          nameAr: product.nameAr,
          nameEn: product.nameEn,
          quantity: sale.quantity,
          buyPrice: calculatedBuyPrice,
          // Actual batch cost!
          sellPrice: sellPriceAfterDiscount,
          category: product.category,
          timestamp: (/* @__PURE__ */ new Date()).toISOString().replace("T", " ").substring(0, 19)
        });
        const totalStockRemaining = product.shelfStock + product.warehouseStock;
        if (totalStockRemaining > 0 && product.batches && product.batches.length > 0) {
          const remainingCost = product.batches.reduce((sum, b) => sum + b.quantity * b.buyPrice, 0);
          product.buyPrice = Number((remainingCost / totalStockRemaining).toFixed(2));
        }
      } else {
        errors.push(`\u0627\u0644\u0639\u0646\u0635\u0631 [${product.nameAr}] \u0644\u064A\u0633 \u0644\u062F\u064A\u0647 \u0643\u0645\u064A\u0629 \u0643\u0627\u0641\u064A\u0629 \u0639\u0644\u0649 \u0627\u0644\u0631\u0641\u0648\u0641. \u0627\u0644\u0645\u062A\u0627\u062D: ${product.shelfStock}`);
      }
    } else {
      errors.push(`\u0627\u0644\u0635\u0646\u0641 \u0630\u0648 \u0627\u0644\u0645\u0639\u0631\u0641 ${sale.productId} \u063A\u064A\u0631 \u0645\u062A\u0648\u0641\u0631.`);
    }
  }
  if (errors.length > 0 && updatedIds.length === 0) {
    return res.status(400).json({ success: false, errors });
  }
  if (customerId) {
    const customers = readCustomers();
    const customer = customers.find((c) => c.id === customerId);
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
  res.json({ success: true, products: dbData, errors: errors.length > 0 ? errors : void 0 });
});
app.get("/api/customers", (req, res) => {
  res.json(readCustomers());
});
app.post("/api/customers", (req, res) => {
  const incoming = req.body;
  const customers = readCustomers();
  if (incoming.id) {
    const idx = customers.findIndex((c) => c.id === incoming.id);
    if (idx !== -1) {
      customers[idx] = { ...customers[idx], ...incoming };
      writeCustomers(customers);
      return res.json({ success: true, customers, customer: customers[idx] });
    }
  }
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
app.post("/api/customers/points", (req, res) => {
  const { id, action, amount, reason } = req.body;
  const customers = readCustomers();
  const idx = customers.findIndex((c) => c.id === id);
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
        date: (/* @__PURE__ */ new Date()).toISOString().split("T")[0],
        action,
        amount: amountNum,
        reason,
        newPoints: cust.points
      });
    }
    writeCustomers(customers);
    pushSystemAuditLog(
      "system",
      `\u062A\u0645 \u062A\u0639\u062F\u064A\u0644 \u0646\u0642\u0627\u0637 \u0627\u0644\u0639\u0645\u064A\u0644 [${cust.name || cust.nameAr}] \u0628\u0645\u0642\u062F\u0627\u0631 (${action === "add" ? "+" : "-"}${amountNum}) \u0644\u0623\u062C\u0644: ${reason || "\u062A\u0639\u062F\u064A\u0644 \u064A\u062F\u0648\u064A"}`,
      `Updated points for customer [${cust.name || cust.nameAr}] by (${action === "add" ? "+" : "-"}${amountNum}) for: ${reason || "Manual update"}`,
      req
    );
    res.json({ success: true, customers, customer: cust });
  } else {
    res.status(404).json({ success: false, message: "Customer not found" });
  }
});
app.post("/api/customers/bulk", (req, res) => {
  const { customers: bulkList } = req.body;
  if (!bulkList || !Array.isArray(bulkList)) {
    return res.status(400).json({ success: false, message: "Invalid bulk list payload" });
  }
  const customers = readCustomers();
  const added = [];
  const updated = [];
  bulkList.forEach((incoming) => {
    const phoneClean = String(incoming.phone || "").trim();
    if (!phoneClean) return;
    const existingIdx = customers.findIndex((c) => String(c.phone || "").trim() === phoneClean);
    if (existingIdx !== -1) {
      const ext = customers[existingIdx];
      ext.name = incoming.name || ext.name || ext.nameAr || "";
      ext.nameAr = incoming.nameAr || incoming.name || ext.nameAr || "";
      ext.governorate = incoming.governorate || ext.governorate || "\u0627\u0644\u0642\u0627\u0647\u0631\u0629";
      if (incoming.points !== void 0 && incoming.points !== null) {
        ext.points = (ext.points || 0) + Number(incoming.points);
      }
      if (incoming.classification) {
        ext.classification = incoming.classification;
      }
      updated.push(ext);
    } else {
      const newCust = {
        id: "c-" + Date.now() + "-" + Math.floor(Math.random() * 1e3),
        name: incoming.name || incoming.nameAr || "",
        nameAr: incoming.nameAr || incoming.name || "",
        phone: phoneClean,
        governorate: incoming.governorate || "\u0627\u0644\u0642\u0627\u0647\u0631\u0629",
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
    `\u062A\u0645 \u0627\u0633\u062A\u064A\u0631\u0627\u062F \u0639\u0645\u0644\u0627\u0621 \u0645\u062C\u0645\u0639\u064A\u0646 \u0639\u0646 \u0637\u0631\u064A\u0642 \u0645\u0644\u0641 \u0625\u0643\u0633\u064A\u0644/CSV: \u0625\u0636\u0627\u0641\u0629 (${added.length}) \u0639\u0645\u0644\u0627\u0621 \u062C\u062F\u062F \u0648\u062A\u062D\u062F\u064A\u062B (${updated.length}) \u0639\u0645\u0644\u0627\u0621 \u0645\u0648\u062C\u0648\u062F\u064A\u0646.`,
    `Imported bulk customers from Excel/CSV: added (${added.length}) new clients and updated (${updated.length}) existing clients.`,
    req
  );
  res.json({ success: true, customers, addedCount: added.length, updatedCount: updated.length });
});
app.get("/api/suppliers", (req, res) => {
  res.json(readSuppliers());
});
app.post("/api/suppliers", (req, res) => {
  const incoming = req.body;
  const suppliers = readSuppliers();
  if (incoming.id) {
    const idx = suppliers.findIndex((s) => s.id === incoming.id);
    if (idx !== -1) {
      suppliers[idx] = { ...suppliers[idx], ...incoming };
    }
  } else {
    const newSup = {
      id: "sup-" + Date.now(),
      nameAr: incoming.nameAr || "\u0645\u0648\u0631\u062F \u062C\u062F\u064A\u062F",
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
app.get("/api/suppliers/payments", (req, res) => {
  res.json(readSupplierPayments());
});
app.post("/api/suppliers/payments", (req, res) => {
  const incoming = req.body;
  const payments = readSupplierPayments();
  const newPayment = {
    id: "pay-" + Date.now(),
    supplierName: incoming.supplierName,
    amount: Number(incoming.amount || 0),
    date: incoming.date || (/* @__PURE__ */ new Date()).toISOString().split("T")[0],
    notes: incoming.notes || "\u062F\u0641\u0639\u0629 \u0646\u0642\u062F\u064A\u0629"
  };
  payments.push(newPayment);
  writeSupplierPayments(payments);
  pushSystemAuditLog(
    "system",
    `\u062A\u0645 \u062A\u0633\u062C\u064A\u0644 \u062F\u0641\u0639\u0629 \u0646\u0642\u062F\u064A\u0629 \u0628\u0642\u064A\u0645\u0629 [${newPayment.amount} \u062C.\u0645] \u0644\u0635\u0627\u0644\u062D \u0627\u0644\u0645\u0648\u0631\u062F (${newPayment.supplierName})`,
    `Recorded cash payment of [${newPayment.amount} EGP] to supplier (${newPayment.supplierName})`,
    req
  );
  res.json({ success: true, payments });
});
app.get("/api/invoices", (req, res) => {
  res.json(readInvoices());
});
app.post("/api/invoices", (req, res) => {
  const incoming = req.body;
  const invoices = readInvoices();
  const dbData = readDatabase();
  const isPosted = incoming.isPosted !== false;
  const invoiceType = incoming.invoiceType || "purchase";
  const newInvoice = {
    id: "inv-" + Date.now(),
    invoiceNumber: incoming.invoiceNumber || (invoiceType === "return" ? "RET-" : "INV-") + Math.floor(1e3 + Math.random() * 9e3),
    supplierName: incoming.supplierName || "\u0645\u0648\u0631\u062F \u0639\u0627\u0645",
    supplierPhone: incoming.supplierPhone || "\u063A\u064A\u0631 \u0645\u062A\u0648\u0641\u0631",
    date: incoming.date || (/* @__PURE__ */ new Date()).toISOString().split("T")[0],
    items: incoming.items || [],
    totalAmount: Number(incoming.totalAmount || 0),
    isPosted,
    invoiceType
  };
  if (isPosted) {
    newInvoice.items.forEach((item) => {
      let product = dbData.find((p) => p.id === item.productId || p.barcode === item.barcode);
      const itemQty = Number(item.quantity || 0);
      if (invoiceType === "purchase") {
        if (product) {
          product.warehouseStock = (product.warehouseStock || 0) + itemQty;
          product.buyPrice = Number(item.buyPrice || product.buyPrice);
          product.sellPrice = Number(item.sellPrice || product.sellPrice);
          product.lastUpdated = newInvoice.date;
          if (!product.batches) product.batches = [];
          product.batches.push({
            id: `batch-inv-item-${newInvoice.id}-${Date.now()}-${Math.floor(Math.random() * 100)}`,
            buyPrice: Number(item.buyPrice),
            sellPrice: Number(item.sellPrice),
            quantity: itemQty,
            initialQuantity: itemQty,
            expiryDate: item.expiryDate || product.expirationDate,
            dateAdded: newInvoice.date
          });
          const totalStock = product.shelfStock + product.warehouseStock;
          if (totalStock > 0) {
            const totalCost = product.batches.reduce((sum, b) => sum + b.quantity * b.buyPrice, 0);
            product.buyPrice = Number((totalCost / totalStock).toFixed(2));
          }
        } else {
          const newProductId = "p-inv-new-" + Date.now() + "-" + Math.floor(Math.random() * 100);
          const newProd = {
            id: newProductId,
            nameAr: item.productNameAr,
            nameEn: item.productNameEn || item.productNameAr,
            barcode: item.barcode || "BAR-" + Date.now(),
            category: item.category || "groceries",
            shelfStock: 0,
            warehouseStock: itemQty,
            minStockAlert: 20,
            buyPrice: Number(item.buyPrice),
            sellPrice: Number(item.sellPrice),
            expirationDate: item.expiryDate || new Date(Date.now() + 365 * 24 * 3600 * 1e3).toISOString().split("T")[0],
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
                expiryDate: item.expiryDate || new Date(Date.now() + 365 * 24 * 3600 * 1e3).toISOString().split("T")[0],
                dateAdded: newInvoice.date
              }
            ]
          };
          dbData.push(newProd);
          item.productId = newProductId;
        }
      } else if (invoiceType === "return") {
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
          product.lastUpdated = newInvoice.date;
        }
      }
    });
    writeDatabase(dbData);
  }
  invoices.push(newInvoice);
  writeInvoices(invoices);
  const logAr = invoiceType === "purchase" ? `\u062A\u0645 \u062A\u0633\u062C\u064A\u0644 \u0641\u0627\u062A\u0648\u0631\u0629 \u062A\u0648\u0631\u064A\u062F \u0645\u0634\u062A\u0631\u064A\u0627\u062A [${newInvoice.invoiceNumber}] \u0645\u0646 (${newInvoice.supplierName}) [\u0627\u0644\u062D\u0627\u0644\u0629: ${isPosted ? "\u0645\u0631\u062D\u0644\u0629 \u0645\u062E\u0632\u0646\u064A\u0627\u064B" : "\u0645\u0639\u0644\u0642\u0629 / \u0645\u0633\u0648\u062F\u0629"}]` : `\u062A\u0645 \u062A\u0633\u062C\u064A\u0644 \u0641\u0627\u062A\u0648\u0631\u0629 \u0645\u0631\u062A\u062C\u0639\u0627\u062A \u0628\u0636\u0627\u0639\u0629 [${newInvoice.invoiceNumber}] \u0644\u0644\u0645\u0648\u0631\u062F (${newInvoice.supplierName}) \u0648\u0625\u062C\u0631\u0627\u0621 \u0627\u0644\u062A\u0633\u0648\u064A\u0629 \u0627\u0644\u0645\u062E\u0632\u0646\u064A\u0629`;
  const logEn = invoiceType === "purchase" ? `Recorded purchase invoice [${newInvoice.invoiceNumber}] from (${newInvoice.supplierName}) [Status: ${isPosted ? "Posted" : "Draft/Pending"}]` : `Recorded merchandise return invoice [${newInvoice.invoiceNumber}] to supplier (${newInvoice.supplierName})`;
  pushSystemAuditLog("system", logAr, logEn, req);
  res.json({ success: true, invoices, products: dbData, invoice: newInvoice });
});
app.post("/api/invoices/:id/post", (req, res) => {
  const { id } = req.params;
  const invoices = readInvoices();
  const dbData = readDatabase();
  const invoice = invoices.find((inv) => inv.id === id);
  if (!invoice) {
    return res.status(404).json({ success: false, message: "Invoice not found" });
  }
  if (invoice.isPosted) {
    return res.status(400).json({ success: false, message: "Invoice is already posted" });
  }
  invoice.isPosted = true;
  invoice.items.forEach((item) => {
    let product = dbData.find((p) => p.id === item.productId || p.barcode === item.barcode);
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
      if (product) {
        product.warehouseStock = (product.warehouseStock || 0) + itemQty;
        product.buyPrice = Number(item.buyPrice || product.buyPrice);
        product.sellPrice = Number(item.sellPrice || product.sellPrice);
        product.lastUpdated = invoice.date;
        if (!product.batches) product.batches = [];
        product.batches.push({
          id: `batch-inv-item-${invoice.id}-${Date.now()}-${Math.floor(Math.random() * 100)}`,
          buyPrice: Number(item.buyPrice),
          sellPrice: Number(item.sellPrice),
          quantity: itemQty,
          initialQuantity: itemQty,
          expiryDate: item.expiryDate || product.expirationDate,
          dateAdded: invoice.date
        });
        const totalStock = product.shelfStock + product.warehouseStock;
        if (totalStock > 0) {
          const totalCost = product.batches.reduce((sum, b) => sum + b.quantity * b.buyPrice, 0);
          product.buyPrice = Number((totalCost / totalStock).toFixed(2));
        }
      } else {
        const newProductId = "p-inv-new-" + Date.now();
        const newProd = {
          id: newProductId,
          nameAr: item.productNameAr,
          nameEn: item.productNameEn || item.productNameAr,
          barcode: item.barcode || "BAR-" + Date.now(),
          category: item.category || "groceries",
          shelfStock: 0,
          warehouseStock: itemQty,
          minStockAlert: 20,
          buyPrice: Number(item.buyPrice),
          sellPrice: Number(item.sellPrice),
          expirationDate: item.expiryDate || new Date(Date.now() + 365 * 24 * 3600 * 1e3).toISOString().split("T")[0],
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
              expiryDate: item.expiryDate || new Date(Date.now() + 365 * 24 * 3600 * 1e3).toISOString().split("T")[0],
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
    `\u062A\u0645 \u062A\u0631\u062D\u064A\u0644 \u0627\u0644\u0641\u0627\u062A\u0648\u0631\u0629 \u0627\u0644\u0645\u0639\u0644\u0642\u0629 \u0631\u0642\u0645 [${invoice.invoiceNumber}] \u0628\u0646\u062C\u0627\u062D \u0648\u062A\u062D\u062F\u064A\u062B \u0645\u0633\u062A\u0648\u064A\u0627\u062A \u0627\u0644\u0645\u062E\u0632\u0648\u0646 \u0648\u062D\u0633\u0627\u0628 \u0645\u062A\u0648\u0633\u0637 \u0627\u0644\u062A\u0643\u0644\u0641\u0629`,
    `Successfully posted pending invoice [${invoice.invoiceNumber}] updating live stocks & cost averages`,
    req
  );
  res.json({ success: true, invoices, products: dbData, invoice });
});
app.delete("/api/invoices/:id", (req, res) => {
  const { id } = req.params;
  let invoices = readInvoices();
  const invoice = invoices.find((inv) => inv.id === id);
  if (!invoice) {
    return res.status(404).json({ success: false, message: "Invoice not found" });
  }
  if (invoice.isPosted) {
    return res.status(400).json({ success: false, message: "Cannot delete a posted invoice" });
  }
  invoices = invoices.filter((inv) => inv.id !== id);
  writeInvoices(invoices);
  pushSystemAuditLog(
    "system",
    `\u062A\u0645 \u062D\u0630\u0641 \u0645\u0633\u0648\u062F\u0629 \u0627\u0644\u0641\u0627\u062A\u0648\u0631\u0629 \u0627\u0644\u0645\u0639\u0644\u0642\u0629 \u0631\u0642\u0645 [${invoice.invoiceNumber}] \u0644\u0645\u0648\u0631\u062F (${invoice.supplierName}) \u0628\u0646\u062C\u0627\u062D`,
    `Successfully deleted pending draft invoice [${invoice.invoiceNumber}] of supplier (${invoice.supplierName})`,
    req
  );
  res.json({ success: true, invoices });
});
app.get("/api/transfers", (req, res) => {
  res.json(readTransfers());
});
app.post("/api/transfers", (req, res) => {
  const incoming = req.body;
  const transfers = readTransfers();
  const newTransfer = {
    id: "tr-" + Date.now(),
    orderNumber: "TR-" + (/* @__PURE__ */ new Date()).getFullYear() + "-" + Math.floor(1e4 + Math.random() * 9e4),
    date: incoming.date || (/* @__PURE__ */ new Date()).toISOString().split("T")[0],
    items: incoming.items || [],
    status: "pending",
    approvedBy: void 0,
    lastUpdated: (/* @__PURE__ */ new Date()).toISOString().split("T")[0]
  };
  transfers.unshift(newTransfer);
  writeTransfers(transfers);
  res.json({ success: true, transfers, transfer: newTransfer });
});
app.post("/api/transfers/:id/status", (req, res) => {
  const { id } = req.params;
  const { status, approvedBy, simulatedToday } = req.body;
  const transfers = readTransfers();
  const dbData = readDatabase();
  const transfer = transfers.find((t) => t.id === id);
  if (!transfer) {
    return res.status(404).json({ success: false, message: "Transfer order not found" });
  }
  if (transfer.status !== "pending") {
    return res.status(400).json({ success: false, message: "\u0647\u0630\u0627 \u0627\u0644\u0637\u0644\u0628 \u062A\u0645 \u0627\u0644\u0628\u062A \u0641\u064A\u0647 \u0645\u0633\u0628\u0642\u0627\u064B" });
  }
  transfer.status = status;
  transfer.approvedBy = approvedBy || "admin";
  transfer.lastUpdated = simulatedToday || (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
  let auditAr = "";
  let auditEn = "";
  if (status === "approved") {
    const errors = [];
    transfer.items.forEach((item) => {
      const p = dbData.find((prod) => prod.id === item.productId);
      if (p) {
        if (p.warehouseStock >= item.quantity) {
          p.warehouseStock -= item.quantity;
          p.shelfStock += item.quantity;
        } else {
          const avail = p.warehouseStock;
          p.warehouseStock = 0;
          p.shelfStock += avail;
          errors.push(`\u0627\u0644\u0635\u0646\u0641 [${p.nameAr}] \u0644\u062F\u064A\u0647 ${avail} \u0641\u0642\u0637 \u0641\u064A \u0627\u0644\u0645\u062E\u0632\u0646\u060C \u062A\u0645 \u062A\u062D\u0648\u064A\u0644\u0647\u0645 \u0644\u0644\u0631\u0641.`);
        }
      }
    });
    writeDatabase(dbData);
    auditAr = `\u062A\u0645 \u0627\u0639\u062A\u0645\u0627\u062F \u0625\u0630\u0646 \u0627\u0644\u062A\u062D\u0648\u064A\u0644 \u0631\u0642\u0645 [${transfer.orderNumber}] \u0648\u0646\u0642\u0644 \u0627\u0644\u0645\u0646\u062A\u062C\u0627\u062A \u0645\u0646 \u0627\u0644\u0645\u062E\u0632\u0646 \u0628\u0627\u0644\u0643\u0627\u0645\u0644 \u0625\u0644\u0649 \u0627\u0644\u0631\u0641\u0648\u0641 \u0628\u0627\u0644\u0645\u0648\u0644`;
    auditEn = `Approved transfer authorization [${transfer.orderNumber}], moving items from internal warehouse store to ready mall shelves`;
  } else {
    auditAr = `\u062A\u0645 \u0631\u0641\u0636 \u0625\u0630\u0646 \u0627\u0644\u062A\u062D\u0648\u064A\u0644 \u0631\u0642\u0645 [${transfer.orderNumber}] \u0648\u0625\u0644\u063A\u0627\u0621 \u0627\u0644\u0637\u0644\u0628`;
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
app.post("/api/products/return", (req, res) => {
  const { productId, quantity, customerId, pointsFrictionalValue, simulatedToday } = req.body;
  if (!productId || !quantity) {
    return res.status(400).json({ success: false, message: "Missing return coordinates" });
  }
  const dbData = readDatabase();
  const product = dbData.find((p) => p.id === productId);
  if (!product) {
    return res.status(404).json({ success: false, message: "Product not found" });
  }
  const qty = Number(quantity);
  product.shelfStock = (product.shelfStock || 0) + qty;
  if (product.unitsSold !== void 0) {
    product.unitsSold = Math.max(0, product.unitsSold - qty);
  }
  if (customerId && pointsFrictionalValue > 0) {
    const customers = readCustomers();
    const customer = customers.find((c) => c.id === customerId);
    if (customer) {
      customer.points = Math.max(0, (customer.points || 0) - pointsFrictionalValue);
      writeCustomers(customers);
    }
  }
  const txList = readTransactions();
  txList.push({
    id: `t-return-${product.id}-${Date.now()}-${Math.floor(Math.random() * 1e3)}`,
    type: "sale",
    // logged as sale with negative quantity or custom sale so financial calculations reverse it!
    date: simulatedToday || (/* @__PURE__ */ new Date()).toISOString().split("T")[0],
    productId: product.id,
    nameAr: product.nameAr,
    nameEn: product.nameEn,
    quantity: -qty,
    // Negative quantity reverses sales totals & profit calculations perfectly!
    buyPrice: product.buyPrice,
    sellPrice: product.sellPrice,
    category: product.category,
    timestamp: (/* @__PURE__ */ new Date()).toISOString().replace("T", " ").substring(0, 19)
  });
  writeTransactions(txList);
  writeDatabase(dbData);
  pushSystemAuditLog(
    "system",
    `\u062A\u0645 \u062A\u0633\u062C\u064A\u0644 \u0635\u0646\u0641 \u0645\u0631\u062A\u062C\u0639 \u0645\u0646 \u0639\u0645\u064A\u0644: [${product.nameAr}] \u0628\u0639\u062F\u062F (${qty} \u0642\u0637\u0639\u0629) \u0648\u062A\u0645 \u0627\u0633\u062A\u0631\u062C\u0627\u0639 \u0627\u0644\u0643\u0645\u064A\u0629 \u0644\u0631\u0641\u0648\u0641 \u0627\u0644\u0645\u0648\u0644`,
    `Registered product return: [${product.nameEn}] quantity (${qty} units) returned to floor shelves stock`,
    req
  );
  res.json({ success: true, products: dbData });
});
app.post("/api/products/reset", (req, res) => {
  writeDatabase(INITIAL_PRODUCTS_SEED);
  const seeded = seedTransactions();
  writeTransactions(seeded);
  res.json({ success: true, products: INITIAL_PRODUCTS_SEED, transactions: seeded });
});
app.post("/api/products/quick-action", (req, res) => {
  const { action, productId, payload } = req.body;
  const dbData = readDatabase();
  const product = dbData.find((p) => p.id === productId);
  if (!product) {
    return res.status(404).json({ success: false, message: "Product not found" });
  }
  if (action === "discount") {
    const percentage = payload.percentage || 20;
    product.isDiscounted = true;
    product.discountPercentage = percentage;
    product.sellPrice = Number((product.sellPrice * (1 - percentage / 100)).toFixed(2));
    product.lastUpdated = payload.today || "2026-06-15";
  } else if (action === "restock") {
    const qty = payload.quantity || 0;
    const toMove = Math.min(qty, product.warehouseStock);
    product.shelfStock += toMove;
    product.warehouseStock -= toMove;
    product.lastUpdated = payload.today || "2026-06-15";
  } else if (action === "dispose") {
    const discardedQty = product.shelfStock + product.warehouseStock;
    product.unitsLost = (product.unitsLost || 0) + discardedQty;
    product.shelfStock = 0;
    product.warehouseStock = 0;
    product.lastUpdated = payload.today || "2026-06-15";
    if (discardedQty > 0) {
      const txList = readTransactions();
      txList.push({
        id: `t-loss-${product.id}-${Date.now()}-${Math.floor(Math.random() * 1e3)}`,
        type: "loss",
        date: payload.simulatedToday || payload.today || (/* @__PURE__ */ new Date()).toISOString().split("T")[0],
        productId: product.id,
        nameAr: product.nameAr,
        nameEn: product.nameEn,
        quantity: discardedQty,
        buyPrice: product.buyPrice,
        sellPrice: product.sellPrice,
        category: product.category,
        timestamp: (/* @__PURE__ */ new Date()).toISOString().replace("T", " ").substring(0, 19)
      });
      writeTransactions(txList);
    }
  } else if (action === "supplier_restock") {
    const qty = payload.quantity || 0;
    product.warehouseStock += qty;
    product.lastUpdated = payload.today || "2026-06-15";
  }
  writeDatabase(dbData);
  res.json({ success: true, products: dbData, product });
});
var STAFF_FILE = import_path.default.join(process.cwd(), "staff_db.json");
var LOGS_FILE = import_path.default.join(process.cwd(), "logs_db.json");
var INITIAL_STAFF_SEED = [
  {
    username: "admin",
    nameAr: "\u0623. \u0623\u0628\u0648 \u0628\u0643\u0631 \u0632\u0647\u0631\u0627\u0646",
    nameEn: "Mr. Abu Bakr",
    role: "admin",
    password: "123",
    status: "offline",
    lastLogin: "-"
  },
  {
    username: "warehouse",
    nameAr: "\u0645. \u0623\u062D\u0645\u062F \u0639\u0628\u062F \u0627\u0644\u0639\u0627\u0644",
    nameEn: "Eng. Ahmad",
    role: "warehouse",
    password: "456",
    status: "offline",
    lastLogin: "-"
  },
  {
    username: "cashier",
    nameAr: "\u0633\u0627\u0631\u0629 \u0627\u0644\u062C\u064A\u0627\u062F",
    nameEn: "Sarah Al-Jiad",
    role: "cashier",
    password: "789",
    status: "offline",
    lastLogin: "-"
  }
];
var INITIAL_LOGS_SEED = [
  {
    id: "log-1",
    timestamp: "2026-06-15 10:00:00",
    username: "system",
    name: "\u0645\u0631\u0627\u0642\u0628\u0629 \u0627\u0644\u0627\u062A\u0635\u0627\u0644",
    role: "admin",
    actionAr: "\u062A\u0645 \u062A\u0641\u0639\u064A\u0644 \u062D\u0632\u0645\u0629 \u0627\u0644\u0623\u0645\u0627\u0646 \u0648\u0627\u0644\u062D\u0645\u0627\u064A\u0629 \u0627\u0644\u062D\u064A\u0629 \u0644\u0634\u0628\u0643\u0629 \u062C\u0631\u062F \u0627\u0644\u0645\u0648\u0644 \u0628\u0646\u062C\u0627\u062D",
    actionEn: "Security and Audit cluster launched for the shopping mall mesh network",
    ip: "10.0.0.1"
  }
];
function readStaff() {
  if (!import_fs.default.existsSync(STAFF_FILE)) {
    import_fs.default.writeFileSync(STAFF_FILE, JSON.stringify(INITIAL_STAFF_SEED, null, 2), "utf8");
    return INITIAL_STAFF_SEED;
  }
  try {
    const data = import_fs.default.readFileSync(STAFF_FILE, "utf8");
    return JSON.parse(data);
  } catch (err) {
    return INITIAL_STAFF_SEED;
  }
}
function writeStaff(data) {
  try {
    import_fs.default.writeFileSync(STAFF_FILE, JSON.stringify(data, null, 2), "utf8");
  } catch (err) {
  }
}
function readLogs() {
  if (!import_fs.default.existsSync(LOGS_FILE)) {
    import_fs.default.writeFileSync(LOGS_FILE, JSON.stringify(INITIAL_LOGS_SEED, null, 2), "utf8");
    return INITIAL_LOGS_SEED;
  }
  try {
    const data = import_fs.default.readFileSync(LOGS_FILE, "utf8");
    return JSON.parse(data);
  } catch (err) {
    return INITIAL_LOGS_SEED;
  }
}
function writeLogs(data) {
  try {
    import_fs.default.writeFileSync(LOGS_FILE, JSON.stringify(data.slice(-200), null, 2), "utf8");
  } catch (err) {
  }
}
function pushSystemAuditLog(username, actionAr, actionEn, req) {
  const staffList = readStaff();
  const logs = readLogs();
  const employee = staffList.find((s) => s.username === username);
  const ip = req ? req.headers["x-forwarded-for"] || req.socket.remoteAddress || "127.0.0.1" : "127.0.0.1";
  const now = /* @__PURE__ */ new Date();
  const formattedTime = now.toISOString().replace("T", " ").substring(0, 19);
  const newLog = {
    id: "log-" + Date.now() + "-" + Math.floor(Math.random() * 1e3),
    timestamp: formattedTime,
    username,
    name: employee ? employee.nameAr : username === "system" ? "\u0645\u062F\u064A\u0631 \u0627\u0644\u0646\u0638\u0627\u0645" : username,
    role: employee ? employee.role : "guest",
    actionAr,
    actionEn,
    ip: String(ip).replace("::ffff:", "")
  };
  logs.unshift(newLog);
  writeLogs(logs);
}
app.get("/api/auth/staff", (req, res) => {
  const staff = readStaff();
  const safeStaff = staff.map(({ password, ...rest }) => rest);
  res.json(safeStaff);
});
app.post("/api/auth/login", (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ success: false, message: "Missing username or password" });
  }
  const staff = readStaff();
  const employee = staff.find((s) => s.username.toLowerCase() === username.toLowerCase());
  if (!employee) {
    return res.status(401).json({
      success: false,
      messageAr: "\u0627\u0633\u0645 \u0627\u0644\u0645\u0633\u062A\u062E\u062F\u0645 \u063A\u064A\u0631 \u0645\u0633\u062C\u0644 \u0641\u064A \u0642\u0627\u0639\u062F\u0629 \u0628\u064A\u0627\u0646\u0627\u062A \u0627\u0644\u0637\u0627\u0642\u0645",
      messageEn: "Username not recognized in system registry"
    });
  }
  if (employee.password !== password) {
    return res.status(401).json({
      success: false,
      messageAr: "\u0627\u0644\u0639\u062A\u0628\u0629 \u0627\u0644\u0633\u0631\u064A\u0629 \u062E\u0627\u0637\u0626\u0629! \u064A\u0631\u062C\u0649 \u0627\u0644\u062A\u0623\u0643\u062F \u0645\u0646 \u0627\u0644\u0631\u0642\u0645 \u0627\u0644\u0633\u0631\u064A \u0644\u0644\u0648\u0631\u062F\u064A\u0629.",
      messageEn: "Incorrect credential password. Access denied."
    });
  }
  employee.status = "online";
  const now = /* @__PURE__ */ new Date();
  employee.lastLogin = now.toISOString().replace("T", " ").substring(0, 16);
  writeStaff(staff);
  pushSystemAuditLog(
    employee.username,
    `\u0642\u0627\u0645 \u0628\u062A\u0633\u062C\u064A\u0644 \u0627\u0644\u062F\u062E\u0648\u0644 \u0627\u0644\u0641\u0648\u0631\u064A \u0644\u0644\u0648\u0631\u062F\u064A\u0629 \u0648\u0628\u062F\u0623 \u0627\u0644\u0639\u0645\u0644 \u0628\u0646\u0634\u0627\u0637`,
    `Logged into system and acquired shifts workspace`,
    req
  );
  const { password: _, ...safeEmployee } = employee;
  res.json({ success: true, user: safeEmployee });
});
app.post("/api/auth/logout", (req, res) => {
  const { username } = req.body;
  const staff = readStaff();
  const employee = staff.find((s) => s.username === username);
  if (employee) {
    employee.status = "offline";
    writeStaff(staff);
    pushSystemAuditLog(
      username,
      `\u0623\u0646\u0647\u0649 \u062C\u0644\u0633\u062A\u0647 \u0648\u0633\u062C\u0644 \u0627\u0644\u062E\u0631\u0648\u062C \u0628\u0623\u0645\u0627\u0646 \u0645\u0646 \u0628\u0648\u0627\u0628\u0629 \u0627\u0644\u0623\u0645\u0627\u0646 \u0644\u0644\u0648\u0631\u062F\u064A\u0629`,
      `Logged out safely from authorized workspace`,
      req
    );
  }
  res.json({ success: true });
});
app.post("/api/auth/staff/role", (req, res) => {
  const { adminUsername, targetUsername, newRole } = req.body;
  const staff = readStaff();
  const adminUser = staff.find((s) => s.username === adminUsername);
  if (!adminUser || adminUser.role !== "admin") {
    return res.status(403).json({
      success: false,
      messageAr: "\u0627\u062E\u062A\u0631\u0627\u0642 \u0628\u0627\u0644\u0635\u0644\u0627\u062D\u064A\u0629: \u064A\u062C\u0628 \u0623\u0646 \u062A\u0643\u0648\u0646 \u0645\u062F\u064A\u0631\u0627\u064B \u0645\u0623\u0630\u0648\u0646\u0627\u064B \u0644\u062A\u0639\u062F\u064A\u0644 \u0627\u0645\u062A\u064A\u0627\u0632\u0627\u062A \u0627\u0644\u0637\u0627\u0642\u0645!",
      messageEn: "Privilege Escalation Blocked: Role modifications restricted to Administrators only."
    });
  }
  const targetUser = staff.find((s) => s.username === targetUsername);
  if (!targetUser) {
    return res.status(404).json({ success: false, messageAr: "\u0627\u0644\u0645\u0648\u0638\u0641 \u0627\u0644\u0645\u0633\u062A\u0647\u062F\u0641 \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F", messageEn: "Target employee not found" });
  }
  const oldRole = targetUser.role;
  targetUser.role = newRole;
  writeStaff(staff);
  pushSystemAuditLog(
    adminUsername,
    `\u0642\u0627\u0645 \u0628\u062A\u0639\u062F\u064A\u0644 \u0648\u062A\u0641\u0648\u064A\u0636 \u0635\u0644\u0627\u062D\u064A\u0629 \u0627\u0644\u0645\u0648\u0638\u0641 (${targetUser.nameAr}) \u0645\u0646 [${oldRole}] \u0625\u0644\u0649 \u0631\u062A\u0628\u0629 \u062C\u062F\u064A\u062F\u0629: [${newRole}]`,
    `Delegated and modified employee (${targetUser.username}) privileges from [${oldRole}] to [${newRole}]`,
    req
  );
  const safeStaff = staff.map(({ password, ...rest }) => rest);
  res.json({ success: true, staff: safeStaff });
});
app.post("/api/auth/staff/add", (req, res) => {
  const { adminUsername, username, nameAr, nameEn, role, password, shiftTime, registerId } = req.body;
  if (!username || !password || !nameAr || !nameEn || !role) {
    return res.status(400).json({ success: false, messageAr: "\u0628\u064A\u0627\u0646\u0627\u062A \u0646\u0627\u0642\u0635\u0629! \u064A\u0631\u062C\u0649 \u0645\u0644\u0621 \u0643\u0627\u0641\u0629 \u0627\u0644\u062A\u0641\u0627\u0635\u064A\u0644 \u0627\u0644\u0645\u0637\u0644\u0648\u0628\u0629.", messageEn: "Missing required fields for new crew member" });
  }
  const staff = readStaff();
  const adminUser = staff.find((s) => s.username === adminUsername);
  if (!adminUser || adminUser.role !== "admin") {
    return res.status(403).json({
      success: false,
      messageAr: "\u0645\u0645\u0646\u0648\u0639: \u0635\u0644\u0627\u062D\u064A\u0629 \u0625\u0636\u0627\u0641\u0629 \u0627\u0644\u0645\u0648\u0638\u0641\u064A\u0646 \u0648\u0635\u064A\u0627\u063A\u0629 \u0647\u0648\u064A\u0627\u062A\u0647\u0645 \u0645\u0642\u0635\u0648\u0631\u0629 \u0639\u0644\u0649 \u0627\u0644\u0645\u062F\u064A\u0631 \u0627\u0644\u0639\u0627\u0645 \u0641\u0642\u0637!",
      messageEn: "Permission Denied: Crew generation is restricted to the General Manager."
    });
  }
  const exists = staff.some((s) => s.username.toLowerCase() === username.toLowerCase().trim());
  if (exists) {
    return res.status(400).json({
      success: false,
      messageAr: "\u0627\u0633\u0645 \u0627\u0644\u0645\u0633\u062A\u062E\u062F\u0645 \u0647\u0630\u0627 \u0645\u0633\u062C\u0644 \u0645\u0633\u0628\u0642\u0627\u064B! \u064A\u0631\u062C\u0649 \u0627\u062E\u062A\u064A\u0627\u0631 \u0627\u0633\u0645 \u0645\u0633\u062A\u062E\u062F\u0645 \u0641\u0631\u064A\u062F.",
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
    `\u0642\u0627\u0645 \u0628\u0625\u0646\u0634\u0627\u0621 \u062D\u0633\u0627\u0628 \u0645\u0648\u0638\u0641 \u062A\u0634\u063A\u064A\u0644\u064A \u062C\u062F\u064A\u062F (${nameAr}) \u0628\u0631\u062A\u0628\u0629: [${role}] \u0628\u062C\u062F\u0648\u0644 \u0648\u0631\u062F\u064A\u0629: [${newCrew.shiftTime}]`,
    `Generated newly approved workspace employee (${username}) as [${role}] on Shift: [${newCrew.shiftTime}]`,
    req
  );
  const safeStaff = staff.map(({ password: password2, ...rest }) => rest);
  res.json({ success: true, staff: safeStaff });
});
app.post("/api/auth/staff/delete", (req, res) => {
  const { adminUsername, targetUsername } = req.body;
  const staff = readStaff();
  const adminUser = staff.find((s) => s.username === adminUsername);
  if (!adminUser || adminUser.role !== "admin") {
    return res.status(403).json({
      success: false,
      messageAr: "\u0635\u0644\u0627\u062D\u064A\u0629 \u0645\u0631\u0641\u0648\u0636\u0629: \u0625\u0644\u063A\u0627\u0621 \u062D\u0633\u0627\u0628\u0627\u062A \u0627\u0644\u0645\u0648\u0638\u0641\u064A\u0646 \u0645\u0642\u0635\u0648\u0631 \u0644\u0644\u0645\u062F\u064A\u0631 \u0627\u0644\u0639\u0627\u0645 \u0641\u0642\u0637!",
      messageEn: "Access Denied: Deregistering crew is restricted to Administrators."
    });
  }
  if (targetUsername === adminUsername) {
    return res.status(400).json({
      success: false,
      messageAr: "\u062E\u0637\u0623 \u0623\u0645\u0646\u064A: \u0644\u0627 \u064A\u0645\u0643\u0646\u0643 \u062D\u0630\u0641 \u062D\u0633\u0627\u0628\u0643 \u0627\u0644\u0634\u062E\u0635\u064A \u0627\u0644\u0646\u0634\u0637!",
      messageEn: "Deregistration Error: You cannot delete your currently active Administrator session!"
    });
  }
  const targetIndex = staff.findIndex((s) => s.username === targetUsername);
  if (targetIndex === -1) {
    return res.status(404).json({ success: false, messageAr: "\u0627\u0644\u0645\u0648\u0638\u0641 \u0627\u0644\u0645\u0637\u0644\u0648\u0628 \u063A\u064A\u0631 \u0645\u0633\u062C\u0644 \u0628\u0627\u0644\u062E\u0627\u062F\u0645", messageEn: "Target crew member not found" });
  }
  const deletedEmployee = staff[targetIndex];
  staff.splice(targetIndex, 1);
  writeStaff(staff);
  pushSystemAuditLog(
    adminUsername,
    `\u0642\u0627\u0645 \u0628\u062D\u0630\u0641 \u0648\u0625\u0644\u063A\u0627\u0621 \u0648\u062B\u064A\u0642\u0629 \u0627\u0644\u0645\u0648\u0638\u0641 \u0627\u0644\u0639\u0645\u0644\u064A (${deletedEmployee.nameAr}) \u0648\u0625\u062E\u0631\u0627\u062C\u0647 \u0646\u0647\u0627\u0626\u064A\u0627\u064B \u0645\u0646 \u0627\u0644\u0648\u0631\u062F\u064A\u0629`,
    `Terminated & deleted crew access for employee (${targetUsername}) - All clearances suspended.`,
    req
  );
  const safeStaff = staff.map(({ password, ...rest }) => rest);
  res.json({ success: true, staff: safeStaff });
});
app.get("/api/logs", (req, res) => {
  const logs = readLogs();
  res.json(logs);
});
app.post("/api/logs/custom", (req, res) => {
  const { username, actionAr, actionEn } = req.body;
  if (username) {
    pushSystemAuditLog(username, actionAr, actionEn, req);
  }
  res.json({ success: true });
});
var WAREHOUSES_FILE = import_path.default.join(process.cwd(), "warehouses_db.json");
var INITIAL_WAREHOUSES = [
  { id: "w-1", name: "\u0627\u0644\u0645\u0633\u062A\u0648\u062F\u0639 \u0627\u0644\u0631\u0626\u064A\u0633\u064A \u0627\u0644\u0645\u063A\u0630\u0649", responsible: "\u0623\u062D\u0645\u062F \u0639\u0628\u062F \u0627\u0644\u0639\u0627\u0644", location: "\u0627\u0644\u0645\u0646\u0637\u0642\u0629 \u0627\u0644\u0635\u0646\u0627\u0639\u064A\u0629 - \u0627\u0644\u062C\u064A\u0632\u0629", capacity: "10,000 \u0643\u0631\u062A\u0648\u0646\u0629" },
  { id: "w-2", name: "\u0645\u062E\u0632\u0646 \u0627\u0644\u0633\u0644\u0639 \u0627\u0644\u0645\u0628\u0631\u062F\u0629 \u0648\u0627\u0644\u0623\u0644\u0628\u0627\u0646", responsible: "\u0633\u0627\u0631\u0629 \u0627\u0644\u062C\u064A\u0627\u062F", location: "\u0628\u062F\u0631\u0648\u0645 \u0627\u0644\u0645\u0648\u0644 \u0627\u0644\u0631\u0626\u064A\u0633\u064A", capacity: "3,000 \u0644\u062A\u0631" },
  { id: "w-3", name: "\u0645\u0633\u062A\u0648\u062F\u0639 \u0627\u0644\u0623\u062C\u0647\u0632\u0629 \u0627\u0644\u0645\u0646\u0632\u0644\u064A\u0629 \u0648\u0627\u0644\u0625\u0644\u0643\u062A\u0631\u0648\u0646\u064A\u0627\u062A", responsible: "\u0623\u0628\u0648 \u0628\u0643\u0631 \u0632\u0647\u0631\u0627\u0646", location: "\u0627\u0644\u0637\u0627\u0628\u0642 \u0627\u0644\u0623\u0631\u0636\u064A - \u0635\u0627\u0644\u0629 \u0628", capacity: "500 \u0648\u062D\u062F\u0629" }
];
function readWarehouses() {
  if (!import_fs.default.existsSync(WAREHOUSES_FILE)) {
    import_fs.default.writeFileSync(WAREHOUSES_FILE, JSON.stringify(INITIAL_WAREHOUSES, null, 2), "utf8");
    return INITIAL_WAREHOUSES;
  }
  try {
    return JSON.parse(import_fs.default.readFileSync(WAREHOUSES_FILE, "utf8"));
  } catch (e) {
    return INITIAL_WAREHOUSES;
  }
}
function writeWarehouses(data) {
  try {
    import_fs.default.writeFileSync(WAREHOUSES_FILE, JSON.stringify(data, null, 2), "utf8");
  } catch (e) {
  }
}
app.get("/api/warehouses", (req, res) => {
  res.json(readWarehouses());
});
app.post("/api/warehouses", (req, res) => {
  const incoming = req.body;
  const list = readWarehouses();
  if (incoming.id) {
    const idx = list.findIndex((w) => w.id === incoming.id);
    if (idx !== -1) {
      list[idx] = { ...list[idx], ...incoming };
      writeWarehouses(list);
      return res.json({ success: true, warehouses: list, warehouse: list[idx] });
    }
  }
  const newW = {
    id: "w-" + Date.now(),
    name: incoming.name,
    responsible: incoming.responsible || "\u0623\u062D\u0645\u062F \u0639\u0628\u062F \u0627\u0644\u0639\u0627\u0644",
    location: incoming.location || "\u0635\u0627\u0644\u0629 \u0627\u0644\u0645\u0639\u0631\u0648\u0636\u0627\u062A",
    capacity: incoming.capacity || "\u063A\u064A\u0631 \u0645\u062D\u062F\u062F"
  };
  list.push(newW);
  writeWarehouses(list);
  res.json({ success: true, warehouses: list, warehouse: newW });
});
var FINANCIAL_FILE = import_path.default.join(process.cwd(), "financials_db.json");
var INITIAL_FINANCIALS = {
  accounts: [
    { code: "101", name: "\u062E\u0632\u064A\u0646\u0629 \u0627\u0644\u0643\u0627\u0634\u064A\u0631 \u0648\u0627\u0644\u0635\u0646\u062F\u0648\u0642", type: "debit", balance: 45e3 },
    { code: "102", name: "\u0627\u0644\u062D\u0633\u0627\u0628 \u0627\u0644\u0628\u0646\u0643\u064A \u0627\u0644\u062A\u062C\u0627\u0631\u064A \u0627\u0644\u062F\u0648\u0644\u064A", type: "debit", balance: 25e4 },
    { code: "103", name: "\u0627\u0644\u0623\u0635\u0648\u0644 \u0627\u0644\u062B\u0627\u0628\u062A\u0629 (\u0631\u0641\u0648\u0641\u060C \u062B\u0644\u0627\u062C\u0627\u062A\u060C \u0639\u0642\u0627\u0631\u0627\u062A)", type: "debit", balance: 18e4 },
    { code: "104", name: "\u0628\u0636\u0627\u0639\u0629 \u0627\u0644\u0645\u062E\u0632\u0646 \u0648\u0623\u0631\u0635\u062F\u0629 \u0627\u0644\u0633\u0644\u0639", type: "debit", balance: 95e3 },
    { code: "105", name: "\u0630\u0645\u0645 \u062D\u0633\u0627\u0628\u0627\u062A \u0627\u0644\u0639\u0645\u0644\u0627\u0621 \u0648\u0627\u0644\u0628\u064A\u0639 \u0628\u0627\u0644\u0622\u062C\u0644 (A/R)", type: "debit", balance: 15e3 },
    { code: "201", name: "\u0631\u0623\u0633 \u0627\u0644\u0645\u0627\u0644 \u0627\u0644\u0645\u062F\u0641\u0648\u0639 \u0627\u0644\u062A\u0623\u0633\u064A\u0633\u064A", type: "credit", balance: 45e4 },
    { code: "202", name: "\u0642\u0631\u0648\u0636 \u062A\u0645\u0648\u064A\u0644\u064A\u0629 \u0648\u0623\u0642\u0633\u0627\u0637 \u0628\u0646\u0643\u064A\u0629 \u0645\u0639\u0644\u0642\u0629", type: "credit", balance: 12e4 },
    { code: "203", name: "\u0630\u0645\u0645 \u062D\u0633\u0627\u0628\u0627\u062A \u0627\u0644\u0645\u0648\u0631\u062F\u064A\u0646 \u0648\u0627\u0644\u062F\u0627\u0626\u0646\u064A\u0646 \u0627\u0644\u062A\u062C\u0627\u0631\u064A\u0629 (A/P)", type: "credit", balance: 22e3 },
    { code: "301", name: "\u0625\u064A\u0631\u0627\u062F\u0627\u062A \u0627\u0644\u0645\u0628\u064A\u0639\u0627\u062A \u0627\u0644\u0645\u062D\u0642\u0642\u0629", type: "credit", balance: 0 },
    { code: "401", name: "\u062A\u0643\u0644\u0641\u0629 \u0627\u0644\u0628\u0636\u0627\u0639\u0629 \u0627\u0644\u0645\u0628\u0627\u0639\u0629 (\u0645\u0634\u062A\u0631\u064A\u0627\u062A)", type: "debit", balance: 0 },
    { code: "402", name: "\u0645\u0635\u0627\u0631\u064A\u0641 \u0625\u0647\u0644\u0627\u0643 \u0627\u0644\u0623\u0635\u0648\u0644 \u0648\u0631\u0623\u0633 \u0627\u0644\u0645\u0627\u0644 \u0627\u0644\u0647\u0627\u0644\u0643", type: "debit", balance: 0 },
    { code: "403", name: "\u0645\u0635\u0627\u0631\u064A\u0641 \u0647\u0627\u0644\u0643 \u0648\u062A\u0644\u0641\u064A\u0627\u062A \u0627\u0644\u0628\u0636\u0627\u0639\u0629", type: "debit", balance: 0 },
    { code: "501", name: "\u062D\u0633\u0627\u0628 \u0636\u0631\u064A\u0628\u0629 \u0627\u0644\u0642\u064A\u0645\u0629 \u0627\u0644\u0645\u0636\u0627\u0641\u0629 \u0627\u0644\u0645\u062D\u0635\u0644\u0629 (14% VAT)", type: "credit", balance: 0 }
  ],
  journal: [
    {
      id: "j-1",
      date: "2026-06-14",
      desc: "\u0642\u064A\u062F \u0625\u062B\u0628\u0627\u062A \u0628\u0636\u0627\u0639\u0629 \u0623\u0648\u0644 \u0627\u0644\u0645\u062F\u0629 \u0648\u0631\u0623\u0633 \u0627\u0644\u0645\u0627\u0644 \u0627\u0644\u062A\u0623\u0633\u064A\u0633\u064A",
      debitCode: "104",
      creditCode: "201",
      amount: 95e3,
      postedBy: "system",
      isDraft: false
    },
    {
      id: "j-2",
      date: "2026-06-15",
      desc: "\u0633\u0644\u0641\u0629 \u0642\u0631\u0636 \u0628\u0646\u0643\u064A \u0628\u0642\u064A\u0645\u0629 120,000 \u062C.\u0645 \u0644\u0634\u0631\u0627\u0621 \u062B\u0644\u0627\u062C\u0629 \u062A\u0628\u0631\u064A\u062F \u0644\u0644\u0645\u0648\u0644",
      debitCode: "101",
      creditCode: "202",
      amount: 12e4,
      postedBy: "admin",
      isDraft: false
    }
  ],
  assets: [
    { id: "a-1", name: "\u062B\u0644\u0627\u062C\u0629 \u062A\u0628\u0631\u064A\u062F \u062C\u0647\u064A\u0646\u0629 \u0627\u0644\u0643\u0628\u0631\u0649 (\u0639\u0631\u0636)", originalValue: 85e3, currentValue: 81e3, salvageValue: 5e3, rate: 10, acquiredDate: "2026-01-10", notes: "\u0625\u0647\u0644\u0627\u0643 \u062E\u0637\u064A \u0633\u0646\u0648\u064A \u0628\u0645\u0639\u062F\u0644 10%" },
    { id: "a-2", name: "\u0623\u0646\u0638\u0645\u0629 \u062D\u0648\u0627\u0633\u0628 \u0643\u0627\u0634\u064A\u0631 \u0648\u0628\u0648\u0627\u0628\u0627\u062A \u0628\u0627\u0631\u0643\u0648\u062F \u0641\u0631\u0646\u0633\u064A\u0629", originalValue: 35e3, currentValue: 32e3, salvageValue: 2e3, rate: 15, acquiredDate: "2026-02-15", notes: "\u0645\u0639\u062F\u0644 \u0625\u0647\u0644\u0627\u0643 \u0644\u0644\u0645\u0639\u062F\u0627\u062A \u0627\u0644\u062A\u0642\u0646\u064A\u0629 15%" },
    { id: "a-3", name: "\u0633\u064A\u0627\u0631\u0629 \u0634\u064A\u0641\u0631\u0648\u0644\u064A\u0629 \u0646\u0642\u0644 \u0633\u0644\u0639 \u0648\u062A\u0648\u0632\u064A\u0639 \u062F\u0627\u062E\u0644\u064A", originalValue: 12e4, currentValue: 112e3, salvageValue: 2e4, rate: 8, acquiredDate: "2026-03-01", notes: "\u062A\u062E\u062F\u0645 \u0646\u0642\u0644 \u0627\u0644\u0628\u0636\u0627\u0626\u0639 \u0628\u064A\u0646 \u0627\u0644\u0641\u0631\u0648\u0639 \u0648\u0627\u0644\u0645\u062E\u0632\u0646" }
  ],
  loans: [
    { id: "l-1", lender: "\u0627\u0644\u0628\u0646\u0643 \u0627\u0644\u0623\u0647\u0644\u064A \u0627\u0644\u0645\u0635\u0631\u064A", loanAmount: 12e4, rate: 12, termMonths: 12, startDate: "2026-06-15", installmentsPaid: 0, nextDueDate: "2026-07-15", paidAmount: 0, status: "active" },
    { id: "l-2", lender: "\u0627\u0644\u0645\u0648\u0631\u062F \u0634\u0642\u064A\u0631 \u062C\u0631\u0648\u0628 \u0644\u0644\u0645\u0639\u0644\u0628\u0627\u062A", loanAmount: 45e3, rate: 0, termMonths: 6, startDate: "2026-06-01", installmentsPaid: 1, nextDueDate: "2026-07-01", paidAmount: 7500, status: "active" }
  ]
};
function readFinancials() {
  if (!import_fs.default.existsSync(FINANCIAL_FILE)) {
    import_fs.default.writeFileSync(FINANCIAL_FILE, JSON.stringify(INITIAL_FINANCIALS, null, 2), "utf8");
    return INITIAL_FINANCIALS;
  }
  try {
    const data = JSON.parse(import_fs.default.readFileSync(FINANCIAL_FILE, "utf8"));
    const newCodes = ["105", "203", "403"];
    let migrated = false;
    newCodes.forEach((code) => {
      if (!data.accounts.find((a) => a.code === code)) {
        const matchingInit = INITIAL_FINANCIALS.accounts.find((a) => a.code === code);
        if (matchingInit) {
          data.accounts.push(JSON.parse(JSON.stringify(matchingInit)));
          migrated = true;
        }
      }
    });
    if (migrated) {
      import_fs.default.writeFileSync(FINANCIAL_FILE, JSON.stringify(data, null, 2), "utf8");
    }
    return data;
  } catch (e) {
    return INITIAL_FINANCIALS;
  }
}
function writeFinancials(data) {
  try {
    import_fs.default.writeFileSync(FINANCIAL_FILE, JSON.stringify(data, null, 2), "utf8");
  } catch (e) {
  }
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
  const newEntry = {
    id: "j-" + Date.now(),
    date: date || (/* @__PURE__ */ new Date()).toISOString().split("T")[0],
    desc: desc || "\u0642\u064A\u062F \u0645\u062D\u0627\u0633\u0628\u064A \u0645\u0636\u0627\u0641",
    debitCode,
    creditCode,
    amount: Number(amount),
    postedBy: postedBy || "system",
    isDraft: isDraft === true || isDraft === "true",
    isAdjustment: isAdjustment === true || isAdjustment === "true"
  };
  if (!newEntry.isDraft) {
    const debAcc = fin.accounts.find((a) => a.code === debitCode);
    const credAcc = fin.accounts.find((a) => a.code === creditCode);
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
  fin.journal.forEach((entry) => {
    if (entry.isDraft) {
      entry.isDraft = false;
      count++;
      const debAcc = fin.accounts.find((a) => a.code === entry.debitCode);
      const credAcc = fin.accounts.find((a) => a.code === entry.creditCode);
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
    const asset = fin.assets.find((a) => a.id === incoming.id);
    if (asset) {
      const depAmt = Number(incoming.amount);
      asset.currentValue = Math.max(asset.salvageValue, asset.currentValue - depAmt);
      const newEntry = {
        id: "j-dep-" + Date.now(),
        date: (/* @__PURE__ */ new Date()).toISOString().split("T")[0],
        desc: `\u0642\u064A\u062F \u0625\u062B\u0628\u0627\u062A \u0625\u0647\u0644\u0627\u0643 \u062F\u0648\u0631\u064A \u0644\u0640 [${asset.name}]`,
        debitCode: "402",
        creditCode: "103",
        amount: depAmt,
        postedBy: "system"
      };
      fin.journal.unshift(newEntry);
      const acc402 = fin.accounts.find((a) => a.code === "402");
      const acc103 = fin.accounts.find((a) => a.code === "103");
      if (acc402) acc402.balance += depAmt;
      if (acc103) acc103.balance -= depAmt;
    }
  } else {
    const newAsset = {
      id: "a-" + Date.now(),
      name: incoming.name,
      originalValue: Number(incoming.originalValue),
      currentValue: Number(incoming.originalValue),
      salvageValue: Number(incoming.salvageValue || 0),
      rate: Number(incoming.rate || 10),
      acquiredDate: incoming.acquiredDate || (/* @__PURE__ */ new Date()).toISOString().split("T")[0],
      notes: incoming.notes || ""
    };
    fin.assets.push(newAsset);
    const newEntry = {
      id: "j-ast-" + Date.now(),
      date: newAsset.acquiredDate,
      desc: `\u0634\u0631\u0627\u0621 \u0623\u0635\u0644 \u062B\u0627\u0628\u062A \u062C\u062F\u064A\u062F \u0648\u062A\u0641\u0639\u064A\u0644\u0647: [${newAsset.name}]`,
      debitCode: "103",
      creditCode: "102",
      amount: newAsset.originalValue,
      postedBy: "admin"
    };
    fin.journal.unshift(newEntry);
    const acc103 = fin.accounts.find((a) => a.code === "103");
    const acc102 = fin.accounts.find((a) => a.code === "102");
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
    const loan = fin.loans.find((l) => l.id === incoming.id);
    if (loan) {
      const monthlyPay = Number(incoming.amount);
      loan.paidAmount += monthlyPay;
      loan.installmentsPaid += 1;
      if (loan.paidAmount >= loan.loanAmount) {
        loan.status = "paid";
      }
      const d = new Date(loan.nextDueDate);
      d.setMonth(d.getMonth() + 1);
      loan.nextDueDate = d.toISOString().split("T")[0];
      const newEntry = {
        id: "j-loan-pay-" + Date.now(),
        date: (/* @__PURE__ */ new Date()).toISOString().split("T")[0],
        desc: `\u0633\u062F\u0627\u062F \u0642\u0633\u0637 \u062A\u0645\u0648\u064A\u0644 \u0623\u0648 \u0642\u0631\u0636 \u0644\u0635\u0627\u0644\u062D \u062C\u0647\u0629 (${loan.lender})`,
        debitCode: "202",
        creditCode: "101",
        amount: monthlyPay,
        postedBy: "cashier"
      };
      fin.journal.unshift(newEntry);
      const acc202 = fin.accounts.find((a) => a.code === "202");
      const acc101 = fin.accounts.find((a) => a.code === "101");
      if (acc202) acc202.balance -= monthlyPay;
      if (acc101) acc101.balance -= monthlyPay;
    }
  } else {
    const newLoan = {
      id: "l-" + Date.now(),
      lender: incoming.lender,
      loanAmount: Number(incoming.loanAmount),
      rate: Number(incoming.rate || 0),
      termMonths: Number(incoming.termMonths || 12),
      startDate: incoming.startDate || (/* @__PURE__ */ new Date()).toISOString().split("T")[0],
      installmentsPaid: 0,
      nextDueDate: incoming.nextDueDate || new Date(Date.now() + 30 * 24 * 3600 * 1e3).toISOString().split("T")[0],
      paidAmount: 0,
      status: "active"
    };
    fin.loans.push(newLoan);
  }
  writeFinancials(fin);
  res.json({ success: true, financials: fin });
});
var HR_FILE = import_path.default.join(process.cwd(), "hr_db.json");
var INITIAL_HR = {
  attendance: [
    { username: "admin", date: "2026-06-14", clockIn: "08:45 AM", clockOut: "05:15 PM", status: "present" },
    { username: "warehouse", date: "2026-06-14", clockIn: "08:55 AM", clockOut: "05:00 PM", status: "present" },
    { username: "cashier", date: "2026-06-14", clockIn: "09:00 AM", clockOut: "05:10 PM", status: "present" },
    { username: "warehouse", date: "2026-06-15", clockIn: "08:50 AM", clockOut: "05:05 PM", status: "present" },
    { username: "cashier", date: "2026-06-15", clockIn: "09:02 AM", clockOut: "04:55 PM", status: "present" }
  ],
  leaves: [
    { id: "v-1", username: "cashier", nameAr: "\u0633\u0627\u0631\u0629 \u0627\u0644\u062C\u064A\u0627\u062F", type: "\u0637\u0627\u0631\u0626\u0629", startDate: "2026-06-20", endDate: "2026-06-22", days: 2, reason: "\u0641\u062D\u0648\u0635 \u0637\u0628\u064A\u0629 \u0639\u0627\u0626\u0644\u064A\u0629", status: "approved" },
    { id: "v-2", username: "warehouse", nameAr: "\u0623\u062D\u0645\u062F \u0639\u0628\u062F \u0627\u0644\u0639\u0627\u0644", type: "\u0633\u0646\u0648\u064A\u0629", startDate: "2026-07-01", endDate: "2026-07-06", days: 5, reason: "\u0625\u062C\u0627\u0632\u0629 \u0645\u0635\u064A\u0641 \u0633\u0646\u0648\u064A \u0645\u0639 \u0627\u0644\u0623\u0633\u0631\u0629", status: "pending" }
  ]
};
function readHR() {
  if (!import_fs.default.existsSync(HR_FILE)) {
    import_fs.default.writeFileSync(HR_FILE, JSON.stringify(INITIAL_HR, null, 2), "utf8");
    return INITIAL_HR;
  }
  try {
    return JSON.parse(import_fs.default.readFileSync(HR_FILE, "utf8"));
  } catch (e) {
    return INITIAL_HR;
  }
}
function writeHR(data) {
  try {
    import_fs.default.writeFileSync(HR_FILE, JSON.stringify(data, null, 2), "utf8");
  } catch (e) {
  }
}
app.get("/api/hr", (req, res) => {
  res.json(readHR());
});
app.post("/api/hr/attendance", (req, res) => {
  const { username, action, simulatedToday } = req.body;
  if (!username) return res.status(400).json({ success: false, message: "Missing username" });
  const hr = readHR();
  const dateStr = simulatedToday || (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
  const now = /* @__PURE__ */ new Date();
  const timeStr = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  const sheetIdx = hr.attendance.findIndex((a) => a.username === username && a.date === dateStr);
  if (action === "clock-in") {
    if (sheetIdx !== -1) {
      return res.status(400).json({ success: false, messageAr: "\u0642\u0645\u062A \u0628\u062A\u0633\u062C\u064A\u0644 \u0627\u0644\u062D\u0636\u0648\u0631 \u0645\u0633\u0628\u0642\u0627\u064B \u0644\u0647\u0630\u0627 \u0627\u0644\u064A\u0648\u0645!" });
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
    const v = hr.leaves.find((l) => l.id === incoming.id);
    if (v) {
      v.status = incoming.status;
    }
  } else {
    const newL = {
      id: "v-" + Date.now(),
      username: incoming.username,
      nameAr: incoming.nameAr || incoming.username,
      type: incoming.type || "\u0633\u0646\u0648\u064A\u0629",
      startDate: incoming.startDate,
      endDate: incoming.endDate,
      days: Number(incoming.days || 1),
      reason: incoming.reason || "\u0628\u062F\u0648\u0646 \u0630\u0643\u0631 \u0623\u0633\u0628\u0627\u0628",
      status: "pending"
    };
    hr.leaves.push(newL);
  }
  writeHR(hr);
  res.json({ success: true, hr });
});
app.post("/api/products/scan-invoice", async (req, res) => {
  const { image, mimeType } = req.body;
  if (!image) {
    return res.status(400).json({ success: false, message: "\u0644\u0645 \u064A\u062A\u0645 \u0627\u0633\u062A\u0644\u0627\u0645 \u0635\u0648\u0631\u0629 \u0627\u0644\u0641\u0627\u062A\u0648\u0631\u0629" });
  }
  try {
    const ai = getGeminiClient();
    const imagePart = {
      inlineData: {
        mimeType: mimeType || "image/jpeg",
        data: image
        // Base64 representation
      }
    };
    const promptText = `
      You are an expert accountant and inventory system scanner. 
      Analyze the attached photo of a purchase invoice (\u0641\u0627\u062A\u0648\u0631\u0629 \u0634\u0631\u0627\u0621) in detail.
      Extract all line items / products. For each item, extract:
      1. Product name in Arabic (nameAr) - provide clean Arabic naming as it would appear on a cash register.
      2. Product name in English (nameEn) - if only Arabic is written, translate or romanize it correctly.
      3. Barcode (barcode) - if written on the invoice clearly, extract it. Otherwise, estimate a valid EAN-like barcode sequence or unique placeholder or empty string if not possible.
      4. Quantity (quantity) - integer units.
      5. Purchase Price per unit (buyPrice) in EGP - unit price.
      6. Suggested Category (category) - Guess the most suitable key from this allowed list only: 
         - "groceries" (\u0645\u0648\u0627\u062F \u062A\u0645\u0648\u064A\u0646\u064A\u0629 \u0648\u062C\u0627\u0641\u0629)
         - "dairy" (\u0623\u0644\u0628\u0627\u0646 \u0648\u0623\u062C\u0628\u0627\u0646 \u0648\u0635\u0646\u0627\u0639\u0627\u062A\u0647\u0627)
         - "meat" (\u0644\u062D\u0648\u0645 \u0648\u062F\u0648\u0627\u062C\u0646 \u0648\u0623\u0633\u0645\u0627\u0643)
         - "produce" (\u062E\u0636\u0631\u0648\u0627\u062A \u0648\u0641\u0648\u0627\u0643\u0647 \u0637\u0627\u0632\u062C\u0629)
         - "bakery" (\u0645\u062E\u0628\u0648\u0632\u0627\u062A \u0648\u062D\u0644\u0648\u064A\u0627\u062A)
         - "cleaning" (\u0645\u0646\u0638\u0641\u0627\u062A \u0648\u0645\u0633\u062A\u0644\u0632\u0645\u0627\u062A \u0645\u0646\u0632\u0644\u064A\u0629)
         - "cosmetics" (\u0639\u0646\u0627\u064A\u0629 \u0634\u062E\u0635\u064A\u0629 \u0648\u062A\u062C\u0645\u064A\u0644)
         - "electronics" (\u0623\u062C\u0647\u0632\u0629 \u0643\u0647\u0631\u0628\u0627\u0626\u064A\u0629 \u0648\u0645\u0644\u062D\u0642\u0627\u062A)

      Respond strictly in JSON format matching the schema provided.
    `.trim();
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: { parts: [imagePart, { text: promptText }] },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: import_genai.Type.OBJECT,
          properties: {
            items: {
              type: import_genai.Type.ARRAY,
              description: "List of items found in the invoice",
              items: {
                type: import_genai.Type.OBJECT,
                properties: {
                  nameAr: { type: import_genai.Type.STRING },
                  nameEn: { type: import_genai.Type.STRING },
                  barcode: { type: import_genai.Type.STRING },
                  quantity: { type: import_genai.Type.INTEGER },
                  buyPrice: { type: import_genai.Type.NUMBER },
                  category: { type: import_genai.Type.STRING }
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
        message: "\u0641\u0634\u0644 \u0641\u064A \u062A\u062D\u0644\u064A\u0644 \u0627\u0633\u062A\u062C\u0627\u0628\u0629 \u0627\u0644\u0630\u0643\u0627\u0621 \u0627\u0644\u0627\u0635\u0637\u0646\u0627\u0639\u064A \u0628\u0634\u0643\u0644 \u0635\u062D\u064A\u062D",
        raw: textOutput
      });
    }
    res.json({ success: true, data: parsedData });
    pushSystemAuditLog(
      "system",
      "\u062A\u0645 \u0627\u0633\u062A\u062E\u062F\u0627\u0645 \u0627\u0644\u0630\u0643\u0627\u0621 \u0627\u0644\u0627\u0635\u0637\u0646\u0627\u0639\u064A \u0628\u0646\u062C\u0627\u062D \u0644\u0642\u0631\u0627\u0621\u0629 \u0648\u0641\u0643 \u062A\u0634\u0641\u064A\u0631 \u0641\u0627\u062A\u0648\u0631\u0629 \u0634\u0631\u0627\u0621 \u0645\u0635\u0648\u0631\u0629.",
      "Successfully processed purchase invoice image using Gemini AI vision.",
      req
    );
  } catch (error) {
    console.error("Invoice scan error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "\u062D\u062F\u062B \u062E\u0637\u0623 \u063A\u064A\u0631 \u0645\u062A\u0648\u0642\u0639 \u0623\u062B\u0646\u0627\u0621 \u0645\u0639\u0627\u0644\u062C\u0629 \u0627\u0644\u0641\u0627\u062A\u0648\u0631\u0629 \u0627\u0644\u0645\u0635\u0648\u0631\u0629 \u0628\u0640 Gemini AI"
    });
  }
});
var CATEGORIES_FILE = import_path.default.join(process.cwd(), "categories_db.json");
function readCategories() {
  try {
    if (import_fs.default.existsSync(CATEGORIES_FILE)) {
      return JSON.parse(import_fs.default.readFileSync(CATEGORIES_FILE, "utf8"));
    }
  } catch (err) {
    console.error("Failed to read categories database", err);
  }
  return [];
}
function writeCategories(data) {
  try {
    import_fs.default.writeFileSync(CATEGORIES_FILE, JSON.stringify(data, null, 2), "utf8");
  } catch (err) {
    console.error("Failed to write categories database", err);
  }
}
app.get("/api/categories", (req, res) => {
  res.json(readCategories());
});
app.post("/api/categories", (req, res) => {
  const incoming = req.body;
  const categories = readCategories();
  const existingIdx = categories.findIndex((c) => c.key === incoming.key);
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
app.post("/api/products/bulk", (req, res) => {
  const { products: bulkList } = req.body;
  if (!bulkList || !Array.isArray(bulkList)) {
    return res.status(400).json({ success: false, message: "Invalid payload. 'products' array required." });
  }
  const dbData = readDatabase();
  const added = [];
  const updated = [];
  bulkList.forEach((incoming) => {
    const barcodeClean = String(incoming.barcode || "").trim();
    if (!barcodeClean) return;
    const existingIdx = dbData.findIndex((p) => String(p.barcode || "").trim() === barcodeClean || p.id === incoming.id);
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
      ext.supplierName = incoming.supplierName || ext.supplierName || "\u0645\u0648\u0631\u062F \u0643\u0627\u0634\u064A\u0631";
      if (incoming.isComposite !== void 0) {
        ext.isComposite = incoming.isComposite;
        ext.components = incoming.components || [];
      }
      const totalStock = shelfStock + warehouseStock;
      ext.batches = [
        {
          id: `batch-${ext.id}-old`,
          buyPrice: Number((buyPrice * 0.95).toFixed(2)),
          sellPrice,
          quantity: Math.floor(totalStock * 0.3),
          initialQuantity: Math.floor(totalStock * 0.3),
          expiryDate: ext.expirationDate,
          dateAdded: "2026-05-15"
        },
        {
          id: `batch-${ext.id}-new`,
          buyPrice,
          sellPrice,
          quantity: Math.max(0, totalStock - Math.floor(totalStock * 0.3)),
          initialQuantity: Math.max(0, totalStock - Math.floor(totalStock * 0.3)),
          expiryDate: ext.expirationDate,
          dateAdded: "2026-06-12"
        }
      ];
      updated.push(ext);
    } else {
      const newId = incoming.id || "p-" + Date.now() + "-" + Math.floor(Math.random() * 1e3);
      const totalStock = shelfStock + warehouseStock;
      const newProd = {
        id: newId,
        nameAr: incoming.nameAr || incoming.nameEn || "\u0645\u0646\u062A\u062C \u062C\u062F\u064A\u062F \u0645\u0633\u062A\u0648\u0631\u062F",
        nameEn: incoming.nameEn || incoming.nameAr || "New Import Product",
        barcode: barcodeClean,
        category: incoming.category || "groceries",
        subCategory: incoming.subCategory || "",
        shelfStock,
        warehouseStock,
        minStockAlert: Number(incoming.minStockAlert) || 10,
        buyPrice,
        sellPrice,
        expirationDate: incoming.expirationDate || "2027-12-30",
        supplierName: incoming.supplierName || "\u0645\u0648\u0631\u062F \u0643\u0627\u0634\u064A\u0631",
        supplierPhone: incoming.supplierPhone || "",
        batchNumber: incoming.batchNumber || "BATCH-EXCEL",
        lastUpdated: (/* @__PURE__ */ new Date()).toISOString().split("T")[0],
        unitsSold: 0,
        unitsLost: 0,
        isComposite: incoming.isComposite || false,
        components: incoming.components || [],
        batches: [
          {
            id: `batch-${newId}-old`,
            buyPrice: Number((buyPrice * 0.95).toFixed(2)),
            sellPrice,
            quantity: Math.floor(totalStock * 0.3),
            initialQuantity: Math.floor(totalStock * 0.3),
            expiryDate: incoming.expirationDate || "2027-12-30",
            dateAdded: "2026-05-15"
          },
          {
            id: `batch-${newId}-new`,
            buyPrice,
            sellPrice,
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
    `\u062A\u0645 \u0627\u0633\u062A\u064A\u0631\u0627\u062F \u0645\u0646\u062A\u062C\u0627\u062A \u0645\u062C\u0645\u0639\u0629 \u0639\u0646 \u0637\u0631\u064A\u0642 \u0645\u0644\u0641 \u0625\u0643\u0633\u064A\u0644: \u0625\u0636\u0627\u0641\u0629 (${added.length}) \u0648\u062A\u062D\u062F\u064A\u062B (${updated.length}) \u0635\u0646\u0641 \u0641\u064A \u0642\u0627\u0639\u062F\u0629 \u0627\u0644\u0628\u064A\u0627\u0646\u0627\u062A.`,
    `Imported bulk products via Excel: added (${added.length}) and updated (${updated.length}) entries in products database.`,
    req
  );
  res.json({ success: true, products: dbData, addedCount: added.length, updatedCount: updated.length });
});
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
      p.lastUpdated = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
    }
  });
  writeDatabase(dbData);
  pushSystemAuditLog(
    "system",
    `\u062A\u0645 \u062A\u0639\u062F\u064A\u0644 \u0623\u0633\u0639\u0627\u0631 \u0627\u0644\u0645\u0646\u062A\u062C\u0627\u062A \u0645\u0639\u0627\u064B \u0645\u062C\u0645\u0639\u0627\u064B \u0644\u0640 (${affectedCount}) \u0645\u0646\u062A\u062C \u0628\u0645\u0642\u062F\u0627\u0631 (${numValue}) \u0646\u0648\u0639 (${adjustType === "percent" ? "%" : "\u062C\u0646\u064A\u0647"}).`,
    `Mass adjusted prices for (${affectedCount}) items by (${numValue}) via (${adjustType === "percent" ? "%" : "EGP"}) strategy.`,
    req
  );
  res.json({ success: true, products: dbData, affectedCount });
});
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
    const prod = dbData.find((p) => String(p.barcode || "").trim() === cleanBarcode);
    if (prod) {
      const val = Number(item.discountValue) || 0;
      if (val > 0) {
        prod.isDiscounted = true;
        prod.discountType = item.discountType === "egp" ? "egp" : "percent";
        prod.discountValue = val;
        prod.discountPercentage = item.discountType === "percent" ? val : void 0;
      } else {
        prod.isDiscounted = false;
        prod.discountType = void 0;
        prod.discountValue = void 0;
        prod.discountPercentage = void 0;
      }
      prod.lastUpdated = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
      updatedCount++;
    }
  });
  writeDatabase(dbData);
  pushSystemAuditLog(
    "system",
    `\u062A\u0645 \u062A\u0637\u0628\u064A\u0642 \u062E\u0635\u0648\u0645\u0627\u062A \u0645\u062C\u0645\u0639\u0629 \u0645\u0646 \u0627\u0644\u0625\u0643\u0633\u064A\u0644 \u0639\u0644\u0649 (${updatedCount}) \u0645\u0646\u062A\u062C \u0628\u0646\u062C\u0627\u062D.`,
    `Successfully set bulk discounts on (${updatedCount}) products from Excel sheet.`,
    req
  );
  res.json({ success: true, products: dbData, updatedCount });
});
async function startServer() {
  try {
    await import_mongoose.default.connect(MONGODB_URI);
    console.log("Successfully connected to MongoDB Cluster!");
    await loadMongoDBIntoCache();
    readDatabase();
    readTransactions();
  } catch (err) {
    console.error("Error connecting to MongoDB:", err);
  }
  if (process.env.NODE_ENV !== "production") {
    const vite = await (0, import_vite.createServer)({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const distPath = import_path.default.join(process.cwd(), "dist");
    app.use(import_express.default.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(import_path.default.join(distPath, "index.html"));
    });
  }
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
  });
}
startServer();
//# sourceMappingURL=server.cjs.map
