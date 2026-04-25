import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { getFormById, listForms, getQualityMetrics, listClients, toFormSummary, } from "./db.js";
export function createMcpServer() {
    const server = new McpServer({ name: "cosito-mcp", version: "1.0.0" });
    // ── Tools ──────────────────────────────────────────────────────────────────
    server.tool("get_form", "Retrieve a single quality inspection form by its unique form_id. Returns the complete record: form metadata, truck_inspection, packaging_inspection, quantity, quality_assessment (with defects and AI comments), and qa_authorization.", { form_id: z.string().describe("Unique ID of the inspection form") }, async ({ form_id }) => {
        const form = await getFormById(form_id);
        if (!form) {
            return {
                content: [{ type: "text", text: `No form found with ID '${form_id}'.` }],
                isError: true,
            };
        }
        return { content: [{ type: "text", text: JSON.stringify(form, null, 2) }] };
    });
    server.tool("list_forms", "List inspection forms with optional filters. Default response returns summaries with: form_id, client, inspection_date, inspection_time, po_number, inspector_name, product_name, items, origin, inspection_status. Pass include_full_data=true for the complete record including truck_inspection, packaging_inspection, quantity, quality_assessment, and qa_authorization. Use this to count receiving events, list POs, find forms by client/product/date/origin/inspection outcome, or browse results.", {
        client: z.string().optional().describe("Filter by client name — exact match (use list_clients to get valid names, e.g. 'Dole Fresh Fruit Company')"),
        item: z.string().optional().describe("Filter by product name — partial match (e.g. 'Pineapple')"),
        po_number: z.string().optional().describe("Filter by PO number — partial match (e.g. 'PO0034638')"),
        inspection_status: z.string().optional().describe("Filter by inspection outcome — exact match: 'Accept', 'Reject', or 'Further Review'"),
        origin: z.string().optional().describe("Filter by country of origin — partial match (e.g. 'Colombia', 'Mexico', 'Costa Rica')"),
        date_from: z.string().optional().describe("Earliest inspection date, inclusive (YYYY-MM-DD)"),
        date_to: z.string().optional().describe("Latest inspection date, inclusive (YYYY-MM-DD)"),
        limit: z.number().int().min(1).max(500).optional().default(50).describe("Maximum number of forms to return (default 50, max 500)"),
        include_full_data: z.boolean().optional().default(false).describe("Return full nested records instead of summaries. Default false."),
    }, async ({ client, item, po_number, inspection_status, origin, date_from, date_to, limit, include_full_data }) => {
        const forms = await listForms({ client, item, po_number, inspection_status, origin, date_from, date_to, limit });
        const output = include_full_data ? forms : forms.map(toFormSummary);
        return {
            content: [{ type: "text", text: JSON.stringify({ count: output.length, forms: output }, null, 2) }],
        };
    });
    server.tool("get_quality_metrics", "Return quality assessment data across many forms for trend analysis and KPIs. Each result includes: form_id, client, inspection_date, po_number, product_name, origin, inspection_status, brix, product_temperature_f, pressure, defect_total_percentage, defects (breakdown by type), and ai_generated_comments. Use this for questions like 'average brix by month', 'rejection rate by origin', 'defect trends over Q1', or 'which POs had the highest decay'.", {
        client: z.string().optional().describe("Filter by client name — exact match (e.g. 'Dole Fresh Fruit Company')"),
        item: z.string().optional().describe("Filter by product name — partial match (e.g. 'Pineapple')"),
        inspection_status: z.string().optional().describe("Filter by outcome — exact match: 'Accept', 'Reject', or 'Further Review'"),
        origin: z.string().optional().describe("Filter by country of origin — partial match (e.g. 'Colombia', 'Mexico', 'Costa Rica')"),
        date_from: z.string().optional().describe("Earliest inspection date, inclusive (YYYY-MM-DD)"),
        date_to: z.string().optional().describe("Latest inspection date, inclusive (YYYY-MM-DD)"),
        limit: z.number().int().min(1).max(2000).optional().default(500).describe("Maximum number of forms to scan (default 500)"),
    }, async ({ client, item, inspection_status, origin, date_from, date_to, limit }) => {
        const results = await getQualityMetrics({ client, item, inspection_status, origin, date_from, date_to, limit });
        return {
            content: [{ type: "text", text: JSON.stringify({ count: results.length, results }, null, 2) }],
        };
    });
    server.tool("list_clients", "Return a sorted list of all unique client names in the database. Use this before filtering by client to get the exact name required by list_forms and get_quality_metrics.", {}, async () => {
        const clients = await listClients();
        return {
            content: [{ type: "text", text: JSON.stringify({ count: clients.length, clients }, null, 2) }],
        };
    });
    // ── Prompts ────────────────────────────────────────────────────────────────
    server.prompt("field-guide", "Maps everyday language to the correct Cosito field names and tools so queries always resolve correctly", () => ({
        messages: [{
                role: "user",
                content: {
                    type: "text",
                    text: `# Cosito Field & Tool Reference

## Field name aliases
| What the user says | Field to use | Tool parameter |
|---|---|---|
| PO, PO number, purchase order, order | po_number | po_number (partial match) |
| client, customer, buyer, shipper, company | client | client (exact — call list_clients first) |
| product, item, fruit, commodity | product_name / items | item (partial match) |
| country, origin, from, source | origin | origin (partial match) |
| status, result, outcome, pass/fail | inspection_status | inspection_status (exact: 'Accept', 'Reject', 'Further Review') |
| inspector, who inspected | inspector_name | returned in summary, no direct filter |
| date, when, received | inspection_date | date_from / date_to (YYYY-MM-DD) |
| brix, sugar, sweetness | brix | returned by get_quality_metrics |
| temp, temperature | product_temperature_f | returned by get_quality_metrics |
| defects, damage, decay, mold, bruising | defects / defect_total_percentage | returned by get_quality_metrics |

## Which tool to use
- **Counting shipments / listing POs / finding forms** → list_forms
- **Quality analysis, KPIs, averages, trends, defect breakdown** → get_quality_metrics
- **Full details on one specific shipment** → get_form (requires form_id)
- **Filtering by client** → always call list_clients first to get the exact name

## Important rules
- client filter is EXACT match — 'Dole' will return nothing; use 'Dole Fresh Fruit Company'
- For "how many" questions, set limit=500 and count the returned results
- po_number, item, and origin are partial/case-insensitive — passing 'Colombia' will match 'Colombia'
- inspection_status must be exactly 'Accept', 'Reject', or 'Further Review'`,
                },
            }],
    }));
    server.prompt("rejection-analysis", "Guides a full rejection rate and defect breakdown analysis across any filter combination", {
        period: z.string().optional().describe("Time period to analyze, e.g. 'Q1 2026', 'March 2026', 'last 30 days'"),
        filter: z.string().optional().describe("Optional focus, e.g. 'Colombia', 'Pineapple', 'Dole'"),
    }, ({ period, filter }) => ({
        messages: [{
                role: "user",
                content: {
                    type: "text",
                    text: `Perform a rejection and defect analysis${period ? ` for ${period}` : ""}${filter ? ` filtered to ${filter}` : ""}.

Steps:
1. Call get_quality_metrics with appropriate date_from/date_to${filter ? " and relevant filter (origin/item/client)" : ""} and limit=500
2. Calculate:
   - Total shipments
   - Acceptance rate (Accept / total)
   - Rejection rate (Reject / total)
   - Further Review rate
   - Average defect_total_percentage across all forms
   - Top 3 defect types by frequency (count how many forms had a non-null, non-zero value for each defect field)
   - Average brix (skip nulls)
3. Break down rejection rate by origin country
4. List the POs that were rejected with their defect percentages and AI comments
5. Summarize findings and flag any patterns worth attention`,
                },
            }],
    }));
    server.prompt("receiving-report", "Generates a structured receiving summary for a given date range", {
        date_from: z.string().describe("Start date (YYYY-MM-DD)"),
        date_to: z.string().describe("End date (YYYY-MM-DD)"),
    }, ({ date_from, date_to }) => ({
        messages: [{
                role: "user",
                content: {
                    type: "text",
                    text: `Generate a receiving report from ${date_from} to ${date_to}.

Steps:
1. Call list_forms(date_from="${date_from}", date_to="${date_to}", limit=500) to get all shipments in range
2. Call get_quality_metrics(date_from="${date_from}", date_to="${date_to}", limit=500) for quality data
3. Produce a report with these sections:

**Summary**
- Total shipments received
- Breakdown by inspection status (Accept / Reject / Further Review)
- Breakdown by origin country
- Breakdown by client

**Shipment Log** (table: PO | Date | Client | Product | Origin | Inspector | Status)

**Quality Highlights**
- Average brix (by origin if more than one country)
- Average defect percentage
- Any shipments with defect_total_percentage > 10%

**Rejected & Under Review**
- List each rejected/further-review PO with defect summary and AI comments

**Observations**
- Flag any recurring defect types, origin patterns, or quality trends`,
                },
            }],
    }));
    server.prompt("po-lookup", "Looks up everything known about a specific PO number", {
        po_number: z.string().describe("The PO number to look up, e.g. 'PO0034645'"),
    }, ({ po_number }) => ({
        messages: [{
                role: "user",
                content: {
                    type: "text",
                    text: `Look up all available information for PO number ${po_number}.

Steps:
1. Call list_forms(po_number="${po_number}", include_full_data=true)
2. Present the full record including:
   - Client, product, origin, inspector, date and time
   - Truck inspection results (temperature, cleanliness, seal, documentation)
   - Packaging inspection results
   - Quantity (pallets, cases, variance)
   - Quality assessment (brix, temperature, pressure, defect breakdown, total defect %, status)
   - AI-generated comments
   - QA authorization
3. Summarize the overall condition of the shipment in plain language`,
                },
            }],
    }));
    return server;
}
//# sourceMappingURL=server.js.map