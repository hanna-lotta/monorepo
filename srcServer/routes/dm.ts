import express from 'express'
import type { Router, Request, Response } from 'express'
import { db, tableName } from '../data/dynamoDb.js';
import { PutCommand, QueryCommand, GetCommand, DeleteCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { DmSchema, PayloadSchema, PostDmSchema, UserSchema, DmDb } from '../data/validation.js';
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

  const { userId: tokenUserId, accesLevel } = maybePayload
  // Man får lov att se konversationen om man är en av deltagarna eller har accessLevel admin
  const userIdFromToken = tokenUserId.startsWith('user#') ? tokenUserId.slice(5) : tokenUserId;
  if( userIdFromToken !== userA && userIdFromToken !== userB && accesLevel !== 'admin' ) {
    console.log('Inte tillräcklig access level. ', userIdFromToken, accesLevel)
    res.sendStatus(401)
    return
  }
  try {
    // matcha 'dm#user#2#user#3'  
    const tokenA = `user#${userA}`;
    const tokenB = `user#${userB}`;
    const convId = [tokenA, tokenB].sort().join('#'); //[tokenA, tokenB] skapar en array med de två strängarna (t.ex. "user#1e6..." och "user#2a3...").
    // .sort() sorterar arrayen i lexikografisk ordning(jämför strängar tecken för tecken från vänster till höger).
    // .join('#') slår ihop elementen till en enda sträng med "#" som separator.
    const pk = `dm#${convId}`; //så att ordningen på id i url inte spelar roll - det har ett konversationsId istället
    
    console.log('DM Debug - userA:', userA, 'userB:', userB);
    console.log('DM Debug - tokenA:', tokenA, 'tokenB:', tokenB);
    console.log('DM Debug - convId:', convId);
    console.log('DM Debug - pk:', pk);

    const out = await db.send(new QueryCommand({
      TableName: tableName,
      KeyConditionExpression: 'pk = :pk',
      ExpressionAttributeValues: { ':pk': pk }
    }));

    const items = out.Items || [];
    console.log('DM Debug - Found items:', items.length, items);

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




//DM 
router.post('/', async (req: Request<{}, {}, CreateDmBody>, res: Response<unknown | ErrorMessage>) => {
  const validation = PostDmSchema.safeParse(req.body);
  if (!validation.success) {
    res.status(400).send({ error: 'Invalid request body' });
    return
  }
  
  const { message, recieverId } = validation.data;

  const maybePayload: Payload | null = validateJwt(req.headers['authorization'])
	if( !maybePayload ) {
		console.log('Gick inte att validera JWT')
		res.sendStatus(401)
		return
	}
	
    const { userId: tokenUserId, accesLevel } = maybePayload;
   

    const senderIdFromToken = tokenUserId.startsWith('user#') ? tokenUserId : `user#${tokenUserId}`; //if sats istället
    //skapa en canonical senderId i formatet som sparas i databasen (t.ex. "user#123").
    const receiverIdFromBody = recieverId.startsWith('user#') ? recieverId : `user#${recieverId}`;
	// Normalisera receiver så att den också har 'user#' prefix för att bygga PK
  try {
    // Hämta username från User item (pk='User', sk=senderId)
    const getUser = await db.send(new GetCommand({ 
        TableName: tableName, 
        Key: { 
            pk: 'User', 
            sk: senderIdFromToken 
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
      pk: `dm#${[senderIdFromToken, receiverIdFromBody].sort().join('#')}`,
      sk: `message#${now}#${messageId}`,
      messageId,
      senderId: senderIdFromToken,
      recieverId: receiverIdFromBody, 
      senderName,
      message,
      createdAt: now,
    };

    await db.send(new PutCommand({ 
		TableName: tableName, 
		Item: putItem 
	}));
    return res.status(201).send(putItem);
	
  } catch (error) {
    console.error('Error creating DM:', error);
    return res.status(500).send({ error: 'Internal server error' });
  }
});

/*Fortsätt spara senderName vid skrivtid.*/

export interface Dm {
	
	sk?: string;
	senderId: string;
	recieverId: string;
	message: string;
	createdAt: Date;
	messageId?: string;

}



  



export default router;
