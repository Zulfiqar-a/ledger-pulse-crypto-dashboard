# Dashboard data

This directory contains the historical cryptocurrency CSV files used by Ledger
Pulse. The current files come from Kaggle's [Cryptocurrency Historical Prices](https://www.kaggle.com/datasets/sudalairajkumar/cryptocurrency-historical-prices)
dataset.

## Current dataset

There are 23 coin files in this directory. The backend discovers every file with
a `.csv` extension when it starts, so all compatible files are loaded without
listing them in code.

## Expected columns

```text
SNo,Name,Symbol,Date,High,Low,Open,Close,Volume,Marketcap
```

## Add or replace data

1. Download and extract the Kaggle dataset.
2. Copy compatible `coin_*.csv` files into this directory.
3. Restart the backend from `backend/`:

   ```bash
   npm start
   ```

4. Confirm the result at `http://localhost:4000/api/health` or
   `http://localhost:4000/api/coins`.

If a source file uses different header names, update `COLUMN_MAP` in
`backend/server.js`. The data is historical and is intended for analysis and
demonstration, not financial advice.
