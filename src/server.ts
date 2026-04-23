import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import {
  getFormById,
  listForms,
  queryFieldValues,
  listClients,
  toFormSummary,
} from "./db.js";

export function createMcpServer(): McpServer {
  const server = new McpServer({ name: "cosito-mcp", version: "1.0.0" });

  server.tool(
    "get_form",
    "Retrieve a single quality inspection form by its unique ID. Returns the complete form including all sections, fields, and recorded answers.",
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
    "List inspection forms with optional filters. Returns form summaries by default; pass include_sections=true for full data. Use this to browse forms, find forms for a client or product, or look up forms within a date range.",
    {
      client: z.string().optional().describe("Filter by client name (case-insensitive partial match)"),
      item: z.string().optional().describe("Filter by item/product name (e.g. 'Pineapple Crownless')"),
      date_from: z.string().optional().describe("Earliest inspection date, inclusive (YYYY-MM-DD)"),
      date_to: z.string().optional().describe("Latest inspection date, inclusive (YYYY-MM-DD)"),
      limit: z.number().int().min(1).max(200).optional().default(20).describe("Maximum number of forms to return (default 20, max 200)"),
      include_sections: z.boolean().optional().default(false).describe("Include full sections/fields data (default false — summaries only)"),
    },
    async ({ client, item, date_from, date_to, limit, include_sections }) => {
      const forms = await listForms({ client, item, date_from, date_to, limit });
      const output = include_sections ? forms : forms.map(toFormSummary);
      return {
        content: [{ type: "text", text: JSON.stringify({ count: output.length, forms: output }, null, 2) }],
      };
    }
  );

  server.tool(
    "query_field_values",
    "Extract the recorded answer for a specific field_name across many inspection forms. Use this for comparisons and trend analysis — e.g. 'which month had the highest Total Quantity Received for Pineapple Crownless?' or 'how has Temperature changed over the past year?'. Returns an array of {form_id, inspection_date, client, items, section_name, field_name, input_type, answer, applies_to} records that Claude can sort, group, or aggregate.",
    {
      field_name: z.string().describe("Exact field name to extract (e.g. 'Total Quantity Received', 'Temperature (°F)', 'Decay count')"),
      client: z.string().optional().describe("Filter by client name"),
      item: z.string().optional().describe("Filter by item/product (e.g. 'Pineapple Crownless')"),
      section_name: z.string().optional().describe("Filter by section name (e.g. '1.- Quantity and Weight Inspection')"),
      date_from: z.string().optional().describe("Earliest inspection date, inclusive (YYYY-MM-DD)"),
      date_to: z.string().optional().describe("Latest inspection date, inclusive (YYYY-MM-DD)"),
      limit: z.number().int().min(1).max(2000).optional().default(500).describe("Maximum number of forms to scan (default 500)"),
    },
    async ({ field_name, client, item, section_name, date_from, date_to, limit }) => {
      const results = await queryFieldValues(field_name, { client, item, section_name, date_from, date_to, limit });
      return {
        content: [{ type: "text", text: JSON.stringify({ count: results.length, field_name, results }, null, 2) }],
      };
    }
  );

  server.tool(
    "list_clients",
    "Return a sorted list of all unique client names present in the database. Useful for discovery before filtering by client.",
    {},
    async () => {
      const clients = await listClients();
      return {
        content: [{ type: "text", text: JSON.stringify({ count: clients.length, clients }, null, 2) }],
      };
    }
  );

  return server;
}
