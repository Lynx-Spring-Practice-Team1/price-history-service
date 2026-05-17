import express from 'express';
import cors from 'cors';
import { query, initDb } from './db.js';

const app = express();
const PORT = process.env.PORT || 3001;
const RANGE_SECONDS = {
  '1d': 24 * 60 * 60,
  '1w': 7 * 24 * 60 * 60,
  '1m': 30 * 24 * 60 * 60,
};

app.use(cors());
app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'price-history-service' });
});

// GET /api/candles?ticker=AAPL&range=1d|1w|1m|all
app.get('/api/candles', async (req, res) => {
  const { ticker, range = 'all' } = req.query;
  if (!ticker) return res.status(400).json({ error: 'ticker required' });

  const normalizedTicker = String(ticker).toUpperCase();
  const normalizedRange = String(range).toLowerCase();
  if (
    normalizedRange !== 'all' &&
    !Object.prototype.hasOwnProperty.call(RANGE_SECONDS, normalizedRange)
  ) {
    return res.status(400).json({ error: 'invalid range' });
  }

  try {
    const { rows } = normalizedRange === 'all'
      ? await query(
          'SELECT time, open, high, low, close FROM candles WHERE ticker = $1 ORDER BY time ASC',
          [normalizedTicker],
        )
      : await query(
          `WITH latest AS (
             SELECT MAX(time) AS max_time FROM candles WHERE ticker = $1
           )
           SELECT time, open, high, low, close
           FROM candles, latest
           WHERE ticker = $1
             AND time >= latest.max_time - $2
           ORDER BY time ASC`,
          [normalizedTicker, RANGE_SECONDS[normalizedRange]],
        );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'db error' });
  }
});

// PUT /api/candles - upsert a single candle
app.put('/api/candles', async (req, res) => {
  const { ticker, time, open, high, low, close } = req.body ?? {};
  if (!ticker || time == null || open == null || high == null || low == null || close == null) {
    return res.status(400).json({ error: 'missing fields' });
  }

  try {
    await query(
      `INSERT INTO candles (ticker, time, open, high, low, close)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (ticker, time)
       DO UPDATE SET open = $3, high = $4, low = $5, close = $6`,
      [String(ticker).toUpperCase(), time, open, high, low, close],
    );
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'db error' });
  }
});

await initDb();
app.listen(PORT, () => console.log(`Price history service on :${PORT}`));
