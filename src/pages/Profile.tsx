import { useState } from "react";
import { useNavigate } from "react-router";
import { useUserStore } from "../store/userStore";
import './Profile.css';

interface DeleteUserResponse {
	success: boolean;
	userId: string;
}

function getUserIdFromToken(token:string): string | null {
	try {
		const payload = JSON.parse(atob(token.split('.')[1]))
		return payload.userId?.startsWith('user#') ? payload.userId.slice(5) : payload.userId
	} catch (e) {
		return null
	}
}

const Profile = () => {
	const userName = useUserStore((s) => s.user?.username)
	const [deleteError, setDeleteError] = useState<string | null>(null)

	const navigate = useNavigate()
	const logout = useUserStore((s) => s.logout)
	console.log('Logout', logout);

	const handleLogout = () => {
		logout()
		console.log('Logout', logout);
		navigate('/')
	}

	const handleDeleteAccount = async () => {
		const confirmed = window.confirm('Är du säker på att du vill radera ditt konto?') //inbyggd modal som webbläsaren ritar själv.
		if (!confirmed) return

		setDeleteError(null) // Rensa tidigare fel

		
		const token = localStorage.getItem('jwt')
		if (!token) {
			console.error('Ingen JWT hittades vid försök att radera konto')
			return
		}

		const userId = getUserIdFromToken(token)
		if (!userId) {
			console.error('Ingen userId i token')
			return
		}

		try {
			const headers: Record<string, string> = { 'Content-Type': 'application/json' }
			if (token) headers['Authorization'] = `Bearer: ${token}`
			const res = await fetch(`/api/users/${userId}`, { method: 'DELETE', headers })
			
			if (!res.ok) {
				setDeleteError('Kunde inte radera konto')
				return
			}

			const data: DeleteUserResponse = await res.json()
			if (data.success) {
				logout()
				navigate('/')
			} else {
				setDeleteError('Kunde inte radera konto')
			}
		} catch (err) {
			console.error('Fel vid radera-anropet', err)
			setDeleteError('Kunde inte radera konto')
		}
	}

	return (
		<div className="profileContainer" >
			<h3>{userName}</h3>
			<div className="profileButtons-container">
				<button onClick={handleLogout}>Logga ut</button>
				<button onClick={handleDeleteAccount}>Radera konto</button>
				
				<button>Radera skapad kanal</button>
			</div>
			{deleteError && <p className="error-message">{deleteError}</p>}
		</div>
	);
};

export default Profile;