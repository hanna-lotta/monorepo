import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";


const accessKey: string = process.env.ACCESS_KEY || ''
const secret: string = process.env.SECRET_ACCESS_KEY || ''

const client: DynamoDBClient = new DynamoDBClient({
	region: "eu-north-1",  // se till att använda den region som du använder för DynamoDB
	credentials: {
		accessKeyId: accessKey,
		secretAccessKey: secret,
	},
});
const db: DynamoDBDocumentClient = DynamoDBDocumentClient.from(client);

const tableName = 'jwt'

export { db, tableName }