import jwt from 'jsonwebtoken'

const jwtSecret: string = process.env.JWT_SECRET || ''

function createToken(userId: string, accesLevel: string): string {
	// Tiden sedan 1970-01-01 i sekunder
	const now = Math.floor(Date.now() / 1000)

	// En timme
	const defaultExpiration: number = now + 60 * 60
	return jwt.sign({
		userId: userId,
		accesLevel: accesLevel || 'user',
		exp: defaultExpiration
	}, jwtSecret)
}

export { createToken }