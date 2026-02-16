const STORAGE_KEY = 'mobilehub_pos_sqlite_v1';
let db;

const schemaSql = `
CREATE TABLE IF NOT EXISTS products (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  sku TEXT UNIQUE NOT NULL,
  category TEXT,
  cost_price REAL NOT NULL,
  sale_price REAL NOT NULL,
  quantity INTEGER NOT NULL,
  vendor_id INTEGER,
  low_stock_threshold INTEGER DEFAULT 5,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS customers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  address TEXT,
  total_purchases REAL DEFAULT 0,
  due_amount REAL DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS vendors (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  address TEXT,
  total_purchase_amount REAL DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS invoices (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  customer_id INTEGER,
  date TEXT NOT NULL,
  subtotal REAL,
  discount REAL,
  tax REAL,
  total REAL,
  profit REAL
);
CREATE TABLE IF NOT EXISTS invoice_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  invoice_id INTEGER,
  product_id INTEGER,
  quantity INTEGER,
  price REAL,
  cost REAL
);
CREATE TABLE IF NOT EXISTS vendor_purchases (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  vendor_id INTEGER,
  product_id INTEGER,
  quantity INTEGER,
  cost_price REAL,
  total REAL,
  date TEXT
);
`;

const seedSql = `
INSERT INTO vendors (name, phone, email, address, total_purchase_amount) VALUES
('Alpha Imports', '+1-111-2222', 'alpha@vendors.com', 'NY warehouse', 1400),
('Gadget Source', '+1-222-3333', 'gadget@vendors.com', 'CA logistics', 1200);

INSERT INTO products (name, sku, category, cost_price, sale_price, quantity, vendor_id, low_stock_threshold) VALUES
('USB-C Fast Charger 20W', 'SKU-1001', 'Chargers', 4.5, 9.99, 80, 1, 15),
('Tempered Glass iPhone 15', 'SKU-1002', 'Protection', 0.8, 3.25, 300, 2, 50),
('Bluetooth Neckband Earbuds', 'SKU-1003', 'Audio', 9.2, 18.5, 28, 2, 20),
('MagSafe Compatible Case', 'SKU-1004', 'Cases', 2.3, 7.99, 11, 1, 12);

INSERT INTO customers (name, phone, email, address, total_purchases, due_amount) VALUES
('Nexus Telecom', '+1-777-8888', 'buy@nexustelecom.com', 'Miami', 820, 0),
('City Mobile Mart', '+1-999-0000', 'owner@citymobile.com', 'Dallas', 1140, 120);
`;

function saveDb() {
  if (!db) return;
  const binaryArray = db.export();
  const encoded = btoa(String.fromCharCode(...binaryArray));
  localStorage.setItem(STORAGE_KEY, encoded);
}

function loadDb(SQL) {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (!saved) return new SQL.Database();
  const bytes = Uint8Array.from(atob(saved), (c) => c.charCodeAt(0));
  return new SQL.Database(bytes);
}

export async function initDb() {
  const SQL = await initSqlJs({ locateFile: (file) => `https://cdn.jsdelivr.net/npm/sql.js@1.10.3/dist/${file}` });
  db = loadDb(SQL);
  db.run(schemaSql);
  const count = queryOne('SELECT COUNT(*) as c FROM products').c;
  if (!count) {
    db.run(seedSql);
    saveDb();
  }
  return db;
}

export function query(sql, params = []) {
  const stmt = db.prepare(sql);
  stmt.bind(params);
  const rows = [];
  while (stmt.step()) rows.push(stmt.getAsObject());
  stmt.free();
  return rows;
}

export function queryOne(sql, params = []) {
  return query(sql, params)[0] || {};
}

export function execute(sql, params = []) {
  db.run(sql, params);
  saveDb();
}

export function transaction(fn) {
  try {
    db.run('BEGIN');
    fn();
    db.run('COMMIT');
    saveDb();
  } catch (error) {
    db.run('ROLLBACK');
    throw error;
  }
}

export function exportDatabase() {
  return db.export();
}

export async function importDatabase(file) {
  const SQL = await initSqlJs({ locateFile: (f) => `https://cdn.jsdelivr.net/npm/sql.js@1.10.3/dist/${f}` });
  const buf = await file.arrayBuffer();
  db = new SQL.Database(new Uint8Array(buf));
  db.run(schemaSql);
  saveDb();
}
