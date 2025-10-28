import express from 'express'
import type { Router, Request, Response } from 'express'
import { createToken } from '../data/auth.js';
import type { JwtResponse, UserBody, UserItem } from '../data/types.js';
import { ItemsSchema, registerSchema } from '../auth/validation.js';
import { QueryCommand } from '@aws-sdk/lib-dynamodb';
import { db, tableName } from '../data/dynamoDb.js';
import { compare } from 'bcrypt'
import { log } from 'console';


const router: Router = express.Router();

router.post('/', async (req: Request<{}, JwtResponse, UserBody>, res: Response<JwtResponse | { error: string }>) => {
	const validation = registerSchema.safeParse(req.body);
	if (!validation.success) {
		res.status(400).send({ error: 'Invalid request body' })
		return
	}
	const command = new QueryCommand({
		TableName: tableName,
		KeyConditionExpression: 'pk = :value',
		ExpressionAttributeValues: {
			':value': 'User'
		}
	})
	const output = await db.send(command)
	if( !output.Items ) {
		console.log('No items from db')
		res.sendStatus(404)
		return
	}
	// TODO: validera items med zod
	const validateItems = ItemsSchema.safeParse(output.Items)
	if (!validateItems.success) {
		console.log('Db items did not match schema')
		res.sendStatus(500)
		return
	}
	const users: UserItem[] = validateItems.data
	const user: UserItem | undefined = users.find((u) => u.username === validation.data.username)
	if (!user) {
		res.status(401).send({ success: false })
		return
	}
	const passwordMatch = await compare(validation.data.password, user.password)
	if (!passwordMatch) {
		res.status(401).send({ success: false })
		return
	}
	const userId = user.sk.split('#')[1]
	const token: string = createToken(userId)
	res.send({ success: true, token: token })
	log('User logged in:', user.username);
});


export default router