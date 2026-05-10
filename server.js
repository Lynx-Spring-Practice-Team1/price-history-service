import express from 'express';
import cors from 'cors';
import { query, initDb } from './db.js';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// GET /api/candles?ticker=AAPL
app.get('/api/candles', async (req, res) => {
  const { ticker } = req.query;
  if (!ticker) return res.status(400).json({ error: 'ticker required' });

  try {
    const { rows } = await query(
      'SELECT time, open, high, low, close FROM candles WHERE ticker = $1 ORDER BY time ASC',
      [ticker],
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'db error' });
  }
});

// PUT /api/candles  — upsert a single candle
app.put('/api/candles', async (req, res) => {
  const { ticker, time, open, high, low, close } = req.body ?? {};
  if (!ticker || time == null || open == null || high == null || low == null || close == null)
    return res.status(400).json({ error: 'missing fields' });

  try {
    await query(
      `INSERT INTO candles (ticker, time, open, high, low, close)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (ticker, time)
       DO UPDATE SET open = $3, high = $4, low = $5, close = $6`,
      [ticker, time, open, high, low, close],
    );
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'db error' });
  }
});

await initDb();
app.listen(PORT, () => console.log(`Backend on :${PORT}`));
