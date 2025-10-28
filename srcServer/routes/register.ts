import express from 'express'
import type { Router, Request, Response } from 'express'
import { db, tableName } from '../data/dynamoDb.js';
import { createToken } from '../data/auth.js';
import { genSalt, hash } from 'bcrypt'
import { registerSchema } from '../auth/validation.js';
import { PutCommand } from '@aws-sdk/lib-dynamodb';
import { JwtResponse, UserBody } from '../data/types.js';

const router: Router = express.Router();
//TODO lägg till errormessage-interface

router.post('/', async (req: Request<{}, JwtResponse, UserBody>, res: Response<JwtResponse | { error: string }>) => {
	//validera body
	const validation = registerSchema.safeParse(req.body);
	if (!validation.success) {
		res.status(400).send({error: "Invalid request body"}); 
		return;
	}

	const newId = crypto.randomUUID()

	const salt: string = await genSalt()
	const hashed: string = await hash(validation.data.password, salt)

	const { username, password } = validation.data
	const command = new PutCommand({
		TableName: tableName,
		Item: {
			username: validation.data.username,
			password: hashed,
			accesLevel: 'user',
			pk: 'User',
			sk: 'user#' + newId
		}
	});
	try {
		const result = await db.send(command)
		const token: string | null = createToken(newId)
		res.send({ success: true, token: token })

	} catch(error) {
		console.log(`register.ts fel:`, (error as any)?.message)
		res.status(500).send({ success: false })
	}
});




export default router