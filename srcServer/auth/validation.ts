import * as z from "zod"

export const registerSchema = z.object({
  username: z.string().min(3),
  password: z.string().min(6),
})

export type RegisterSchema = z.infer<typeof registerSchema>

export const loginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
})

export type LoginSchema = z.infer<typeof loginSchema>

export const ItemSchema = z.object({
  pk: z.string(),
  sk: z.string(),
  username: z.string(),
  password: z.string(),
  accesLevel: z.string(),
})

export const ItemsSchema = z.array(ItemSchema) //z.array(ItemSchema)
//Skapar ett Zod-schema som beskriver "en array där varje element matchar ItemSchema". ItemSchema är ett tidigare definierat Zod‑schema (för ett enskilt user/item).

export type ItemSchema = z.infer<typeof ItemSchema>
export type ItemsSchema = z.infer<typeof ItemsSchema>