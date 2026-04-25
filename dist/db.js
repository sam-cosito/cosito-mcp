import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { getFormById, listForms, getQualityMetrics, listClients, toFormSummary, } from "./db.js";
export function createMcpServer() {
    const server = new McpServer({ name: "cosito-mcp", version: "1.0.0" });
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
    return server;
}
//# sourceMappingURL=db.js.map