import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand } from "@aws-sdk/lib-dynamodb";
import { data } from "./data.js";

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

console.log(`Seeding ${data.length} item(s) into ${TABLE_NAME}...`);

for (const item of data) {
  await docClient.send(new PutCommand({ TableName: TABLE_NAME, Item: item as Record<string, unknown> }));
  console.log(`  ✓ ${item.po_number} (${item.form_id})`);
}

console.log(`Done. ${data.length} record(s) written.`);