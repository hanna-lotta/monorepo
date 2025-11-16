export interface ErrorMessage {
  error: string;
  issues?: unknown; 
}

export interface UserBody {
  username: string;
  password: string;
}
// Beskriver user-items från databasen
export interface UserItem {
	pk: string;
	sk: string;
	username: string;
	password: string;
	accesLevel: string;
}

export interface JwtResponse {
	success: boolean;
	token?: string;  // JWT
	username?: string;
}
export interface CreateDmBody {
	message: string;
	senderId?: string; // optional for POST: server derives from token
	recieverId: string;
}