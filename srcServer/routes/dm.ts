import express from 'express'
import type { Router, Request, Response } from 'express'
import { db, tableName } from '../data/dynamoDb.js';
import { PutCommand, QueryCommand, GetCommand, DeleteCommand } from '@aws-sdk/lib-dynamodb';
import { DmSchema, PayloadSchema, PostDmSchema, UserSchema } from '../data/validation.js';
import { CreateDmBody } from '../data/types.js';
import jwt from 'jsonwebtoken';
import type { ErrorMessage } from '../data/types.js';

const router: Router = express.Router();

export interface DmBody {
  senderId: string;
  recieverId: string;
  message: string;
  createdAt: Date;
  senderName?: string | null | undefined;
}



interface Payload  {
	userId: string;
	accesLevel: string;
}
function validateJwt(authHeader: string | undefined): Payload | null {
  // 'Bearer: token'
  if( !authHeader ) {
    return null
  }
  const token: string = authHeader.substring(8)  // alternativ: slice, split
  try {
    const decodedPayload = jwt.verify(token, process.env.JWT_SECRET || '') 
	console.log('Decoded JWT raw:', decodedPayload)
  const validatePayload = PayloadSchema.safeParse(decodedPayload);
  if (!validatePayload.success) {
    console.log('Decoded JWT payload did not match schema');
    return null;
  } 
 
  return validatePayload.data;

  /*
  const payload: Payload = { userId: decodedPayload.userId, accessLevel: decodedPayload.accessLevel }
		return payload
*/

  } catch(error) {
    console.log('JWT verify failed: ', (error as any)?.message)
    return null
  }
}


// DM - TODO kolla om användaren är inloggad
router.get('/:userA/:userB', async (req: Request, res: Response<DmBody[] | ErrorMessage>) => {
  const { userA, userB } = req.params;
  if (!userA || !userB) {
	res.status(400).send({ error: 'Both userA and userB parameters are required' });
	return
  }

  const maybePayload: Payload | null = validateJwt(req.headers['authorization'])
	if( !maybePayload ) {
		console.log('Gick inte att validera JWT')
		res.sendStatus(401)
		return
	}

  const { userId, accesLevel } = maybePayload
  // Man får lov att se konversationen om man är en av deltagarna eller har accessLevel admin
  const normalizedUserId = userId.startsWith('user#') ? userId.slice(5) : userId;
  if( normalizedUserId !== userA && normalizedUserId !== userB && accesLevel !== 'admin' ) {
    console.log('Inte tillräcklig access level. ', userId, accesLevel)
    res.sendStatus(401)
    return
  }
  try {
    // matcha 'dm#user#2#user#3'
    const tokenA = `user#${userA}`;
    const tokenB = `user#${userB}`;
    const convId = [tokenA, tokenB].sort().join('#');
    const pk = `dm#${convId}`; //så att ordningen på id i url inte spelar roll - det har ett konversationsId istället

    const out = await db.send(new QueryCommand({
      TableName: tableName,
      KeyConditionExpression: 'pk = :pk',
      ExpressionAttributeValues: { ':pk': pk }
    }));

    const items = out.Items || [];

    const validatedItems: DmBody[] = [];
    for (const it of (items || [])) {
      const validation = DmSchema.safeParse(it);
      if (validation.success) validatedItems.push(validation.data);
    }
	return res.status(200).send(validatedItems);

  } catch (error) {
    console.error('Error fetching DMs by users:', error);
    return res.status(500).send({ error: 'Internal server error' });
  }
});




//DM - TODO kolla om användaren är inloggad
router.post('/', async (req: Request<{}, {}, CreateDmBody>, res: Response<unknown | ErrorMessage>) => {
  const validation = PostDmSchema.safeParse(req.body);
  if (!validation.success) {
    res.status(400).send({ error: 'Invalid request body' });
	return
  }
  const { message, senderId, recieverId } = validation.data;

  try {
    // Hämta username från User item (pk='User', sk=senderId)
    const getUser = await db.send(new GetCommand({ 
		TableName: tableName, 
		Key: { 
			pk: 'User', 
			sk: senderId 
		} 
	}))
	if (!getUser?.Item) {
	  res.status(400).send({ error: 'Sender user not found' });
	  return
	}
	const userValidation = UserSchema.safeParse(getUser.Item);
	if (!userValidation.success) {
	  res.status(400).send({ error: 'Invalid user data' });
	  return
	}
    const senderName: string = userValidation.data.username;

    const messageId = crypto.randomUUID();
    const now = new Date().toISOString();
    const putItem = {
      pk: `dm#${[senderId, recieverId].sort().join('#')}`,
      sk: `message#${now}#${messageId}`,
      senderId,
      recieverId,
      senderName,
      message,
      createdAt: now,
    };

    await db.send(new PutCommand({ TableName: tableName, Item: putItem }));
    return res.status(201).send(putItem);
  } catch (error) {
    console.error('Error creating DM:', error);
    return res.status(500).send({ error: 'Internal server error' });
  }
});
/*
await db.send(new UpdateCommand({
  TableName: tableName,
  Key: { pk: it.pk, sk: it.sk },
  UpdateExpression: 'SET senderName = :name',
  ExpressionAttributeValues: { ':name': username }
}));
Fortsätt spara senderName vid skrivtid (du har redan implementerat detta i din POST)
Det räcker att du alltid lägger in senderName när du skapar nya DM‑poster. Då behöver du bara backfilla historiken en gång.*/

interface DeleteDmBody {
  senderId: string;
  recieverId: string;
  // prefer messageSk (full sk) from the client; createdAt+messageId can be used as a fallback
  messageSk: string;
  createdAt: string;
  messageId: string;
  senderName?: string
}


router.delete('/', async (req: Request<{}, {}, DeleteDmBody>, res: Response<DmBody | ErrorMessage>) => {
  const { senderId, recieverId, createdAt, messageSk, messageId, senderName } = req.body;
  if (!senderId || !recieverId || (!messageSk && !(createdAt && messageId))) {
    return res.status(400).send({ error: 'Missing required fields. Provide senderId, recieverId and messageSk (preferred) or createdAt+messageId (fallback).' });
  }

  try {
    const pk = `dm#${[senderId, recieverId].sort().join('#')}`;
    // use provided messageSk if present, otherwise build from createdAt+messageId
    const skToDelete = messageSk ? messageSk : `message#${createdAt}#${messageId}`;

    const deleteResult = await db.send(new DeleteCommand({
      TableName: tableName,
      Key: { 
        pk, 
        sk: skToDelete
      },
      ReturnValues: 'ALL_OLD'
    }))
    if (deleteResult.Attributes) {
      const validation = DmSchema.safeParse(deleteResult.Attributes)
      if (validation.success) {
        const deleteMessage = validation.data
        res.status(200).send(deleteMessage)
      } else {
        // include validation issues to aid debugging (safe in dev); don't leak secrets in production
        console.error('DM delete: DB item failed validation', validation.error);
        res.status(500).send({ error: 'Database validation failed', issues: validation.error.issues })	
      }
    } else { 
      res.status(404).send({ error: 'Message not found' })
    }
    
  } catch (error) {
    console.error('Error deleting DM:', error);
    res.status(500).send({ error: 'Failed to delete message'})
  }

});




export default router;
