import { useEffect } from 'react'
import { useNavigate } from 'react-router'
import useSidebarStore from '../store/useSidebarStore'


type ChannelItem = { id: string; name: string }
//lista med kanaler (metadata)
const ChannelsList = () => {
	const channels = useSidebarStore(state => state.channels)
	const loadChannels = useSidebarStore(state => state.loadChannels)
	const selectChannel = useSidebarStore(state => state.selectChannel)
	const navigate = useNavigate()
	
	useEffect(() => {
		if (channels.length === 0) {
			loadChannels()
		}
	}, [loadChannels]) //"kör när komponenten mountas
	
	return (
		<div>
		<ul>
		{channels.map((c: ChannelItem) => {
			const id = c.id
			const name = c.name
			return (
				<li key={id}>
				<div
				className='allChannels'
				style={{ cursor: 'pointer' }}
				onClick={() => {
					if (!id) 
						return
					selectChannel(id)
					navigate(`/chappy/channel/${id}`)
				}}
				>
				{name}
				</div>
				</li>
			)
		})}
		</ul>
		<div>
			<button className='createChannelButton' onClick={() => navigate('/chappy/create-channel')}>Skapa ny kanal</button>
		</div>
		</div>
	)
}

export default ChannelsList