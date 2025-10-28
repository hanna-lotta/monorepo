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

	const handleGetUsers = async () => {
		try {
			const token = localStorage.getItem('jwt')
			const headers: Record<string, string> = { 'Content-Type': 'application/json' }
			if (token) headers['Authorization'] = `Bearer ${token}`

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
	const handleGetMessages = async () => {
		try {
			const token = localStorage.getItem('jwt')
			const headers: Record<string, string> = { 'Content-Type': 'application/json' }
			if (token) headers['Authorization'] = `Bearer ${token}`

			// for now call the conversation between user 2 and 3 (adjust as needed)
			const response: Response = await fetch('/api/dm/2/3', { headers })
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
				<button onClick={handleGetMessages}>Hämta DMs</button>
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
						<div className='allUsers'>{user.username}</div>
					</li>
				))}
			</ul>	
		</div>
		
		</>
	)
}
export default Chappy