import { useEffect, useState } from 'react'
import '../App.css'


interface UserResponse {
	username: string
	userId: string
}

interface Message {
	userId: string
	userId2: string
	message: string
	createdAt: string
	senderName: string | null
}

const Chappy = () => {
	const [users, setUsers] = useState<UserResponse[]>([])
	const [messages, setMessages] = useState<Message[] | null>(null)

	useEffect(() => {
		// load users on mount
		handleGetUsers()
	}, [])

	// Hjälp: hämta userId från token (enkel, okrypterad decode — bra nog på client)
	function getUserIdFromToken(): string | null {
		const token = localStorage.getItem('jwt')
		if (!token) return null
		try {
			const payload = JSON.parse(atob(token.split('.')[1]))
			// payload.userId kan ha format 'user#abc' eller bara id; anpassa nedan om behövs
			return payload.userId?.startsWith('user#') ? payload.userId.slice(5) : payload.userId
		} catch (e) {
			return null
		}
		}

	const handleGetUsers = async () => {
		try {
			const token = localStorage.getItem('jwt')
			const headers: Record<string, string> = { 'Content-Type': 'application/json' }
			if (token) headers['Authorization'] = `Bearer: ${token}`

			const response: Response = await fetch('/api/users', { headers })
			console.log('Fetch /api/users status', response.status)

			if (!response.ok) {
				const text = await response.text()
				console.error('Users request failed:', response.status, text)
				return
			}

			const data = await response.json()
			console.log('Data from server:', data)

			if (!Array.isArray(data)) {
				console.warn('Expected array from /api/users, got:', data)
				setUsers([])
				return
			}

			const userResponse: UserResponse[] = data
			setUsers(userResponse)
		} catch (err) {
			console.error('Error fetching users:', err)
		}
	}
	const handleGetMessages = async (otherUserId?: string) => {
		try {
			const token = localStorage.getItem('jwt')
			const headers: Record<string, string> = { 'Content-Type': 'application/json' }
			if (token) headers['Authorization'] = `Bearer: ${token}`

			const me = getUserIdFromToken()
			if (!me) {
			console.error('Ingen inloggad användare (token saknas eller är fel).')
			return
		}
			// Om otherUserId inte skickas, prompta eller välj en default
			if (!otherUserId) {
			console.warn('Inget mål-användar-id angivet för DM-hämtning.')
			return
		}

			// /api/dm/:userA/:userB
			const url = `/api/dm/${me}/${otherUserId}`
			const response: Response = await fetch(url, { headers })
			console.log('Fetch /api/dm status', response.status)

			if (!response.ok) {
				const text = await response.text()
				console.error('DM request failed:', response.status, text)
				return
			}

			const data = await response.json()
			console.log('DM Data from server:', data)
			if (Array.isArray(data)) {
				setMessages(data as Message[])
			} else if ((data as any).data) {
				// support debug wrapper
				setMessages((data as any).data as Message[])
			}

		} catch (err) {
			console.error('Error fetching DMs:', err)
		}
	}
	return (
		<>
		<div className='chatroom'>
			<h2>Välkommen till Chappy</h2>
			<button id='getUsersButton' onClick={handleGetUsers}>Hämta användare</button>
		<div className='messagesArea'>
				<button onClick={() => handleGetMessages()}>Hämta DMs</button>
				{messages && messages.map((msg, index) => (
				  <div key={index} className="message">
					<div className="messageSender">Från: {msg.senderName}</div>
					<div className="messageContent">{msg.message}</div>
					<div className="messageTimestamp">{new Date(msg.createdAt).toLocaleString()}</div>
				  </div>
				))}
			<div className='messageInput'>
			<input className='messageInputField' type="text" placeholder="Skriv ett meddelande..." />
			</div>
		</div>
		</div>

		<div className='sidebar'>
			<ul>
				{users.map((user) => (
					<li key={user.userId}>
						<div className='allUsers' onClick={() => handleGetMessages(user.userId)}>{user.username}</div>
					</li>
				))}
			</ul>	
		</div>
		
		</>
	)
}
export default Chappy