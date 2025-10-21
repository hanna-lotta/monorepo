import * as z from "zod"

export const registerSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters long"),
  password: z.string().min(6, "Password must be at least 6 characters long"),
})

export type RegisterSchema = z.infer<typeof registerSchema>

export const loginSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
})

export type LoginSchema = z.infer<typeof loginSchema>

export const ItemSchema = z.object({
  pk: z.string(),
  sk: z.string(),
  username: z.string(),
  password: z.string(),
  accesLevel: z.string(),
})

export const ItemsSchema = z.array(ItemSchema)

export type ItemSchema = z.infer<typeof ItemSchema>
export type ItemsSchema = z.infer<typeof ItemsSchema>