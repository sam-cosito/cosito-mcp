# DynamoDB Table Schema

## Table: `cosito-inspection-forms`

### Primary Key
| Attribute | Type | Role |
|-----------|------|------|
| `form_id` | String | Partition key (UUID) |

### Top-Level Attributes
| Attribute | Type | Description |
|-----------|------|-------------|
| `form_id` | String | Unique form UUID |
| `entity_type` | String | Always `"FORM"` — required by DateIndex GSI |
| `client` | String | Client/shipper name (e.g. `"Dole Fresh Fruit Company"`) |
| `items` | List\<String\> | Products in this form (e.g. `["Pineapple Crownless"]`) |
| `inspection_date` | String | YYYY-MM-DD |
| `inspection_time` | String | HH:MM (24-hour) |
| `po_number` | String | Purchase order number (e.g. `"PO0034638"`) |
| `inspector_name` | String | Name(s) of inspector(s) |
| `shipper` | String | Shipper name (same as client in current data) |
| `brand` | String | Brand name |
| `product_name` | String | Primary product name |
| `origin` | String | Country of origin (e.g. `"Costa Rica"`, `"Mexico"`, `"Colombia"`) |
| `truck_inspection` | Map | See structure below |
| `packaging_inspection` | Map | See structure below |
| `quantity` | Map | See structure below |
| `quality_assessment` | Map | See structure below |
| `qa_authorization` | Map | See structure below |

---

### `truck_inspection`
| Field | Type |
|-------|------|
| `clean_interior_exterior` | String (`"Pass"` / `"Fail"`) |
| `no_unusual_odors` | String (`"Pass"` / `"Fail"`) |
| `security_seal` | String (`"Lock"` / `"Unlocked"`) |
| `no_mold_dirt_contamination` | String (`"Pass"` / `"Fail"`) |
| `no_pests_insects` | String (`"Pass"` / `"Fail"`) |
| `documentation_complete` | String (`"Pass"` / `"Fail"`) |
| `truck_temperature_f` | Number |
| `comments` | String |

### `packaging_inspection`
| Field | Type |
|-------|------|
| `packaging_integrity` | String (`"Pass"` / `"Fail"`) |
| `labeling` | String (`"Pass"` / `"Fail"`) |
| `hygienic_conditions` | String (`"Pass"` / `"Fail"`) |
| `packaging_type` | String (`"Cardboard"` / `"Wood"`) |
| `comments` | String |

### `quantity`
| Field | Type |
|-------|------|
| `num_pallets` | Number |
| `cases_per_pallet` | Number |
| `total_cases` | Number |
| `requested_count` | Number |
| `actual_count` | Number |
| `variancy` | Number (positive = short, negative = over) |

### `quality_assessment`
| Field | Type |
|-------|------|
| `pack_date` | String (YYYY-MM-DD) or null |
| `inspection_status` | String (`"Accept"` / `"Reject"` / `"Further Review"`) |
| `product_temperature_f` | String (e.g. `"46.8f"`) or null |
| `pressure` | Number or null |
| `brix` | Number or null |
| `cases_inspected` | Number |
| `units_inspected` | Number |
| `defects` | Map — see defect fields below |
| `defect_total_percentage` | Number (e.g. `0.035` = 3.5%) |
| `ai_generated_comments` | String |

#### `defects` fields (all `Number | null`)
`mechanical_damage`, `cracks`, `splits`, `bruising`, `blistering`, `pitting`,
`shriveling`, `insect_damage`, `decay`, `mold`, `rusting`, `water_damage`,
`scarring`, `color_issue`, `size_issue`, `stem_issue`, `tip_issue`, `other`

### `qa_authorization`
| Field | Type |
|-------|------|
| `final_verification_pass` | Boolean |
| `name` | String |
| `title` | String |
| `signature` | String |

---

## Required GSIs

### GSI 1 — ClientDateIndex
Fast lookups by client, optionally filtered by date range.

| Attribute | Role |
|-----------|------|
| `client` | Partition key (HASH) |
| `inspection_date` | Sort key (RANGE) |

Projection: ALL

### GSI 2 — DateIndex
Date-range queries across all clients.

| Attribute | Role |
|-----------|------|
| `entity_type` | Partition key (HASH) |
| `inspection_date` | Sort key (RANGE) |

Projection: ALL

---

## Example Item

```json
{
  "form_id": "07c56481-4c06-4751-b9f0-bd3862c0e995",
  "entity_type": "FORM",
  "client": "Dole Fresh Fruit Company",
  "items": ["Pineapple Crownless"],
  "inspection_date": "2026-02-25",
  "inspection_time": "09:56",
  "po_number": "PO0034638",
  "inspector_name": "Cinthya",
  "shipper": "Dole Fresh Fruit Company",
  "brand": "Dole Fresh Fruit Company",
  "product_name": "Pineapple Crownless",
  "origin": "Costa Rica",
  "truck_inspection": {
    "clean_interior_exterior": "Pass",
    "no_unusual_odors": "Pass",
    "security_seal": "Lock",
    "no_mold_dirt_contamination": "Pass",
    "no_pests_insects": "Pass",
    "documentation_complete": "Pass",
    "truck_temperature_f": 40.9,
    "comments": "N/A"
  },
  "packaging_inspection": {
    "packaging_integrity": "Pass",
    "labeling": "Pass",
    "hygienic_conditions": "Pass",
    "packaging_type": "Cardboard",
    "comments": "N/A"
  },
  "quantity": {
    "num_pallets": 10,
    "cases_per_pallet": 65,
    "total_cases": 650,
    "requested_count": 7,
    "actual_count": 7,
    "variancy": 0
  },
  "quality_assessment": {
    "pack_date": null,
    "inspection_status": "Accept",
    "product_temperature_f": "40.9f",
    "pressure": null,
    "brix": 12.3,
    "cases_inspected": 20,
    "units_inspected": 140,
    "defects": {
      "mechanical_damage": 4,
      "cracks": null,
      "bruising": 2,
      "decay": null,
      "other": null
    },
    "defect_total_percentage": 0.01071,
    "ai_generated_comments": "Clean receipt. Product approved for processing."
  },
  "qa_authorization": {
    "final_verification_pass": true,
    "name": "Christian Suarez",
    "title": "Quality Assurance Manager",
    "signature": "C.S"
  }
}
```