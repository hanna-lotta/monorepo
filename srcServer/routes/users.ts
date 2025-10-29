import { QueryCommand, DeleteCommand } from '@aws-sdk/lib-dynamodb';
import express from 'express'
import type { Router, Request, Response } from 'express'
import jwt from 'jsonwebtoken';
import { db, tableName } from '../data/dynamoDb.js';
import { UserItem } from '../data/types.js';
import { ItemsSchema } from '../auth/validation.js';
import type { ErrorMessage } from '../data/types.js';
import { PayloadSchema } from '../data/validation.js';




const router: Router = express.Router();


interface UserResponse {
	username: string;
	userId: string;
}
interface UserIdParam {
	userId: string;
}


router.get('/', async (req, res: Response<void | UserResponse[]>) => {
	const command = new QueryCommand({
		TableName: tableName,
		KeyConditionExpression: 'pk = :value',  
		ExpressionAttributeValues: {
			':value': 'User'
		}
	})
	const output = await db.send(command)

	if( !output.Items ) {
		res.status(404).send()
		return
	}
	const validateItems = ItemsSchema.safeParse(output.Items)
	if (!validateItems.success) {
		console.log('Db items did not match schema')
		res.status(500).send()
		return
	}
	
	const users: UserItem[] = validateItems.data
	

	// Frontend behöver bara användarnamn och id
	res.send(users.map(ui => ({
		username: ui.username,
		userId: ui.sk.substring(5)  // id-delen av 'sk'
	})))
	
})
// Hämta en specifik användare
router.get('/:userId', async (req: Request<UserIdParam>, res: Response<UserResponse | ErrorMessage>) => {
	const { userId } = req.params;
	if (!userId) {
		res.status(400).send({ error: 'userId parameter is required' });
		return;
	}

	const command = new QueryCommand({
		TableName: tableName,
		KeyConditionExpression: 'pk = :pk AND sk = :sk',
		ExpressionAttributeValues: {
			':pk': 'User',
			':sk': `user#${userId}`
		}
	})
	const output = await db.send(command)

	if( !output.Items || output.Items.length === 0 ) {
		res.status(404).send({ error: 'User not found' });
		return
	}
	const validateItems = ItemsSchema.safeParse(output.Items)
	if (!validateItems.success) {
		console.log('Db items did not match schema')
		res.status(500).send({ error: 'Internal server error' });
		return
	}
	const users: UserItem[] = validateItems.data
	const user = users[0]; // borde bara vara en

	res.send({
		username: user.username,
		userId: user.sk.substring(5)  // id-delen av 'sk'
	})

})


export default router