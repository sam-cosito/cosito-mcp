import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand, QueryCommand, ScanCommand, } from "@aws-sdk/lib-dynamodb";
import { getAwsCredentials } from "./auth.js";
const TABLE_NAME = process.env.DYNAMODB_TABLE || "cosito-inspection-forms";
const REGION = process.env.AWS_REGION || "us-east-1";
async function getDocClient() {
    const credentials = await getAwsCredentials();
    const dynamo = new DynamoDBClient({ region: REGION, credentials });
    return DynamoDBDocumentClient.from(dynamo, {
        marshallOptions: { removeUndefinedValues: true },
    });
}
async function paginateQuery(docClient, params, maxItems) {
    const items = [];
    let lastKey;
    do {
        const response = await docClient.send(new QueryCommand({ ...params, ExclusiveStartKey: lastKey }));
        items.push(...(response.Items ?? []));
        lastKey = response.LastEvaluatedKey;
    } while (lastKey && items.length < maxItems);
    return items.slice(0, maxItems);
}
async function paginateScan(docClient, params, maxItems) {
    const items = [];
    let lastKey;
    do {
        const response = await docClient.send(new ScanCommand({ ...params, ExclusiveStartKey: lastKey }));
        items.push(...(response.Items ?? []));
        lastKey = response.LastEvaluatedKey;
    } while (lastKey && items.length < maxItems);
    return items.slice(0, maxItems);
}
export async function getFormById(formId) {
    const docClient = await getDocClient();
    const response = await docClient.send(new GetCommand({ TableName: TABLE_NAME, Key: { form_id: formId } }));
    return response.Item ?? null;
}
export async function listForms(filters) {
    const docClient = await getDocClient();
    const { client, item, date_from, date_to, limit = 50 } = filters;
    const fetchLimit = item ? limit * 5 : limit;
    let raw;
    if (client) {
        // ClientDateIndex GSI: client (PK) + inspection_date (SK)
        const params = {
            TableName: TABLE_NAME,
            IndexName: "ClientDateIndex",
            KeyConditionExpression: "client = :client",
            ExpressionAttributeValues: { ":client": client },
        };
        if (date_from && date_to) {
            params.KeyConditionExpression += " AND inspection_date BETWEEN :from AND :to";
            params.ExpressionAttributeValues[":from"] = date_from;
            params.ExpressionAttributeValues[":to"] = date_to;
        }
        else if (date_from) {
            params.KeyConditionExpression += " AND inspection_date >= :from";
            params.ExpressionAttributeValues[":from"] = date_from;
        }
        else if (date_to) {
            params.KeyConditionExpression += " AND inspection_date <= :to";
            params.ExpressionAttributeValues[":to"] = date_to;
        }
        raw = await paginateQuery(docClient, params, fetchLimit);
    }
    else if (date_from || date_to) {
        // DateIndex GSI: entity_type (PK) = "FORM" + inspection_date (SK)
        const params = {
            TableName: TABLE_NAME,
            IndexName: "DateIndex",
            KeyConditionExpression: "entity_type = :et",
            ExpressionAttributeValues: { ":et": "FORM" },
        };
        if (date_from && date_to) {
            params.KeyConditionExpression += " AND inspection_date BETWEEN :from AND :to";
            params.ExpressionAttributeValues[":from"] = date_from;
            params.ExpressionAttributeValues[":to"] = date_to;
        }
        else if (date_from) {
            params.KeyConditionExpression += " AND inspection_date >= :from";
            params.ExpressionAttributeValues[":from"] = date_from;
        }
        else if (date_to) {
            params.KeyConditionExpression += " AND inspection_date <= :to";
            params.ExpressionAttributeValues[":to"] = date_to;
        }
        raw = await paginateQuery(docClient, params, fetchLimit);
    }
    else {
        // No indexed filters — scan the table
        raw = await paginateScan(docClient, {
            TableName: TABLE_NAME,
            FilterExpression: "entity_type = :et",
            ExpressionAttributeValues: { ":et": "FORM" },
        }, fetchLimit);
    }
    let forms = raw;
    if (item) {
        const needle = item.toLowerCase();
        forms = forms.filter((f) => f.items?.some((i) => i.toLowerCase().includes(needle)));
    }
    return forms.slice(0, limit);
}
// Returns one result row per matching field per form, enabling cross-form comparison
export async function queryFieldValues(fieldName, filters) {
    const forms = await listForms({ ...filters, limit: filters.limit ?? 500 });
    const needle = fieldName.toLowerCase();
    const sectionNeedle = filters.section_name?.toLowerCase();
    const results = [];
    for (const form of forms) {
        for (const section of form.sections ?? []) {
            if (sectionNeedle && !section.name.toLowerCase().includes(sectionNeedle)) {
                continue;
            }
            for (const row of section.rows ?? []) {
                if (row.field_name.toLowerCase() !== needle)
                    continue;
                const itemNeedle = filters.item?.toLowerCase();
                const appliesToItem = !itemNeedle ||
                    !row.applies_to?.length ||
                    row.applies_to.some((a) => a.toLowerCase().includes(itemNeedle));
                if (appliesToItem) {
                    results.push({
                        form_id: form.form_id,
                        client: form.client,
                        inspection_date: form.inspection_date,
                        items: form.items,
                        section_name: section.name,
                        field_name: row.field_name,
                        input_type: row.input_type,
                        answer: row.answer,
                        applies_to: row.applies_to,
                    });
                }
            }
        }
    }
    return results;
}
export async function listClients() {
    const docClient = await getDocClient();
    const raw = await paginateScan(docClient, {
        TableName: TABLE_NAME,
        FilterExpression: "entity_type = :et",
        ExpressionAttributeValues: { ":et": "FORM" },
        ProjectionExpression: "client",
    }, 10000);
    const unique = [...new Set(raw.map((r) => r["client"]).filter(Boolean))];
    return unique.sort();
}
export function toFormSummary(form) {
    return {
        form_id: form.form_id,
        client: form.client,
        inspection_date: form.inspection_date,
        items: form.items,
        status: form.status,
        created_at: form.created_at,
    };
}
//# sourceMappingURL=db.js.map