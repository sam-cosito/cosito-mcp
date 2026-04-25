# cosito-mcp

MCP server that gives Claude access to Cosito quality inspection data stored in AWS DynamoDB.

## Tools

| Tool | Description |
|------|-------------|
| `get_form` | Fetch a single inspection form by its `form_id` |
| `list_forms` | List forms with filters — client, product, date range, origin, inspection outcome |
| `get_quality_metrics` | Extract quality data (brix, temperature, defects, AI comments) across many forms for trend analysis |
| `list_clients` | List all unique client names in the database |

### Example queries Claude can answer

- *"How many receiving events did we have in March 2026?"*
  → `list_forms(date_from="2026-03-01", date_to="2026-03-31", limit=500)`

- *"Which POs came from Colombia?"*
  → `list_forms(origin="Colombia", limit=500)`

- *"What was the rejection rate for pineapple in Q1 2026?"*
  → `get_quality_metrics(item="Pineapple", date_from="2026-01-01", date_to="2026-03-31")`

- *"Show me all accepted forms for Dole in April."*
  → `list_forms(client="Dole Fresh Fruit Company", inspection_status="Accept", date_from="2026-04-01", date_to="2026-04-30")`

- *"What's the average brix by origin country?"*
  → `get_quality_metrics(limit=500)` then group by `origin` and average `brix`

---

## Setup

### 1. Install and build

```bash
npm install
npm run build
```

### 2. Seed DynamoDB

```bash
DYNAMODB_TABLE=cosito-inspection-forms AWS_REGION=us-east-1 npx tsx scripts/seed.ts
```

This loads all records from `sample-data.json` into the table. The table must already exist with the GSIs defined in `SCHEMA.md`.

### 3. Run locally

```bash
node dist/index.js
```

### Environment variables

| Variable | Required | Description |
|----------|----------|-------------|
| `DYNAMODB_TABLE` | Yes | DynamoDB table name (default: `cosito-inspection-forms`) |
| `AWS_REGION` | Yes | AWS region (default: `us-east-1`) |
| `AWS_ACCESS_KEY_ID` | For IAM auth | AWS access key |
| `AWS_SECRET_ACCESS_KEY` | For IAM auth | AWS secret key |
| `COGNITO_SECRET_NAME` | For Cognito auth | Secrets Manager secret name containing Cognito credentials |

See `src/auth.ts` for full authentication configuration.