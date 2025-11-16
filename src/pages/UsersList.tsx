import { useEffect } from 'react';
import { useNavigate } from 'react-router'
import useSidebarStore from '../store/useSidebarStore'


// Funktion för att hämta användar-ID från JWT token
function getCurrentUserId(): string | null {
	try {
		const token = localStorage.getItem('jwt')
		if (!token) return null
		
		const payload = JSON.parse(atob(token.split('.')[1]))
		return payload.userId?.startsWith('user#') ? payload.userId.slice(5) : payload.userId
	} catch (e) {
		return null
	}
}

const Users = () => {
	const users = useSidebarStore(state => state.users)
	const loadUsers = useSidebarStore(state => state.loadUsers)
	const selectUser = useSidebarStore(state => state.selectUser)
	const navigate = useNavigate()
	
	// Hämta inloggad användares ID
	const currentUserId = getCurrentUserId()
	
	// Filtrera bort inloggad användare från listan
	const otherUsers = users.filter(user => user.userId !== currentUserId)

	useEffect(() => {
		if (users.length === 0) {
			loadUsers()
		}
	}, [loadUsers])

	return (
		<div className='sidebar'>
			<ul>
				{otherUsers.map((user) => (
					<li key={user.userId}>
						<div
							className='allUsers'
							onClick={() => {
								selectUser(user.userId)
								navigate(`/chappy/dm/${user.userId}`)
							}}
						>
							{user.username}
						</div>
					</li>
				))}
			</ul>
		</div>
	)
}


export default Users;