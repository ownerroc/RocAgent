# Database Tools

Koneksi ke Snowflake dan Neon untuk analytics dan storage.

## Installation

```bash
npm install snowflake-sdk pg dotenv
```

## Konfigurasi

Copy `.env.example` ke `.env` dan isi kredensial:

```bash
cp .env.example ../.env
```

## Usage

### Test Koneksi
```bash
node db-connector.cjs
```

### Snowflake (Natural Language)
```bash
node query-snowflake.cjs "Berapa total tool minggu ini?"
```

### Neon (SQL Direct)
```bash
node query-neon.cjs "SELECT * FROM users LIMIT 10"
```

## Output Format

```json
{
  "rows": [...],
  "rowCount": 10,
  "fields": [...]
}
```