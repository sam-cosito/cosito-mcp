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
    const { client, item, date_from, date_to, po_number, inspection_status, origin, limit = 50 } = filters;
    const fetchLimit = (item || po_number || inspection_status || origin) ? limit * 5 : limit;
    let raw;
    if (client) {
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
        raw = await paginateScan(docClient, {
            TableName: TABLE_NAME,
            FilterExpression: "entity_type = :et",
            ExpressionAttributeValues: { ":et": "FORM" },
        }, fetchLimit);
    }
    let forms = raw;
    if (item) {
        const needle = item.toLowerCase();
        forms = forms.filter((f) => f.items?.some((i) => i.toLowerCase().includes(needle)) ||
            f.product_name?.toLowerCase().includes(needle));
    }
    if (po_number) {
        const needle = po_number.toLowerCase();
        forms = forms.filter((f) => f.po_number?.toLowerCase().includes(needle));
    }
    if (inspection_status) {
        const needle = inspection_status.toLowerCase();
        forms = forms.filter((f) => f.quality_assessment?.inspection_status?.toLowerCase() === needle);
    }
    if (origin) {
        const needle = origin.toLowerCase();
        forms = forms.filter((f) => f.origin?.toLowerCase().includes(needle));
    }
    return forms.slice(0, limit);
}
export async function getQualityMetrics(filters) {
    const forms = await listForms({ ...filters, limit: filters.limit ?? 500 });
    return forms.map((f) => ({
        form_id: f.form_id,
        client: f.client,
        inspection_date: f.inspection_date,
        po_number: f.po_number,
        product_name: f.product_name,
        origin: f.origin,
        inspection_status: f.quality_assessment?.inspection_status,
        brix: f.quality_assessment?.brix,
        product_temperature_f: f.quality_assessment?.product_temperature_f,
        pressure: f.quality_assessment?.pressure,
        defect_total_percentage: f.quality_assessment?.defect_total_percentage,
        defects: f.quality_assessment?.defects,
        ai_generated_comments: f.quality_assessment?.ai_generated_comments,
    }));
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
        inspection_time: form.inspection_time,
        po_number: form.po_number,
        inspector_name: form.inspector_name,
        product_name: form.product_name,
        items: form.items,
        origin: form.origin,
        inspection_status: form.quality_assessment?.inspection_status,
    };
}
//# sourceMappingURL=db.js.map