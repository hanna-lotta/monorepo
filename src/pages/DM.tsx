import { useEffect, useState, useRef } from 'react'
import { useParams } from 'react-router'
import '../App.css'
import { MessagesArraySchema, MessageSchema } from '../data/validation'
import useSidebarStore from '../store/useSidebarStore'

interface Message {
		senderId: string
		recieverId: string
	message: string
	createdAt: string | Date
	senderName: string | null
}
/*localStorage.getItem('jwt') — hämtar token.
token.split('.')[1] — tar payload-delen i JWT (header.payload.signature).
atob(...) — base64-avkodar payload → rå sträng.
JSON.parse(...) — gör payload-strängen till ett JS-objekt.
return payload.userId?.startsWith('user#') ? payload.userId.slice(5) : payload.userId — tar bort user#-prefix om det finns.*/
function getUserIdFromToken(token: string): string | null {
	try {
		const payload = JSON.parse(atob(token.split('.')[1]))
		return payload.userId?.startsWith('user#') ? payload.userId.slice(5) : payload.userId
	} catch (e) {
		return null
	}
}

const DM = () => {
	const { userId } = useParams()
	const [messages, setMessages] = useState<Message[] | null>(null)
	const messagesRef = useRef<HTMLDivElement | null>(null)
	const [inputText, setInputText] = useState<string>('')
	const [isSending, setIsSending] = useState<boolean>(false)
	
	// Hämta användardata från store
	const users = useSidebarStore(state => state.users)
	const loadUsers = useSidebarStore(state => state.loadUsers)
	
	// Hitta användarnamnet baserat på userId
	const user = users.find(u => u.userId === userId)
	const displayName = user?.username || 'Okänd användare'
	
	useEffect(() => {
		// Ladda användare om listan är tom
		if (users.length === 0) {
			loadUsers()
		}
	}, [users.length, loadUsers])
	
	useEffect(() => {
		const fetchDMs = async () => {
			if (!userId) return
			const token = localStorage.getItem('jwt')
			if (!token) {
				console.error('No JWT found for DM fetch')
				return
			}
			const me = getUserIdFromToken(token)
			if (!me) {
				console.error('No logged in user for DM fetch')
				return
			}
			try {
			const headers: Record<string, string> = { 'Content-Type': 'application/json' }
			if (token) headers['Authorization'] = `Bearer: ${token}`
				
				const res = await fetch(`/api/dm/${me}/${userId}`, { headers })
				console.log('DM fetch status', res.status)
				if (!res.ok) {
					console.error('DM fetch failed', await res.text())
					setMessages(null)
					return
				}
				
				const data = await res.json()
				console.log('DM Data from server:', data)
				
				// Servern returnerar alltid en array direkt
				const parsed = MessagesArraySchema.safeParse(data);
				if (parsed.success) {
					setMessages(parsed.data);
				} else {
					console.error('DM payload validation failed:', parsed.error);
					setMessages(null);
				}
				
			} catch (err) {
				console.error('Error fetching DMs:', err)
				setMessages(null)
			}
		}
		
		fetchDMs()
	}, [userId])

	
	const sendMessage = async (text: string) => {
		if (!text || !userId) 
			return
		const token = localStorage.getItem('jwt')
		if (!token) {
			console.error('No JWT for sendMessage')
			return
		}
		setIsSending(true)
		try {
			const headers: Record<string, string> = { 'Content-Type': 'application/json' }
			if (token) headers['Authorization'] = `Bearer: ${token}`
			const body = JSON.stringify({ message: text, recieverId: userId })
			const res = await fetch('/api/dm', { method: 'POST', headers, body })
			if (!res.ok) {
				console.error('Failed to send DM', await res.text())
				return
			}
			const created = await res.json()
			
			// Validera det nya meddelandet från servern
			const validation = MessageSchema.safeParse(created)
			if (!validation.success) {
				console.error('Created message validation failed:', validation.error)
				return
			}
			
			setMessages(prev => prev ? [...prev, validation.data] : [validation.data])
			setInputText('')
		} catch (err) {
			console.error('Error sending DM:', err)
		} finally {
			setIsSending(false)
		}
	}

	// scrolla till botten när meddelanden ändras
	useEffect(() => {
		if (messagesRef.current) {
			messagesRef.current.scrollTop = messagesRef.current.scrollHeight
		}
	}, [messages])
	
	return (
		<div className='DMchatroom' style={{ display: 'flex', flexDirection: 'column', height: '100%', textAlign: 'left' }}>
			<h2 className='displayName'>{displayName}</h2>
			
			<div ref={messagesRef} className='messagesArea'>
				{messages && messages.map((msg, idx) => (
					<div key={idx} className="message" style={{ padding: 8, borderBottom: '1px solid #ddd' }}>
						<div className="messageSender" style={{ fontWeight: 'bold' }}>{msg.senderName}</div>
						<div className="messageContent">{msg.message}</div>
						<div className="messageTimestamp" style={{ fontSize: 12, color: '#666' }}>{new Date(msg.createdAt).toLocaleString()}</div>
					</div>
				))}
			</div>
			
			<div className='messageInput'>
				<input
					className='messageInputField'
					type="text"
					placeholder="Skriv ett meddelande..."
					value={inputText}
					onChange={e => setInputText(e.target.value)}
					onKeyDown={(e) => {
						if (e.key === 'Enter') {
							e.preventDefault()
							sendMessage(inputText)
						}
					}}
					disabled={isSending}
				/>
			</div>
		</div>
	)
}

export default DM
