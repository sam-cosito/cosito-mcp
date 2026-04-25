import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand } from "@aws-sdk/lib-dynamodb";
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const TABLE_NAME = process.env.DYNAMODB_TABLE;
const REGION = process.env.AWS_REGION || "us-east-1";

if (!TABLE_NAME) {
  console.error("Error: DYNAMODB_TABLE environment variable is required.");
  process.exit(1);
}

const dynamo = new DynamoDBClient({ region: REGION });
const docClient = DynamoDBDocumentClient.from(dynamo, {
  marshallOptions: { removeUndefinedValues: true },
});

const filePath = process.argv[2] ?? resolve(__dirname, "../sample-data.json");
const data = JSON.parse(readFileSync(filePath, "utf-8"));
const items: Record<string, unknown>[] = Array.isArray(data) ? data : [data];

console.log(`Seeding ${items.length} item(s) into ${TABLE_NAME}...`);

for (const item of items) {
  await docClient.send(new PutCommand({ TableName: TABLE_NAME, Item: item }));
  console.log(`  ✓ ${item["form_id"]} (${item["po_number"]})`);
}

console.log(`Done. ${items.length} record(s) written.`);