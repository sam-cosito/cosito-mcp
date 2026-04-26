import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { listForms, } from "./db.js";
export function createMcpServer() {
    const server = new McpServer({ name: "cosito-mcp", version: "1.0.0" }, { instructions: "Always call a tool fresh for every question. Never answer from memory or prior results. Every value you state must be cited by field name from the current tool response. Counts must come from counting the actual returned array." });
    /*
      server.tool(
        "get_form",
        "Retrieve a single quality inspection form by its unique form_id. Returns the complete record: form metadata, truck_inspection, packaging_inspection, quantity, quality_assessment (with defects and AI comments), and qa_authorization.",
        { form_id: z.string().describe("Unique ID of the inspection form") },
        async ({ form_id }) => {
          const form = await getFormById(form_id);
          if (!form) {
            return {
              content: [{ type: "text", text: `No form found with ID '${form_id}'.` }],
              isError: true,
            };
          }
          return { content: [{ type: "text", text: JSON.stringify(form, null, 2) }] };
        }
      );
    
      server.tool(
        "list_forms",
        "List inspection forms with optional filters. Default response returns summaries with: form_id, client, inspection_date, inspection_time, po_number, inspector_name, product_name, items, origin, inspection_status. Pass include_full_data=true for the complete record including truck_inspection, packaging_inspection, quantity, quality_assessment, and qa_authorization. Use this to count receiving events, list POs, find forms by client/product/date/origin/inspection outcome, or browse results.",
        {
          client: z.string().optional().describe("Filter by client name — exact match (use list_clients to get valid names, e.g. 'Dole Fresh Fruit Company')"),
          item: z.string().optional().describe("Filter by product name — partial match (e.g. 'Pineapple')"),
          po_number: z.string().optional().describe("Filter by PO number — partial match (e.g. 'PO0034638')"),
          inspection_status: z.string().optional().describe("Filter by inspection outcome — exact match: 'Accept', 'Reject', or 'Further Review'"),
          origin: z.string().optional().describe("Filter by country of origin — partial match (e.g. 'Colombia', 'Mexico', 'Costa Rica')"),
          date_from: z.string().optional().describe("Earliest inspection date, inclusive (YYYY-MM-DD)"),
          date_to: z.string().optional().describe("Latest inspection date, inclusive (YYYY-MM-DD)"),
          limit: z.number().int().min(1).max(500).optional().default(50).describe("Maximum number of forms to return (default 50, max 500)"),
          include_full_data: z.boolean().optional().default(false).describe("Return full nested records instead of summaries. Default false."),
        },
        async ({ client, item, po_number, inspection_status, origin, date_from, date_to, limit, include_full_data }) => {
          const forms = await listForms({ client, item, po_number, inspection_status, origin, date_from, date_to, limit });
          const output = include_full_data ? forms : forms.map(toFormSummary);
          return {
            content: [{ type: "text", text: JSON.stringify({ count: output.length, forms: output }, null, 2) }],
          };
        }
      );
    
      server.tool(
        "get_quality_metrics",
        "Return quality assessment data across many forms for trend analysis and KPIs. Each result includes: form_id, client, inspection_date, po_number, product_name, origin, inspection_status, brix, product_temperature_f, pressure, defect_total_percentage, defects (breakdown by type), and ai_generated_comments. Use this for questions like 'average brix by month', 'rejection rate by origin', 'defect trends over Q1', or 'which POs had the highest decay'.",
        {
          client: z.string().optional().describe("Filter by client name — exact match (e.g. 'Dole Fresh Fruit Company')"),
          item: z.string().optional().describe("Filter by product name — partial match (e.g. 'Pineapple')"),
          inspection_status: z.string().optional().describe("Filter by outcome — exact match: 'Accept', 'Reject', or 'Further Review'"),
          origin: z.string().optional().describe("Filter by country of origin — partial match (e.g. 'Colombia', 'Mexico', 'Costa Rica')"),
          date_from: z.string().optional().describe("Earliest inspection date, inclusive (YYYY-MM-DD)"),
          date_to: z.string().optional().describe("Latest inspection date, inclusive (YYYY-MM-DD)"),
          limit: z.number().int().min(1).max(2000).optional().default(500).describe("Maximum number of forms to scan (default 500)"),
        },
        async ({ client, item, inspection_status, origin, date_from, date_to, limit }) => {
          const results = await getQualityMetrics({ client, item, inspection_status, origin, date_from, date_to, limit });
          return {
            content: [{ type: "text", text: JSON.stringify({ count: results.length, results }, null, 2) }],
          };
        }
      );
    
      server.tool(
        "list_clients",
        "Return a sorted list of all unique client names in the database. Use this before filtering by client to get the exact name required by list_forms and get_quality_metrics.",
        {},
        async () => {
          const clients = await listClients();
          return {
            content: [{ type: "text", text: JSON.stringify({ count: clients.length, clients }, null, 2) }],
          };
        }
      );
    */
    server.tool("list_all", "Fetch every inspection form in the database in a single call. Returns full records including truck_inspection, packaging_inspection, quantity, quality_assessment (with defects and AI comments), and qa_authorization. Use this for comprehensive analysis, cross-record counts, or any question that requires the complete dataset. Do not use filters — this always returns everything.", {}, async () => {
        const forms = await listForms({ limit: 500 });
        return {
            content: [{ type: "text", text: JSON.stringify({ count: forms.length, forms }, null, 2) }],
        };
    });
    // ── Prompts ────────────────────────────────────────────────────────────────
    const GROUND_RULES = `## Ground rules (always apply)
- ALWAYS call the relevant tool fresh for every question. Never answer from memory, prior tool results, or anything retrieved earlier in the conversation.
- NEVER estimate, infer, or extrapolate values. Every number, status, and field you state must come directly from the current tool response.
- Cite every claim. After each value you state, note the field it came from in parentheses, e.g. "1.39% (defect_total_percentage)" or "Rejected (inspection_status)".
- If the tool returns no results, say so explicitly. Do not fill gaps with assumptions.
- Counts must be derived by counting the actual returned array — never guess or recall a count.
- If a follow-up question refers to a PO or record mentioned earlier, re-query the database for it rather than reusing cached data.`;
    server.prompt("field-guide", "Maps everyday language to the correct Cosito field names and tools so queries always resolve correctly", () => ({
        messages: [{
                role: "user",
                content: {
                    type: "text",
                    text: `# Cosito Field & Tool Reference

${GROUND_RULES}

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
- **Full details on one specific shipment** → get_form (requires form_id from list_forms first)
- **Filtering by client** → always call list_clients first to get the exact name

## Filter behavior
- client: EXACT match — 'Dole' returns nothing; must be 'Dole Fresh Fruit Company'
- po_number, item, origin: partial, case-insensitive
- inspection_status: exactly 'Accept', 'Reject', or 'Further Review'
- For counts: always set limit=500 and count the returned array`,
                },
            }],
    }));
    server.prompt("rejection-analysis", "Guides a full rejection rate and defect breakdown analysis across any filter combination", {
        period: z.string().optional().describe("Time period to analyze, e.g. 'Q1 2026', 'March 2026'"),
        filter: z.string().optional().describe("Optional focus, e.g. 'Colombia', 'Pineapple', 'Dole'"),
    }, ({ period, filter }) => ({
        messages: [{
                role: "user",
                content: {
                    type: "text",
                    text: `Perform a rejection and defect analysis${period ? ` for ${period}` : ""}${filter ? ` filtered to ${filter}` : ""}.

${GROUND_RULES}

## Steps
1. Call get_quality_metrics fresh with appropriate date_from/date_to${filter ? " and relevant filter (origin/item/client)" : ""} and limit=500. Do not reuse any prior tool result.
2. From the raw response, calculate and cite each figure:
   - Total shipments (count of returned array)
   - Acceptance rate: count where inspection_status='Accept' ÷ total
   - Rejection rate: count where inspection_status='Reject' ÷ total
   - Further Review rate: count where inspection_status='Further Review' ÷ total
   - Average defect_total_percentage (skip nulls, cite field name)
   - Top defect types: for each defect field, count records where value > 0; rank by frequency
   - Average brix (skip nulls, cite field name)
3. Break down rejection rate by origin — count per country from the raw data
4. List every rejected PO with: po_number, defect_total_percentage, top defect fields (non-null/non-zero), ai_generated_comments
5. Summarize findings — flag patterns only if directly supported by the data above`,
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

${GROUND_RULES}

## Steps
1. Call list_forms(date_from="${date_from}", date_to="${date_to}", limit=500) — fresh query, do not reuse prior results.
2. Call get_quality_metrics(date_from="${date_from}", date_to="${date_to}", limit=500) — fresh query.
3. Build the report strictly from those two responses. Cite field names for every value.

## Report structure

**Summary**
- Total shipments received (count of list_forms array)
- By inspection_status: count each value
- By origin: count each value
- By client: count each value

**Shipment Log**
Table with columns: PO (po_number) | Date (inspection_date) | Client (client) | Product (product_name) | Origin (origin) | Inspector (inspector_name) | Status (inspection_status)
List every record returned — do not truncate.

**Quality Highlights**
- Average brix by origin (from get_quality_metrics, skip nulls)
- Average defect_total_percentage (from get_quality_metrics)
- All POs where defect_total_percentage > 0.10, with their exact value

**Rejected & Under Review**
For each PO where inspection_status is 'Reject' or 'Further Review':
- po_number, defect_total_percentage, non-zero defect fields with values, ai_generated_comments

**Observations**
Only include observations directly supported by the data above. Do not infer trends not present in the numbers.`,
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

${GROUND_RULES}

## Steps
1. Call list_forms(po_number="${po_number}", include_full_data=true) — fresh query.
2. If no result is returned, say "No record found for ${po_number}." and stop.
3. Present every field from the raw response, organized by section. Cite each field name.

## Sections to cover
- **Header**: client, product_name, origin, inspector_name, inspection_date, inspection_time, po_number
- **Truck Inspection**: all fields from truck_inspection with their exact values
- **Packaging Inspection**: all fields from packaging_inspection with their exact values
- **Quantity**: num_pallets, cases_per_pallet, total_cases, requested_count, actual_count, variancy
- **Quality Assessment**: inspection_status, brix, product_temperature_f, pressure, pack_date, cases_inspected, units_inspected, defect_total_percentage, all non-null defect fields with values
- **AI Comments**: ai_generated_comments verbatim
- **QA Authorization**: final_verification_pass, name, title, signature

End with a one-paragraph plain-language summary of the shipment condition, based only on the values above.`,
                },
            }],
    }));
    return server;
}
//# sourceMappingURL=server.js.map