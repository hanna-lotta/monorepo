import express from 'express'
import type { Router, Request, Response } from 'express'
import { db, tableName } from '../data/dynamoDb.js';
import { PutCommand, QueryCommand, GetCommand, DeleteCommand, TransactWriteCommand } from '@aws-sdk/lib-dynamodb';
import { ChannelSchema, MetaChannelSchema, ChannelMessageRequestSchema, ChannelMessageRequest, ChannelMessageSchema, ChannelCreateRequestSchema, ChannelCreateRequest, MessageBodySchema, UserSchema } from '../data/validation.js';
import * as z from 'zod';
import { ScanCommand } from '@aws-sdk/lib-dynamodb'; 
import { ErrorMessage } from '../data/types.js';
import { validateJwt } from '../data/auth.js';

const router: Router = express.Router();

interface Channel {
	  pk: string;
	  sk: string;
	  senderId: string;
	  senderName: string;
	  name: string;
	  message: string;
	  createdAt: Date;
}

interface ChannelResponse {
  name: string;
  channelId?: string; 
  isOpen: boolean;
  creatorUserId?: string;
  messageSk?: string;
}
interface MessageResponse {
  sk: string;
  message: string;
  senderId: string;
  senderName?: string | null;
  createdAt: string | Date;
}
router.get('/', async (req: Request, res: Response<ChannelResponse[] | ErrorMessage>) => {
  try {
    const command = new ScanCommand({
      TableName: tableName,
      // Bara META items för kanaler
      FilterExpression: 'sk = :meta AND begins_with(pk, :pfx)',
      ExpressionAttributeValues: { ':meta': 'META', ':pfx': 'channel#' },
    
    });
	// Items kan vara undefined om inga rader hittades - || [] som fallback till en tom array — det gör att forEach alltid kan köras utan att krascha.
	const scanOut = await db.send(command);
    const channels: ChannelResponse[] = [];
    (scanOut.Items ?? []).forEach(item => { //om inga rader finns, returnera tom array
      const parsed = MetaChannelSchema.safeParse(item);
      if (parsed.success) {
        channels.push(parsed.data);
      } else {
        console.log('Channel meta failed validation:'); 
        
      }
    });
    return res.status(200).send(channels);

  } catch (err) {
    res.status(500).send({ error: 'Internal server error' });
	return;
  }
});

interface ChannelIdParam {
  channelId: string;
}

// Alla meddelanden i en kanal
router.get('/:channelId', async (req: Request<ChannelIdParam>, res: Response<MessageResponse[] | ErrorMessage>) => {
  const { channelId } = req.params;
  if (!channelId) {
    res.status(400).send({ error: 'channelId is required' });
    return;
  }
  try {
    const pk = `channel#${channelId}`;

    // Hämta META för att avgöra om kanalen är öppen för gäster
    const metaOut = await db.send(new GetCommand({ 
    TableName: tableName, 
    Key: 
	{ 
		pk, 
		sk: 'META' 
	} 
  }));
    if (!metaOut.Item) {
    res.status(404).send({ error: 'Channel not found' });
      return;
    }

    const metaParse = MetaChannelSchema.safeParse(metaOut.Item);

    if (!metaParse.success) {
      res.status(500).send({ error: 'Channel metadata invalid' });
      return;
    }

    const { isOpen } = metaParse.data as z.infer<typeof MetaChannelSchema>;

    // Om kanalen är låst krävs autentisering
    if (!isOpen) {
      const maybePayload = validateJwt(req.headers['authorization']);
      if (!maybePayload) {
        res.sendStatus(401);
        return;
      }
    }

    const command = await db.send(new QueryCommand({
      TableName: tableName,
      KeyConditionExpression: 'pk = :pk AND begins_with(sk, :msg)',
      ExpressionAttributeValues: { ':pk': pk, ':msg': 'message#' },
      // nyast meddelanden först
      ScanIndexForward: false,
    }));

    const messages: MessageResponse[] = [];
    (command.Items ?? []).forEach(item => { //om inga rader finns, returnera tom array
      const parsed = ChannelMessageSchema.safeParse(item);
      if (parsed.success) {
        const data = parsed.data;
        messages.push({
          sk: data.sk,
          message: data.message,
          senderId: data.senderId,
          senderName: data.senderName,
          createdAt: data.createdAt,
        });
      } else {
        console.log('Channel messages failed validation:');
      }
    });

    return res.status(200).send(messages);
  } catch (err) {
    res.status(500).send({ error: 'Internal server error' });
	return;
  }
});


//skapa kanal
router.post('/', async (req: Request<{}, ChannelResponse, ChannelCreateRequest>, res: Response<ChannelResponse | ErrorMessage>) => {
  const bodyValidation = ChannelCreateRequestSchema.safeParse(req.body);
  if (!bodyValidation.success) {
    res.status(400).send({ error: 'Invalid request body' });
    return;
  }

  const maybePayload = validateJwt(req.headers['authorization']);
	if (!maybePayload) {
  console.log('Channel create: failed to validate JWT');
  res.sendStatus(401);
  return;
}
// skapa en "rå" userId utan prefix för jämförelser mot URL/body‑parametrar.
const { userId: tokenUserId } = maybePayload;
const userIdFromToken = tokenUserId.startsWith('user#')
  ? tokenUserId.slice(5)
  : String(tokenUserId);

// Säker praxis: använd token‑user som creator. 
const creatorUserId = userIdFromToken;

  const { senderName, name, message, isOpen } = bodyValidation.data;

  const createdAt = new Date().toISOString();
  const metaIsOpen = typeof isOpen === 'boolean' ? isOpen : true; // om klienten skickat en boolean används den, annars default till true.
  const newChannelId = `channel#${crypto.randomUUID()}`;
  const messageSk = `message#${Date.now()}#${crypto.randomUUID()}`;

  // Bygger ett metadata‑objekt för kanalen
const metaItem = {
  pk: newChannelId,
  sk: 'META',
  name,
  isOpen: metaIsOpen,
  creatorUserId: creatorUserId, //id från token
};
//Bygger message‑objektet som sparas i samma single‑table med samma pk men sk börjar med message#. 
// message-item - always store server-derived sender id to avoid spoofing
const messageItem = {
  pk: newChannelId,
  sk: messageSk,
  senderId: creatorUserId,
  senderName,
  message,
  createdAt,
};

	//Kör en atomisk transaktion (TransactWrite) som skriver både META och första message i en transaktion.
	//Antingen skrivs båda eller ingen — inga halvskapade kanaler.
  try {
    await db.send(new TransactWriteCommand({
      TransactItems: [
        {
          Put: {
            TableName: tableName,
            Item: metaItem,
          },
        },
        {
          Put: {
            TableName: tableName,
            Item: messageItem,
          },
        },
      ],
    }));

  return res.status(201).send({ name, channelId: newChannelId, isOpen: metaIsOpen, creatorUserId, messageSk });
  } catch (err) {
    res.status(500).send({ error: 'Failed to create channel' });
	return;
  }
});


interface MessageBody {
  senderName?: string;
  message: string;
}

//skapa meddelande i kanal
router.post('/:channelId/message', async (req: Request<ChannelIdParam, MessageResponse, MessageBody>, res: Response<MessageResponse | ErrorMessage>) => {
  const { channelId } = req.params;
  if (!channelId) {
    res.status(400).send({ error: 'channelId is required' }); //Bad request
    return;
  }

  const pk = `channel#${channelId}`;

  try {
    // Hämta METAdata för kanalen för att avgöra om den är öppen för gäster
    const metaOut = await db.send(new GetCommand({ 
		TableName: tableName, 
		Key: { 
			pk, 
			sk: 'META' 
		} 
  }));
    if (!metaOut.Item) {
      res.status(404).send({ error: 'Channel not found' }); //Not Found
      return;
    }

    const metaParse = MetaChannelSchema.safeParse(metaOut.Item);
    if (!metaParse.success) {
      res.status(500).send({ error: 'Channel metadata invalid' });
      return;
    }

      const { isOpen } = metaParse.data;

      const bodyValidation = MessageBodySchema.safeParse(req.body);
      if (!bodyValidation.success) {
        res.status(400).send({ error: 'Invalid request body' });
        return;
      }
      const { senderName: maybeSenderName, message } = bodyValidation.data;

      // Kolla om användaren är inloggad
      const maybePayload = validateJwt(req.headers['authorization']);
      
      let senderId: string;
      let senderName: string;
      
      if (maybePayload) {
        // Inloggad användare - hämta riktigt namn
        const { userId: tokenUserId } = maybePayload;
        senderId = tokenUserId.startsWith('user#') ? tokenUserId : `user#${tokenUserId}`;
        
        // Hämta användarnamn från databasen
        let actualUsername: string | undefined;
        try {
          const userRes = await db.send(new GetCommand({
            TableName: tableName,
            Key: { pk: 'User', sk: senderId }
          }));
          
          if (userRes.Item) {
            const userValidation = UserSchema.safeParse(userRes.Item);
            if (userValidation.success) {
              actualUsername = userValidation.data.username;
            }
          }
        } catch (err) {
          console.error('Failed to fetch username:', err);
        }
        
        senderName = actualUsername || maybeSenderName || 'Inloggad användare';
        
      } else {
        // Inte inloggad
        if (!isOpen) {
          res.sendStatus(401); // Låst kanal kräver inloggning
          return;
        }
        // Gäst i öppen kanal
        senderId = `guest#${crypto.randomUUID()}`;
        senderName = maybeSenderName || `Guest-${crypto.randomUUID().slice(0, 8)}`;
      }

      const createdAt = new Date().toISOString();
      const sk = `message#${Date.now()}#${crypto.randomUUID()}`;

    const putCommand = new PutCommand({
      TableName: tableName,
      Item: {
        pk,
        sk,
        senderId,
        senderName,
        message,
        createdAt,
      },
    });

    await db.send(putCommand);
    return res.status(201).send({ sk, message, senderId, senderName, createdAt });
  } catch (err) {
    console.error('Error fetching channel META or creating message:', err);
    res.status(500).send({ error: 'Failed to create message' });
	return;
  }
});

//TODO delete channel med alla meddelanden i kanal


export default router;


