import { useEffect, useState, useRef } from 'react'
import { useParams } from 'react-router'
import useSidebarStore from '../store/useSidebarStore'
import { ChannelMessageApiSchema } from '../data/validation'

interface Message {
  sk: string
  message: string
  senderId: string
  senderName?: string | null
  createdAt: string
}

interface ChannelMeta {
  name: string
  isOpen: boolean
  creatorUserId?: string
}

// meddelanden för en specifik kanal
const Channel = () => {
  const { channelId } = useParams()
  const [messages, setMessages] = useState<Message[] | null>(null)
  const [channelMeta, setChannelMeta] = useState<ChannelMeta | null>(null)
  const [accessDenied, setAccessDenied] = useState<boolean>(false)
  const messagesRef = useRef<HTMLDivElement | null>(null)
  const channels = useSidebarStore(state => state.channels)
  const loadChannels = useSidebarStore(state => state.loadChannels)
  const [inputText, setInputText] = useState<string>('')
  const [isSending, setIsSending] = useState<boolean>(false)

  useEffect(() => { // körs när komponenten mountas eller när dependencies ändras
    if (!channelId) 
		return
    if (channels.length === 0) { // Om kanallistan är tom, ladda alla kanaler från servern först
      // Detta säkerställer att kanalnamn är tillgängligt
      loadChannels()
    }
    // hämta kanaldata
	// Hämtar JWT-token från localStorage för autentisering
	// Skapar HTTP-headers med Content-Type
	// Lägger till Authorization-header om token finns
    const loadChannel = async () => {
      try {
        const token = localStorage.getItem('jwt')
        const headers: Record<string, string> = { 'Content-Type': 'application/json' }
        if (token) 
			headers['Authorization'] = `Bearer: ${token}`

        // Hämta meddelanden (servern kontrollerar isOpen automatiskt)
        const res = await fetch(`/api/channel/${channelId}`, { headers })
        if (!res.ok) {
          if (res.status === 401) { //Unauthorized
            setAccessDenied(true) //sätter accessDenied till true för att visa låst-meddelande
            setMessages(null)
            // Sätter channelMeta för låst kanal
            setChannelMeta({ name: 'Låst kanal', isOpen: false }) //Rensar meddelanden och sätter channelMeta med isOpen: false
            return
          }
          if (res.status === 404) {
            console.error('Channel not found')
            setAccessDenied(true)
            return
          }
          console.error('Failed to fetch messages')
          return
        }
        
        const data = await res.json() //Om API-anropet lyckades: konvertera response till JSON
        setMessages(Array.isArray(data) ? data : null) //Sätter meddelanden (kontrollerar att det är en array)
        setAccessDenied(false)
        
        // Sätt channelMeta baserat på att vi kunde hämta meddelanden
        // Om vi kommer hit så är kanalen antingen öppen eller vi har giltig JWT
        const channelInfo = channels.find(c => String(c.id) === String(channelId))
        setChannelMeta({ 
          name: channelInfo?.name || 'Okänd kanal', 
          isOpen: !token || true, // Anta öppen om ingen token behövdes, eller true om token funkade
          creatorUserId: undefined 
        })
        
      } catch (err) {
        console.error('Error loading channel:', err)
        setAccessDenied(true) //Hanterar nätverksfel eller andra exceptions
        // Sätter accessDenied vid fel
      }
    }
    loadChannel()
  }, [channelId])

  // Körs när messages ändras
  // Scrollar automatiskt ner till senaste meddelandet
  useEffect(() => {
    if (messagesRef.current) {
      messagesRef.current.scrollTop = messagesRef.current.scrollHeight
    }
  }, [messages])

  const displayName = channelMeta?.name || 'Okänd kanal' 

  const sendMessage = async (text: string) => {
	if (!text || !channelId) 
		return
	
	
	const token = localStorage.getItem('jwt')
	setIsSending(true)

	try { 
		const headers: Record<string, string> = { 'Content-Type': 'application/json' }
		if (token) headers['Authorization'] = `Bearer: ${token}`
		const body = JSON.stringify({ message: text })
		
		const res = await fetch(`/api/channel/${channelId}/message`, { method: 'POST', headers, body })
		if (!res.ok) {
			if (res.status === 401) { //Unauthorized
				console.error('Cannot send message: authentication required')
				return
			}
			console.error('Failed to send channel message', await res.text())
			return
		}
		const created = await res.json()
		
		// Validera meddelandet med Zod
		const validation = ChannelMessageApiSchema.safeParse(created)
		if (!validation.success) {
			console.error('Server returned invalid message format:', created)
			return
		}
		
		// Om lyckat: lägg till det nya meddelandet i state
    	setMessages(prev => prev ? [...prev, validation.data] : [validation.data])
		setInputText('') //Rensar inputfältet efter skickat meddelande
	} catch (err) {
		console.error('Error sending channel message:', err)
	} finally {
		setIsSending(false)
	}
  }

  return (
    <div className="channelContainer" style={{ display: 'flex', flexDirection: 'column', height: '100%', textAlign: 'left' }}>
      <h2 className='displayName'>{displayName}</h2>
      
      {accessDenied ? ( //accessDenied: Visa låst-meddelande
        <div style={{ textAlign: 'center', padding: '20px', color: '#666' }}>
          <p>Denna kanal är låst. Du måste logga in för att se meddelanden.</p>
        </div>
      ) : messages ? ( //messages finns: Visa meddelanden + input-fält
        <>
          <div className="messagesArea channelMessagesArea" ref={messagesRef} style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
            {messages.map((m) => (
              <div key={m.sk} style={{ padding: 8, borderBottom: '1px solid #ddd' }}>
                <div style={{ fontWeight: 'bold' }}>{m.senderName ?? m.senderId}</div>
                <div>{m.message}</div>
                <div style={{ fontSize: 12, color: '#666' }}>{new Date(m.createdAt).toLocaleString()}</div>
              </div>
            ))}
          </div>
          
          {/* Visa input bara om meddelanden laddades (indikerar åtkomst) */}
          <div className='messageInput'>
            <input 
              className='messageInputField'
              type="text"
              placeholder='Skriv ett meddelande...'
              value={inputText}
              onChange={e => setInputText(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && !isSending) {
                  sendMessage(inputText)
                }
              }}
              disabled={isSending}
            />
          </div>
        </>
      ) : (
        <div>Laddar...</div>
      )}
    </div>
  )
}

export default Channel
