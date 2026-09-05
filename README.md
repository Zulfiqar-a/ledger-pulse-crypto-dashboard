# Ledger Pulse

Ledger Pulse is a full-stack cryptocurrency market dashboard. It reads historical
OHLCV data from CSV files, serves the data through an Express API, and presents
interactive charts and market summaries in a React frontend.

## Data source

The project uses the Kaggle dataset [Cryptocurrency Historical Prices](https://www.kaggle.com/datasets/sudalairajkumar/cryptocurrency-historical-prices).
The current `backend/data/` directory contains 23 CSV files from that dataset,
including Bitcoin, Ethereum, Solana, XRP, Dogecoin, and other assets.

The dataset is historical market data for analysis and demonstration. It is not
live market data and should not be used as financial advice.

## Features

- Loads every `.csv` file in `backend/data/` automatically at backend startup.
- Supports CSV fields with quoted values and commas.
- Provides coin selection, time-range filters, price history, market-cap share,
  trading volume, percentage change, and top-performer summaries.
- The `All` range uses the complete available history for each coin.
- Adding another compatible CSV requires no code changes; restart the backend
  after adding the file.

## Project structure

```text
crypto-dashboard/
├── backend/
│   ├── data/                 # Kaggle cryptocurrency CSV files
│   ├── package.json
│   └── server.js             # Express API and CSV loader
├── frontend/
│   ├── public/index.html
│   ├── src/CryptoDashboard.jsx
│   ├── src/index.js
│   └── package.json
└── README.md
```

## Requirements

- Node.js 18 or newer
- npm

## Run locally

Open two terminals from the project root.

### Backend

```bash
cd backend
npm install
npm start
```

The API runs at `http://localhost:4000`.

### Frontend

```bash
cd frontend
npm install
npm start
```

The dashboard runs at `http://localhost:3000` and proxies API requests to the
backend.

## API endpoints

| Endpoint | Description |
| --- | --- |
| `GET /api/health` | Backend status and loaded coin count |
| `GET /api/coins` | Loaded coins and history point counts |
| `GET /api/history?symbol=BTC&days=30` | Historical OHLCV data for one coin |
| `GET /api/summary?days=30` | Latest values, changes, volume, and chart series |

Use `days=0` for the complete available history.

## CSV format

The loader expects these Kaggle column names:

```text
SNo,Name,Symbol,Date,High,Low,Open,Close,Volume,Marketcap
```

Place compatible files in `backend/data/` and restart the backend. Column aliases
can be configured in `COLUMN_MAP` in `backend/server.js`.

## License and attribution

This application code is provided for educational and portfolio use. The
historical dataset is provided by its Kaggle publisher and remains subject to
Kaggle's dataset terms and attribution requirements.
