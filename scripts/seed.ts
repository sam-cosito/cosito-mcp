import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand } from "@aws-sdk/lib-dynamodb";
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const TABLE_NAME = process.env.DYNAMODB_TABLE;
const REGION = process.env.AWS_REGION;

const dynamo = new DynamoDBClient({ region: REGION });
const docClient = DynamoDBDocumentClient.from(dynamo, {
  marshallOptions: { removeUndefinedValues: true },
});

const filePath = process.argv[2] ?? resolve(__dirname, "../sample-data.json");
const item = JSON.parse(readFileSync(filePath, "utf-8"));

console.log(`Seeding item ${item.form_id} into ${TABLE_NAME}...`);
await docClient.send(new PutCommand({ TableName: TABLE_NAME, Item: item }));
console.log("Done.");
