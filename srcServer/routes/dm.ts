import express from 'express'
import type { Router, Request, Response } from 'express'
import { db, tableName } from '../data/dynamoDb.js';
import { PutCommand, QueryCommand, GetCommand, DeleteCommand } from '@aws-sdk/lib-dynamodb';
import { DmSchema, PostDmSchema, UserSchema } from '../data/validation.js';
import { CreateDmBody } from '../data/types.js';

const router: Router = express.Router();

export interface DmBody {
  senderId: string;
  recieverId: string;
  message: string;
  createdAt: Date;
  senderName?: string | null | undefined;
}

export interface ErrorMessage {
  error: string;
  issues?: unknown; 
}


// DM - TODO kolla om användaren är inloggad
router.get('/:userA/:userB', async (req: Request, res: Response<DmBody[] | ErrorMessage>) => {
  const { userA, userB } = req.params;
  if (!userA || !userB) {
	res.status(400).send({ error: 'Both userA and userB parameters are required' });
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



export default router;
