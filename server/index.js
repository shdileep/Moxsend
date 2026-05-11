import express from 'express';
import sqlite3 from 'sqlite3';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3001;

// 1. Catch crashes (MANDATORY)
process.on('uncaughtException', (err) => {
  console.error('🔥 UNCAUGHT EXCEPTION:', err);
});

process.on('unhandledRejection', (err) => {
  console.error('🔥 UNHANDLED PROMISE REJECTION:', err);
});

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));

// 6. Logging Helper
const logger = {
  info: (msg, data = '') => console.log(`[INFO] ${new Date().toISOString()} - ${msg}`, data),
  error: (msg, err) => console.error(`[ERROR] ${new Date().toISOString()} - ${msg}`, err)
};

// 4. Health check endpoint (Frontend will check this)
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', timestamp: Date.now() });
});

// Setup SQLite Database with Retry Logic (7. Fix Architecture & 2. Never let DB crash)
let db;
// REVERTING BACK TO ORIGINAL DATABASE SO ALL HISTORY IS RESTORED
const dbPath = path.join(__dirname, 'database.sqlite');

function connectWithRetry() {
  try {
    db = new sqlite3.Database(dbPath, (err) => {
      if (err) {
        logger.error('DB failed to connect. Retrying in 5 seconds...', err.message);
        setTimeout(connectWithRetry, 5000);
      } else {
        logger.info('✅ DB connected successfully.');
        initDB();
      }
    });
  } catch (err) {
    logger.error('CRITICAL DB Exception:', err);
    setTimeout(connectWithRetry, 5000);
  }
}

function initDB() {
  db.run(`
    CREATE TABLE IF NOT EXISTS history (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL,
      label TEXT,
      data TEXT NOT NULL,
      timestamp INTEGER NOT NULL,
      starred INTEGER DEFAULT 0
    )
  `);
  
  db.run(`ALTER TABLE history ADD COLUMN starred INTEGER DEFAULT 0`, (err) => {
    // Ignored: will error if column already exists
  });
}

connectWithRetry();

// 5. Timeout protection (VERY IMPORTANT)
const withTimeout = (promise, ms = 5000) => {
  const timeout = new Promise((_, reject) =>
    setTimeout(() => reject(new Error(`Database query timed out after ${ms}ms`)), ms)
  );
  return Promise.race([promise, timeout]);
};

const queryDB = (method, query, params = []) => {
  return new Promise((resolve, reject) => {
    db[method](query, params, function(err, result) {
      if (err) reject(err);
      else resolve(method === 'all' || method === 'get' ? result : this);
    });
  });
};

// API Routes
app.get('/api/history', async (req, res) => {
  try {
    const rows = await withTimeout(queryDB('all', 'SELECT * FROM history ORDER BY timestamp DESC'));
    
    let formattedRows = rows.map(row => {
      let parsedData = [];
      try { parsedData = JSON.parse(row.data); } catch (e) { logger.error('Parse error on row', row.id); }
      return { ...row, starred: Boolean(row.starred), data: parsedData };
    });
    
    formattedRows.sort((a, b) => {
      if (a.starred && !b.starred) return -1;
      if (!a.starred && b.starred) return 1;
      return b.timestamp - a.timestamp;
    });
    
    res.json(formattedRows);
  } catch (err) {
    logger.error('GET /api/history failed', err);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/history/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const row = await withTimeout(queryDB('get', 'SELECT * FROM history WHERE id = ?', [id]));
    
    if (!row) return res.status(404).json({ error: 'History item not found' });
    
    let parsedData = [];
    try { parsedData = JSON.parse(row.data); } catch (e) {}
    
    res.json({ ...row, starred: Boolean(row.starred), data: parsedData });
  } catch (err) {
    logger.error(`GET /api/history/${req.params.id} failed`, err);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/history', async (req, res) => {
  try {
    const { id, type, label, data } = req.body;
    if (!id || !type || !data) return res.status(400).json({ error: 'Missing required fields' });

    const dataStr = JSON.stringify(data);
    const query = `INSERT OR REPLACE INTO history (id, type, label, data, timestamp) VALUES (?, ?, ?, ?, ?)`;
    
    await withTimeout(queryDB('run', query, [id, type, label, dataStr, Date.now()]));
    logger.info(`History saved: ${id}`);
    res.status(200).json({ success: true, id, message: 'History saved successfully' });
  } catch (err) {
    logger.error('POST /api/history failed', err);
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/history/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await withTimeout(queryDB('run', 'DELETE FROM history WHERE id = ?', [id]));
    logger.info(`History deleted: ${id}`);
    res.status(200).json({ success: true, message: 'Deleted successfully' });
  } catch (err) {
    logger.error(`DELETE /api/history/${req.params.id} failed`, err);
    res.status(500).json({ error: err.message });
  }
});

app.patch('/api/history/:id/star', async (req, res) => {
  try {
    const { id } = req.params;
    const starValue = req.body.starred ? 1 : 0;
    
    db.run(`ALTER TABLE history ADD COLUMN starred INTEGER DEFAULT 0`, async () => {
      try {
        await withTimeout(queryDB('run', 'UPDATE history SET starred = ? WHERE id = ?', [starValue, id]));
        logger.info(`History starred status updated: ${id}`);
        res.status(200).json({ success: true, message: 'Star toggled successfully' });
      } catch (err) {
        res.status(500).json({ error: err.message });
      }
    });
  } catch (err) {
    logger.error(`PATCH /api/history/${req.params.id}/star failed`, err);
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, '0.0.0.0', () => {
  logger.info(`🚀 Backend server is running securely on http://localhost:${PORT} and network interfaces`);
});
