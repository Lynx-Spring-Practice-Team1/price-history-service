# Price History Service

Microservice that stores and serves historical OHLC candlestick data for financial instruments.

## Overview

A lightweight Node.js/Express REST API backed by PostgreSQL. Clients can query candlestick data by ticker symbol and time range, or upsert new candle records. The table is created automatically on first startup.

## Tech Stack

- **Node.js 22** (ES modules)
- **Express 4** — REST API
- **PostgreSQL** — via `pg` client
- **Docker** (Node 22-alpine image)

## Project Structure

```
price-history-service/
├── server.js        # Express app and route handlers
├── db.js            # PostgreSQL connection pool and table init
├── package.json
└── Dockerfile
```

## API Endpoints

### `GET /health`
Returns service status.
```json
{ "status": "ok", "service": "price-history-service" }
```

### `GET /api/candles`
Retrieve candlestick data for a ticker.

| Query Param | Required | Description |
|-------------|----------|-------------|
| `ticker` | Yes | Stock symbol (e.g. `AAPL`) — case insensitive |
| `range` | No | `1d` (24h), `1w` (7 days), `1m` (30 days), or `all` (default) |

Response: array of candle objects
```json
[
  { "time": 1716000000, "open": 189.50, "high": 191.20, "low": 188.90, "close": 190.75 }
]
```

### `PUT /api/candles`
Upsert a single candle record (insert or update on conflict).

Request body:
```json
{
  "ticker": "AAPL",
  "time": 1716000000,
  "open": 189.50,
  "high": 191.20,
  "low": 188.90,
  "close": 190.75
}
```

Response: `{ "ok": true }`

## Database Schema

```sql
CREATE TABLE candles (
  id     SERIAL PRIMARY KEY,
  ticker VARCHAR(10)    NOT NULL,
  time   BIGINT         NOT NULL,
  open   NUMERIC(14, 4) NOT NULL,
  high   NUMERIC(14, 4) NOT NULL,
  low    NUMERIC(14, 4) NOT NULL,
  close  NUMERIC(14, 4) NOT NULL,
  UNIQUE (ticker, time)
);
```

Table is created automatically on startup if it doesn't exist.

## Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `DATABASE_URL` | **required** | PostgreSQL connection string, e.g. `postgresql://user:pass@host:5432/price_history_db` |
| `PORT` | `3001` | HTTP server port |

## Getting Started

### Local Development

```bash
npm install
DATABASE_URL=postgresql://broker:changeme@localhost:5432/price_history_db npm start
```

### Docker

```bash
docker build -t price-history-service .
docker run -p 3001:3001 -e DATABASE_URL=postgresql://... price-history-service
```

## Deployment

GitHub Actions CI/CD pushes to GHCR on push to `main`:
```
ghcr.io/lynx-spring-practice-team1/price-history-service:latest
```

The service retries the database connection up to 10 times (2-second intervals) before starting the HTTP server.
