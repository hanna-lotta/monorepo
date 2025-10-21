import * as z from "zod";

export const AuthSchema = z.object({
	username: z.string().min(2).max(30),
	password: z.string().min(2).max(300)
})