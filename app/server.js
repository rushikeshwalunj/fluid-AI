const express = require('express');
const path = require('path');
const { Pool } = require('pg');

const app = express();
const port = process.env.PORT || 3000;

app.use(express.static(path.join(__dirname, 'public')));

const pool = new Pool({
  host: process.env.DB_HOST || 'postgres',
  port: process.env.DB_PORT || 5432,
  user: process.env.DB_USER || 'appuser',
  password: process.env.DB_PASSWORD || 'apppass',
  database: process.env.DB_NAME || 'appdb',
});

let ready = false;
let dbConnected = false;

async function initDb() {
  try {
    await pool.query(
      `CREATE TABLE IF NOT EXISTS visits (id SERIAL PRIMARY KEY, ts TIMESTAMP DEFAULT NOW())`
    );
    dbConnected = true;
    ready = true;
    console.log('DB initialized, service ready');
  } catch (err) {
    console.error('DB init failed:', err.message);
    dbConnected = false;
    setTimeout(initDb, 3000);
  }
}
initDb();

// Main app route — proves the whole stack (app -> db) works end to end
app.get('/api/visits', async (req, res) => {
  try {
    await pool.query('INSERT INTO visits (ts) VALUES (NOW())');
    const result = await pool.query('SELECT COUNT(*) FROM visits');
    res.json({
      message: 'Hello from the DevOps challenge backend',
      visits: result.rows[0].count,
      host: process.env.HOSTNAME,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// LIVENESS: "is the process itself stuck/dead?" — does NOT check the database.
// If this fails, Kubernetes will restart the container.
app.get('/live', (req, res) => {
  if (process.env.SIMULATE_CRASH === 'true') {
    return res.status(500).json({ status: 'unhealthy - simulated crash' });
  }
  res.status(200).json({ status: 'alive' });
});

// READINESS: "is this pod ready to receive traffic?" — checks the DB dependency.
// If this fails, Kubernetes pulls the pod out of the Service endpoints
// (no restart) until it passes again.
app.get('/health', (req, res) => {
  if (process.env.SIMULATE_HEALTH_FAILURE === 'true') {
    return res.status(503).json({ status: 'not ready - simulated failure', dbConnected });
  }
  if (!ready || !dbConnected) {
    return res.status(503).json({ status: 'not ready', dbConnected });
  }
  res.status(200).json({ status: 'ready', dbConnected });
});

app.listen(port, () => console.log(`Listening on port ${port}`));
