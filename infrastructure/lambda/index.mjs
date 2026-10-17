import { randomUUID } from 'node:crypto';
import { createRequire } from 'node:module';
import { DynamoDBClient, GetItemCommand, PutItemCommand, QueryCommand } from '@aws-sdk/client-dynamodb';
const require = createRequire(import.meta.url);
const { createGuestHandler } = require('./infrastructure/lambda/guestHandler.js');
const client = new DynamoDBClient({});
const TableName = process.env.TABLE_NAME;
if (!TableName) throw new Error('TABLE_NAME is required.');
function storeForPartition(partition) {
const pk = { S: partition };
return {
  async get(key) {
    const result = await client.send(new GetItemCommand({ TableName, Key: { pk, sk: { S: key } }, ConsistentRead: true }));
    return result.Item?.payload?.S ? JSON.parse(result.Item.payload.S) : null;
  },
  async put(key, value) {
    await client.send(new PutItemCommand({ TableName, Item: { pk, sk: { S: key }, payload: { S: JSON.stringify(value) } } }));
  },
  async putIfAbsent(key, value) {
    try {
      await client.send(new PutItemCommand({ TableName, Item: { pk, sk: { S: key }, payload: { S: JSON.stringify(value) } }, ConditionExpression: 'attribute_not_exists(pk) AND attribute_not_exists(sk)' }));
      return true;
    } catch (error) {
      if (error.name === 'ConditionalCheckFailedException') return false;
      throw error;
    }
  },
  async list(prefix, limit) {
    const rows = [];
    let ExclusiveStartKey;
    do {
      const page = await client.send(new QueryCommand({ TableName, KeyConditionExpression: 'pk = :pk AND begins_with(sk, :prefix)', ExpressionAttributeValues: { ':pk': pk, ':prefix': { S: prefix } }, ScanIndexForward: false, ConsistentRead: true, Limit: limit - rows.length, ExclusiveStartKey }));
      rows.push(...(page.Items ?? []).map((item) => JSON.parse(item.payload.S)));
      ExclusiveStartKey = page.LastEvaluatedKey;
    } while (ExclusiveStartKey && rows.length < limit);
    return rows;
  },
};
}
const handle = createGuestHandler(storeForPartition, randomUUID, Date.now, process.env.AWS_REGION);
export const handler = async (event) => {
  const result = await handle(event);
  console.info(JSON.stringify({ route: event.routeKey, status: result.statusCode, awsRequestId: event.requestContext?.requestId }));
  return result;
};
