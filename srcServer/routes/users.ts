import { QueryCommand } from '@aws-sdk/lib-dynamodb';
import express from 'express'
import type { Router, Request, Response } from 'express'
import jwt from 'jsonwebtoken';
import { db, tableName } from '../data/dynamoDb.js';
import { UserItem } from '../data/types.js';
import { ItemsSchema } from '../auth/validation.js';




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
		KeyConditionExpression: 'pk = :value',  // USER är ett reserverat ord, kan inte skriva det direkt
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
	
	// TODO: validera med zod att output.Items matchar UserItem-interfacet
	// OBS! Använd aldrig "as" i produktion - validera i stället!
	const users: UserItem[] = validateItems.data
	//const user: UserItem | undefined = users.find((u) => u.username === validation.data.username)
	

	//const validatedItems: UserResponse[] = [];

	// Frontend behöver bara användarnamn och id
	res.send(users.map(ui => ({
		username: ui.username,
		userId: ui.sk.substring(5)  // id-delen av 'sk'
	})))
	// USER#id - hur får vi tag i id-delen av strängen? Substring, .split m.m.
})

interface Payload  {
	userId: string;
	accessLevel: string;
}

function validateJwt(authHeader: string | undefined): Payload | null {
	// 'Bearer: token'
	if( !authHeader ) {
		return null
	}
	const token: string = authHeader.substring(8)  // alternativ: slice, split
	try {
		const decodedPayload: Payload = jwt.verify(token, process.env.JWT_SECRET || '') as Payload
		// TODO: validera decodedPayload
		const payload: Payload = { userId: decodedPayload.userId, accessLevel: decodedPayload.accessLevel }
		return payload

	} catch(error) {
		console.log('JWT verify failed: ', (error as any)?.message)
		return null
	}
}



export default router