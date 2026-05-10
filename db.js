import pg from 'pg';

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

export function query(text, params) {
  return pool.query(text, params);
}

export async function initDb() {
  let retries = 10;
  while (retries > 0) {
    try {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS candles (
          id     SERIAL PRIMARY KEY,
          ticker VARCHAR(10)    NOT NULL,
          time   BIGINT         NOT NULL,
          open   NUMERIC(14, 4) NOT NULL,
          high   NUMERIC(14, 4) NOT NULL,
          low    NUMERIC(14, 4) NOT NULL,
          close  NUMERIC(14, 4) NOT NULL,
          UNIQUE (ticker, time)
        )
      `);
      console.log('DB ready');
      return;
    } catch (err) {
      retries--;
      if (retries === 0) throw err;
      console.log(`Waiting for DB… (${retries} retries left)`);
      await new Promise(r => setTimeout(r, 2000));
    }
  }
}
