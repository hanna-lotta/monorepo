import jwt from 'jsonwebtoken'

const jwtSecret: string = process.env.JWT_SECRET || ''

function createToken(userId: string): string {
	// Tiden sedan 1970-01-01 i sekunder
	const now = Math.floor(Date.now() / 1000)

	// En kvart
	const defaultExpiration: number = now + 15 * 60
	return jwt.sign({
		userId: userId,
		// TODO: lägg till accessLevel för att göra det möjligt för admin att ta bort alla
		exp: defaultExpiration
	}, jwtSecret)
}

export { createToken }