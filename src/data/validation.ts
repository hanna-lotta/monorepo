import * as z from "zod";

export const AuthSchema = z.object({
	username: z.string().min(3).max(30),
	password: z.string().min(6).max(300)
})

export const RegisterResponseSchema = z.object({
	success: z.boolean(),
	token: z.string().optional(),
	username: z.string().optional(),
})

export type RegisterResponse = z.infer<typeof RegisterResponseSchema>

// Message items from server use senderId / recieverId 
export const MessageSchema = z.object({
	senderId: z.string(),
	recieverId: z.string(),
	message: z.string(),
	createdAt: z.string().or(z.date()),
	senderName: z.string().nullable(),
});

export const MessagesArraySchema = z.array(MessageSchema);

// Schema för kanalmeddelanden från API
export const ChannelMessageApiSchema = z.object({
  sk: z.string(),
  message: z.string(),
  senderId: z.string(),
  senderName: z.string().nullable().optional(),
  createdAt: z.string()
})