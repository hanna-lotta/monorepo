import express from 'express'
import type { Router, Request, Response } from 'express'
import { db, tableName } from '../data/dynamoDb.js';
import { createToken } from '../data/auth.js';
import { genSalt, hash } from 'bcrypt'
import { registerSchema } from '../auth/validation.js';
import { PutCommand } from '@aws-sdk/lib-dynamodb';
import { JwtResponse, UserBody } from '../data/types.js';
import { ErrorMessage } from '../data/types.js';

const router: Router = express.Router();

// Request; 1;P = route params (t.ex. { userId: string })
// 2. ResBody = det förväntade response‑body‑typen (vad res.send(...) returnerar)
// 3. ReqBody = request body (vad klienten POST:ar)
// 4. ReqQuery = query‑string typen
// man ka ha unknown istället för jwtresponse för det är redan typad
router.post('/', async (req: Request<{}, JwtResponse, UserBody>, res: Response<JwtResponse | ErrorMessage>) => {
	const validation = registerSchema.safeParse(req.body);
	if (!validation.success) {
		res.status(400).send({error: "Invalid request body"}); //Bad request
		return;
	}

	const newId = crypto.randomUUID()

	//Funktion från bcrypt som genererar en "salt"-sträng.
	// Genom att anropa utan argument används ett standardantal rounds (ofta 10) — du kan ange ett tal: genSalt(12).
	//Den returnerar en Promise (därav await) som ger en string, t.ex. "$2b$10$Kix...".
	const salt: string = await genSalt()
	const hashed: string = await hash(validation.data.password, salt)
	// Tar lösenordet (plain text) och saltet, kör bcrypt-algoritmen och returnerar en Promise som ger den hashade strängen.
	const { username, password } = validation.data

	const command = new PutCommand({
		TableName: tableName,
		Item: {
			username: validation.data.username,
			password: hashed,
			accesLevel: 'user', //TODO lägga till admin
			pk: 'User',
			sk: 'user#' + newId
		}
	});
	try {
		const result = await db.send(command)
		const token: string | null = createToken(newId, 'user')
		res.send({ success: true, token: token }) //user får jwt token

	} catch(error) {
		console.log(`register.ts fel:`, (error as any)?.message)
		res.status(500).send({ success: false })
	}
});




export default router