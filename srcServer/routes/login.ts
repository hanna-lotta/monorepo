import express from 'express'
import type { Router, Request, Response } from 'express'
import { createToken } from '../data/auth.js';
import type { JwtResponse, UserBody, UserItem } from '../data/types.js';
import { ItemsSchema, registerSchema } from '../auth/validation.js';
import { QueryCommand } from '@aws-sdk/lib-dynamodb';
import { db, tableName } from '../data/dynamoDb.js';
import { compare } from 'bcrypt'
import { ErrorMessage } from '../data/types.js';


const router: Router = express.Router();

router.post('/', async (req: Request<{}, JwtResponse, UserBody>, res: Response<JwtResponse | ErrorMessage>) => {
	const validation = registerSchema.safeParse(req.body);
	if (!validation.success) {
		res.status(400).send({ error: 'Invalid request body' }) // Bad Request
		return
	}
	const command = new QueryCommand({
		TableName: tableName,
		KeyConditionExpression: 'pk = :value', // User är ett reserverat ord
		ExpressionAttributeValues: {
			':value': 'User'
		}
	})
	try {
		const output = await db.send(command)
		if (!output.Items || output.Items.length === 0) { //hantera tom array.
			console.log('No items from db')
			res.sendStatus(404) //Not found
			return
		}
		const validateItems = ItemsSchema.safeParse(output.Items)
		if (!validateItems.success) {
			console.log('Db items did not match schema')
			res.sendStatus(500) //Internal Server Error
			return
		}
		const users: UserItem[] = validateItems.data
		const user: UserItem | undefined = users.find((u) => u.username === validation.data.username)
		if (!user) {
			res.status(401).send({ success: false })
			return
		}
		//compare är från bcrypt. Den jämför plaintext-lösenordet (från validation.data.password) med det hashade lösenordet som finns i user.password.
		const passwordMatch = await compare(validation.data.password, user.password)
		if (!passwordMatch) {
			res.status(401).send({ success: false }) // Unauthorized
			return
		}
		const userId = user.sk.split('#')[1] 
		//Skapar en JWT med createToken, som signerar en payload med userId och accesLevel.
		const token: string = createToken(userId, user.accesLevel || 'user')
		//user.accesLevel || 'user' säkerställer en fallback till 'user' om fältet saknas.
		
		res.send({ success: true, token: token, username: user.username })
		console.log('User logged in:', user.username);
	} catch (error) {
		console.log('login.ts db error:', (error as any)?.message)
		// Return ErrorMessage shape: include optional issues for debugging
		res.status(500).send({ error: 'Internal server error', issues: (error as any)?.message || error })
		return
	}
});
//TODO? 
//Effektivitet: Att Query:a hela partitionen pk='User' och sedan söka med .find är ineffektivt. Bättre alternativ:
//Eller använd pk eller sk så att du kan hämta användaren med ett GetCommand (exakt-nyckel) om du kan konstruera nyckeln från input.

export default router