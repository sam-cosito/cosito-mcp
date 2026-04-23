# cosito-mcp

MCP server that gives Claude access to Cosito quality inspection and inventory data stored in AWS DynamoDB.

## Tools

| Tool | Description |
|------|-------------|
| `get_form` | Fetch a single inspection form by ID |
| `list_forms` | Browse forms with filters (client, product, date range) |
| `query_field_values` | Extract one field's answers across many forms — enables cross-form comparison and trend analysis |
| `list_clients` | List all client names in the database |

### Example queries Claude can answer

- *"In what month did we receive the greatest batch of Pineapple Crownless?"*
  → `query_field_values("Total Quantity Received", item="Pineapple Crownless")` then group by month and find the max.

- *"Show me all forms for Latin Specialties in Q1 2026."*
  → `list_forms(client="Latin Specialties", date_from="2026-01-01", date_to="2026-03-31")`

- *"What was the average temperature on receipt for Green Beans last year?"*
  → `query_field_values("Temperature (°F)", item="Green Beans", date_from="2025-01-01", date_to="2025-12-31")` then average the answers.

---

## Setup

### 1. Install and build

```bash
npm install
npm run build
