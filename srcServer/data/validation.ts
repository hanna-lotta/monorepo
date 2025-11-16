import * as z from 'zod'


export const PostDmSchema = z.object({
  message: z.string().min(1).max(500),
  // senderId is optional for POST: server will derive senderId from the authenticated token
  senderId: z.string().min(1).optional(),
  recieverId: z.string().min(1),
})


export const DmSchema = z
  .object({
    sk: z.string().optional(),
    senderId: z.string(),
    recieverId: z.string(), // stavat fel i DB
    message: z.string().max(500),
    senderName: z.string().nullable().optional(), // senderName may be missing or explicitly null in older items; accept string | null | undefined
	messageId: z.string().optional(),
    createdAt: z
      .string()
      .refine((s) => !isNaN(new Date(s).getTime()), { message: 'createdAt must be a valid date string' })
      .transform((str) => new Date(str)),  // transform to Date, ISO timestamp.
    
   
    
  })
export type DmDb = z.infer<typeof DmSchema>;
export const UserSchema = z.object({
  pk: z.literal('User'),
  sk: z.string(),
  username: z.string().min(1),
 
})
export const MetaChannelSchema = z.object({
  pk: z.string(),
  sk: z.literal('META'),
  name: z.string().min(1).max(30),
  isOpen: z.boolean(),
  creatorUserId: z.string()//.optional(),
})	

// schema för channel messages från databas (med pk)
export const ChannelMessageDbSchema = z.object({
  pk: z.string(),
  sk: z.string(),
  createdAt: z
    .string()
    .refine((s) => !isNaN(new Date(s).getTime()), { message: 'createdAt must be a valid date string' })
    .transform((str) => new Date(str)),
  senderId: z.string(),
  // senderName kan saknas i äldre poster eller vara null; acceptera string|null|undefined
  senderName: z.string().optional().nullable(),
  message: z.string().min(1).max(500),
});
export type ChannelMessageDb = z.infer<typeof ChannelMessageDbSchema>;

// skapa kanal request schema
export const CreateChannelSchema = z.object({
  // senderId for POST: server will derive senderId from the authenticated token
  senderName: z.string().min(1).optional(), // valfri för gäster
  name: z.string().min(1).max(30),
  message: z.string().min(1).max(500),
  isOpen: z.boolean().optional().default(true)
});
export type CreateChannelRequest = z.infer<typeof CreateChannelSchema>;

export const PayloadSchema = z.object({
  userId: z.string(),
  accesLevel: z.enum(['user', 'admin'])
});
export type Payload = z.infer<typeof PayloadSchema>; // extrahera datatyp (type signature)


  // POST channel/message Utan id för gäst
    export const MessageBodySchema = z.object({
        senderName: z.string().min(1).optional(), // valfri för gäster
        message: z.string().min(1).max(500)
      });


// schema för channel messages API response (utan pk)
export const ChannelMessageApiSchema = z.object({
  sk: z.string(),
  message: z.string(),
  senderId: z.string(),
  senderName: z.string().nullable().optional(),
  createdAt: z.string()
})
