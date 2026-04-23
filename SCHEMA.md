# DynamoDB Table Schema

## Table: `cosito-inspection-forms`

### Primary Key
| Attribute | Type | Role |
|-----------|------|------|
| `form_id` | String | Partition key (UUID) |

### Item Attributes
| Attribute | Type | Description |
|-----------|------|-------------|
| `form_id` | String | Unique form UUID |
| `entity_type` | String | Always "FORM" — used by the DateIndex GSI |
| `client` | String | Client name (e.g. "Latin Specialties LLC") |
| `inspection_date` | String | YYYY-MM-DD — the date recorded in the "Inspection date" field |
| `created_at` | String | ISO 8601 timestamp of when the record was written |
| `status` | String | Optional: "draft" or "completed" |
| `items` | List<String> | Products in this form (e.g. ["Pineapple Crownless", "Green Beans (Ejotes)"]) |
| `sections` | List<Map> | Full form data — see structure below |

### `sections` structure
{
  "name": "Section name",
  "subtitle": "Section subtitle",
  "rows": [
    {
      "field_name": "Field label",
      "input_type": "NUMBER | FREE TEXT | DATE | ...",
      "required": true,
      "answer": "Recorded value",
      "notes": "Inspector notes",
      "applies_to": ["Product A", "Product B"]
    }
  ]
}

---

## Required GSIs

### GSI 1 — ClientDateIndex
Enables fast lookups of all forms for a given client, optionally filtered by date range.

| Attribute | Role |
|-----------|------|
| `client` | Partition key (HASH) |
| `inspection_date` | Sort key (RANGE) |

Projection: ALL

### GSI 2 — DateIndex
Enables date-range queries across all clients.

| Attribute | Role |
|-----------|------|
| `entity_type` | Partition key (HASH) |
| `inspection_date` | Sort key (RANGE) |

Projection: ALL

---

## Example Item

{
  "form_id": "f3a2c1b0-1234-5678-abcd-ef0123456789",
  "entity_type": "FORM",
  "client": "Latin Specialties LLC",
  "inspection_date": "2026-04-16",
  "created_at": "2026-04-16T09:56:00Z",
  "status": "completed",
  "items": ["Pineapple Crownless", "Green Beans (Ejotes)", "Prickly Pear (Tuna)"],
  "sections": [ ... ]
}
