import * as z from 'zod'




export const PostDmSchema = z.object({
  message: z.string().min(1).max(500),
  senderId: z.string().min(1),
  recieverId: z.string().min(1),
})


export const DmSchema = z
  .object({
    senderId: z.string(),
    recieverId: z.string(), // stavat fel i DB
    message: z.string().max(500),
    senderName: z.string().nullable(), // senderName may be missing or explicitly null in older items; accept string | null | undefined
    createdAt: z
      .string()
      .refine((s) => !isNaN(new Date(s).getTime()), { message: 'createdAt must be a valid date string' })
      .transform((str) => new Date(str)),  // createdAt is a string in DB; expect a valid ISO timestamp.
    // so validate reliably and transform to Date. Invalid dates will fail validation.
    
  })
export const UserSchema = z.object({
  pk: z.literal('User'),
  sk: z.string(),
  username: z.string().min(1),
 
})

export const ChannelSchema = z.object({
  pk: z.string(),
  sk: z.string(),
  createdAt: z
	.string()
	.refine((s) => !isNaN(new Date(s).getTime()), { message: 'createdAt must be a valid date string' })
	.transform((str) => new Date(str)),
  senderId: z.string(),
  senderName: z.string(),
  name: z.string().min(1).max(30),
  message: z.string().min(1).max(500),
  //accesLevel: z.string().optional(),
})	
export const PayloadSchema = z.object({
  userId: z.string(),
  accesLevel: z.enum(['user', 'admin'])
});
export type Payload = z.infer<typeof PayloadSchema>;
