
import { useState } from 'react'
import { CreateChannelSchema } from '../../srcServer/data/validation'

const CreateChannel = () => {
	const [name, setName] = useState('')
	const [senderName, setSenderName] = useState('')
	const [message, setMessage] = useState('')
  	const [isOpen, setIsOpen] = useState(true)
  	const [isSubmitting, setIsSubmitting] = useState(false)

	const createChannel = async () => {
		const parsed = CreateChannelSchema.safeParse({ 
			name, 
			senderName: senderName || undefined, // skicka undefined om tom för optional
			message,
			isOpen 
		}) 
		if (!parsed.success) {
			console.error('Validation failed:', parsed.error)
			return
		}
		setIsSubmitting(true)
		try {
			const token = localStorage.getItem('jwt')
			const headers: Record<string, string> = { 'Content-Type': 'application/json' }
			if (token) headers['Authorization'] = `Bearer: ${token}`
			const res = await fetch('/api/channel', {
				method: 'POST',
				headers,
				body: JSON.stringify(parsed.data)
			})
			if (!res.ok) {
				console.error('Failed to create channel', await res.text())
				return
			}
			const created = await res.json()
			console.log('Channel created:', created)
			// Rensa formuläret efter skapande
			setName('')
			setSenderName('')
			setMessage('')
			setIsOpen(true) //Boolean
		} catch (err) {
			console.error('Error creating channel:', err)
		} finally {
			setIsSubmitting(false)
		}
	}	
	return (
		<div style={{ maxWidth: 400, margin: '0 auto', padding: 20 }}>
			<h2>Skapa ny kanal</h2>
			<div style={{ marginBottom: 10 }}>
				<label>
					Kanalnamn:
					<input
						type="text"
						value={name}
						onChange={(e) => setName(e.target.value)}
						style={{ width: '100%', padding: 8, boxSizing: 'border-box' }}
						placeholder="Kanalens namn (max 30 tecken)"
					/>
				</label>
			</div>
			<div style={{ marginBottom: 10 }}>
				<label>
					Ditt namn (valfritt):
					<input
						type="text"
						value={senderName}
						onChange={(e) => setSenderName(e.target.value)}
						style={{ width: '100%', padding: 8, boxSizing: 'border-box' }}
						placeholder="Ditt namn som visas i kanalen"
					/>
				</label>
			</div>
			<div style={{ marginBottom: 10 }}>
				<label>
					Första meddelandet:
					<textarea
						value={message}
						onChange={(e) => setMessage(e.target.value)}
						style={{ width: '100%', padding: 8, boxSizing: 'border-box', minHeight: 60 }}
						placeholder="Första meddelandet i kanalen (max 500 tecken)"
					/>
				</label>
			</div>
			<div style={{ marginBottom: 10 }}>
				<label>
					Öppen kanal:
					<input
						type="checkbox"
						checked={isOpen}
						onChange={(e) => setIsOpen(e.target.checked)}
						style={{ marginLeft: 8 }}
					/>
					Öppen kanal (alla kan se och skriva meddelanden utan inloggning)
				</label>
			</div>
		<button 
			onClick={createChannel} 
			disabled={isSubmitting || !name.trim() || !message.trim()}
		>
			{isSubmitting ? 'Skapar...' : 'Skapa kanal'}
		</button>
		</div>
	)
}

export default CreateChannel