import { useEffect } from 'react';
import { useNavigate } from 'react-router'
import useSidebarStore from '../store/useSidebarStore'

// UserResponse shape is managed in the zustand store; keep shape inline in store file.

const Users = () => {
	const users = useSidebarStore(state => state.users)
	const loadUsers = useSidebarStore(state => state.loadUsers)
	const selectUser = useSidebarStore(state => state.selectUser)
	const navigate = useNavigate()

	useEffect(() => {
		if (users.length === 0) {
			loadUsers()
		}
	}, [loadUsers])

	return (
		<div className='sidebar'>
			<ul>
				{users.map((user) => (
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