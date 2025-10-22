import * as z from "zod";

export const AuthSchema = z.object({
	username: z.string().min(3).max(30),
	password: z.string().min(6).max(300)
})

export const RegisterResponseSchema = z.object({
	success: z.boolean(),
	token: z.string().optional(),
})

export type RegisterResponse = z.infer<typeof RegisterResponseSchema>