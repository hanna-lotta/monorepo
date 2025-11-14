import { QueryCommand, DeleteCommand, GetCommand } from '@aws-sdk/lib-dynamodb';
import express from 'express'
import type { Router, Request, Response } from 'express'
import jwt from 'jsonwebtoken';
import { db, tableName } from '../data/dynamoDb.js';
import { UserItem } from '../data/types.js';
import { ItemsSchema, ItemSchema } from '../auth/validation.js';
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

// Hämta alla användare
router.get('/', async (req, res: Response<UserResponse[] | ErrorMessage>) => {
	const command = new QueryCommand({
		TableName: tableName,
		KeyConditionExpression: 'pk = :value',
		ExpressionAttributeValues: {
			':value': 'User'
		}
	})

	try {
		const output = await db.send(command)

		if (!output.Items || output.Items.length === 0) {
			res.status(404).send({ error: 'No users found' })
			return
		}

		const validateItems = ItemsSchema.safeParse(output.Items)
		if (!validateItems.success) {
			res.status(500).send({ error: 'Internal server error' })
			return
		}

		const users: UserItem[] = validateItems.data

		// Frontend behöver bara användarnamn och id
		return res.status(200).send(users.map(ui => ({
			username: ui.username,
			userId: ui.sk.substring(5) // id-delen av 'sk'
		})))
	} catch (err) {
			res.status(500).send({ error: 'Internal server error' })
			return
	}
})
// Hämta en specifik användare
router.get('/:userId', async (req: Request<UserIdParam>, res: Response<UserResponse | ErrorMessage>) => {
	const { userId } = req.params;
	if (!userId) {
		res.status(400).send({ error: 'userId parameter is required' });
		return;
	}
	// använd getcommand istället för query när man hämtar en användare
	const command = new GetCommand({
		TableName: tableName,
		Key: {
			pk: 'User',
			sk: `user#${userId}`
		}
	});

	try {
		const output = await db.send(command)

		if (!output.Item) { //(single-item)
			res.status(404).send({ error: 'User not found' });
			return
		}

		const validateItem = ItemSchema.safeParse(output.Item)
		if (!validateItem.success) {
			console.log('Db item did not match schema')
			res.status(500).send({ error: 'Internal server error' });
			return
		}

		const user: UserItem = validateItem.data

		res.send({
			username: user.username,
			userId: user.sk.substring(5)  // id-delen av 'sk'
		})
	} catch (error) {
		console.log('users.ts get user error:', (error as any)?.message)
		res.status(500).send({ error: 'Internal server error', issues: (error as any)?.message || error })
		return
	}

})

router.delete('/:userId', async (req: Request<UserIdParam>, res: Response<unknown | ErrorMessage>) => {
	const { userId } = req.params;
	if (!userId) {
		res.status(400).send({ error: 'userId parameter is required' });
		return;
	}

	const maybePayload: Payload | null = validateJwt(req.headers['authorization'])
		if( !maybePayload ) {
			console.log('Gick inte att validera JWT')
			res.sendStatus(401)
			return
		}
	const { userId: tokenUserId, accesLevel } = maybePayload
		const userIdFromToken = (typeof tokenUserId === 'string' && tokenUserId.startsWith('user#'))
			? tokenUserId.slice(5)
			: String(tokenUserId);
	// Kontrollera att användaren har rätt att ta bort (t.ex. är admin eller samma userId)
	if (userIdFromToken !== userId && accesLevel !== 'admin') {
		res.status(403).send({ error: 'Forbidden' });
		return;
	}

	
	try {
		const deleteResult = await db.send(new DeleteCommand({
			TableName: tableName,
			Key: {
				pk: 'User',
				sk: `user#${userId}`
			},
			ReturnValues: 'ALL_OLD' //Logga hela deleteResult.Attributes server-side om du behöver felsöka, men skicka aldrig de till klienten.
		}));

		// Server-side debug: logga de raderade attributen för felsökning (skicka aldrig dessa till klienten)
		console.debug('Deleted attrs:', deleteResult.Attributes)

		if (!deleteResult.Attributes) {
			res.status(404).send({ error: 'User not found' });
			return;
		}

			// Returnera det raderade objektet (ALL_OLD)
			res.status(200).send({ success: true, userId });
			return;
	} catch (err) {
		console.error('Error deleting user:', err);
		res.status(500).send({ error: 'Failed to delete user' });
		return;
	}
});

interface Payload  {
	userId: string;
	accesLevel: string;
}
//TODO flytta ut
function validateJwt(authHeader: string | undefined): Payload | null {
  // 'Bearer: token'
  if( !authHeader ) {
	return null
  }
  const token: string = authHeader.substring(8)  // 'Bearer: 
  try {
	// Anropar jwt.verify som verifierar signaturen med hemligheten från env och returnerar det dekodade payload-objektet.
	const decodedPayload = jwt.verify(token, process.env.JWT_SECRET || '') 
	console.log('Decoded JWT', decodedPayload)
  const validatePayload = PayloadSchema.safeParse(decodedPayload);
  if (!validatePayload.success) {
	console.log('Decoded JWT payload did not match schema');
	return null;
  } 
  return validatePayload.data;

  } catch(error) {
	console.log('JWT verify failed: ', (error as any)?.message)
	return null	
  }
}


export default router