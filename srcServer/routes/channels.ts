import express from 'express'
import type { Router, Request, Response } from 'express'
import { db, tableName } from '../data/dynamoDb.js';
import { PutCommand, QueryCommand, GetCommand, DeleteCommand, TransactWriteCommand } from '@aws-sdk/lib-dynamodb';
import { ChannelSchema, MetaChannelSchema, ChannelMessageRequestSchema, ChannelMessageRequest, ChannelMessageSchema, ChannelCreateRequestSchema, ChannelCreateRequest, MessageBodySchema } from '../data/validation.js';
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
	//accesLevel?: string;
}

interface ChannelBody {
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
    console.error('Error listing channels:', (err as any)?.stack || (err as any)?.message || err)
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

    const out = await db.send(new QueryCommand({
      TableName: tableName,
      KeyConditionExpression: 'pk = :pk AND begins_with(sk, :msg)',
      ExpressionAttributeValues: { ':pk': pk, ':msg': 'message#' },
      // nyast meddelanden först
      ScanIndexForward: false,
    }));

    const messages: MessageResponse[] = [];
    (out.Items ?? []).forEach(item => { //om inga rader finns, returnera tom array
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
    console.error('Error fetching channel messages:', (err as any)?.stack || (err as any)?.message || err)
   
    res.status(500).send({ error: 'Internal server error' });
	return;
  }
});


//TODO autentisera jwt med middleware istället
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
const { userId: tokenUserId, accesLevel } = maybePayload;
const userIdFromToken = tokenUserId.startsWith('user#')
  ? tokenUserId.slice(5)
  : String(tokenUserId);

// Säker praxis: använd token‑user som creator. Vi tar creatorUserId från token och
// förlitar oss inte på klient‑sända senderId (klienten bör inte skicka senderId i body).
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


//TODO skapa delete kanal med autentisering , delete message också
//TODO Logga in som admin

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
      console.log('Channel META failed validation:', JSON.stringify(metaOut.Item, null, 2));
      res.status(500).send({ error: 'Channel metadata invalid' });
      return;
    }

      const { isOpen } = metaParse.data;

      const bodyValidation = MessageBodySchema.safeParse(req.body);
      if (!bodyValidation.success) {
        console.log('Channel message create failed validation:');
        res.status(400).send({ error: 'Invalid request body' });
        return;
      }
	  // Deklarerar variabel för avsändar-id som ska sparas i DB.
      let senderId: string;
      
	  // : alias/rename när du destrukturerar ett objekt — det tar värdet från egenskapen senderName och tilldelar det till en lokal variabel som heter maybeSenderName.
      const { senderName: maybeSenderName, message } = bodyValidation.data;
	  // Om klienten inte skickade senderName, skapa ett generiskt guest-displaynamn Guest-<kort-uuid>.
      const senderName = maybeSenderName || `Guest-${crypto.randomUUID().slice(0, 8)}`; // tar de första 8 tecknen av UUID:n, t.ex. 'd3b07384'.
  
      if (isOpen) {
        // Öppen kanal: tillåt gästposter
        senderId = `guest#${crypto.randomUUID()}`; //tillåt gästpost — skapa ett senderId
      } else {
        // Låst kanal: kräver autentiserad användare
        const maybePayload = validateJwt(req.headers['authorization']);
        if (!maybePayload) {
          res.sendStatus(401);
          return;
        }
		//Extraherar userId från JWT-payload.
        const { userId: tokenUserId } = maybePayload;
        senderId = ( tokenUserId.startsWith('user#')) ? tokenUserId.slice(5) : String(tokenUserId);
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

// Olika strategier för att radera alla meddelanden i en kanal:
//Skicka en Scan för att hämta alla meddelanden i kanalen och sedan radera dem en och en med DeleteCommand i en loop (parallellt med Promise.all för prestanda).
//Pro: enkel att implementera.
//Con: många anrop om kanalen har många meddelanden, vilket kan vara ineffektivt och dyrt.


//BatchWrite - 
// BatchWriteCommand kan skicka upp till 25 "requests" per anrop (PutRequest eller DeleteRequest).
//Det är inte atomiskt — en batch kan delvis lyckas.
//DeleteItem (enskilda DeleteCommand) i parallel/konkurrens‑kontrollerad loop
//TransactWrite (transaktion)
//Om du måste garantera att META och ett par meddelanden tas bort atomiskt: använd TransactWriteCommand.
//Pro: atomisk (all‑or‑nothing), kan innehålla condition checks.
//Con: max 25 transaktioner per anrop, högre latens/kostnad.
//Fördelar: atomiskt (all-or-nothing), stöd för condition checks.
//Nackdelar: max 25 items per transaktion, högre kostnad/latency.
//När: väldigt få items och du behöver atomicitet (sällsynt för att radera hela kanal).
export default router;







/* TODO Du använder klientens createdAt som fallback; bättre sätt timestampen på servern.
TODO Byt så att metaItem.creatorUserId = creatorUserId (inte senderId).
Sätt createdAt server‑side: const createdAt = new Date().toISOString() (ignorera client value).
I svaret returnera creatorUserId (inte senderId). -klart 
TODO Byt så att metaItem.creatorUserId = creatorUserId (inte senderId).
Sätt createdAt server‑side: const createdAt = new Date().toISOString() (ignorera client value).
I svaret returnera creatorUserId (inte senderId).
TODO När du redan validerat body och JWT: använd det namn klienten skickade (body.senderName) i messageItem.
Risk: klienten kan skriva vilket namn som helst (spoofat display‑name). Om det är ok i din app (t.ex. chatt där displayname är fritt), det är enklast.
Strikt variant — slå upp username på servern baserat på tokenUserId (säkrast)
Du hämtar username från User‑item i DB (GetCommand) med nyckeln pk: 'User', sk: user#${userIdFromToken}.
Fördel: du garanterar att visade namn matchar registrerad username eller profildata — ingen spoofing.
Nackdel: ett extra DB‑anrop per meddelande/kanalskapande (men en GetItem är billig och snabbt).
*/
