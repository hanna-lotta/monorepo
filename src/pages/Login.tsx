import { useState } from 'react'
import '../App.css'
import { AuthSchema, RegisterResponseSchema } from '../data/validation'

//dubbel_flytta
interface FormData {
	username: string
	password: string
}
/*
interface UserResponse {
	username: string
	userId: string
}
interface Touched {
	username: boolean
	password: boolean
}
*/


const Login = () => {
	const [formData, setFormData] = useState<FormData>({username: '', password: ''})
	  //const [authErrorMessage, setAuthErrorMessage] = useState<string>('')
	  //const [users, setUsers] = useState<UserResponse[]>([])
	  //const [touched, setTouched] = useState<Touched>({username: false, password: false}) 
	  const [errorMessage, setErrorMessage] = useState<string | null>(null)
	
			const LS_KEY = 'jwt'
	
				const handleGetUsers = () => {
				// TODO: fetch users and update state
				console.log('Fetching users...')
			}
	
				const handleSubmitLogin = async () => {
					setErrorMessage(null)
					const localValidate = AuthSchema.safeParse(formData)
					if (!localValidate.success) {
						setErrorMessage('Please fill in valid username and password')
						return
					}
					const response = await fetch('/api/login', {
						method: 'POST',
						headers: {
							'Content-Type': 'application/json'
						},
						body: JSON.stringify(formData)
					})
					const data = await response.json()
					const validate = RegisterResponseSchema.safeParse(data)
					if (!validate.success) {
						setErrorMessage('Server returned an unexpected response')
						return
					}
	
					if (data.success) {
						const jwt: string | undefined = data.token
						if (!jwt) {
							setErrorMessage('Server did not return a token')
							return
						}
						localStorage.setItem(LS_KEY, jwt)
						handleGetUsers()
					} else {
						setErrorMessage('Login failed')
					}
				}
	
			const handleSubmitRegister = async () => {
				// Validera lokalt innan request
				const localValidate = AuthSchema.safeParse(formData)
				if (!localValidate.success) {
					setErrorMessage('Please fill in valid username and password')
					return
				}
			// TODO: gör register-knappen disabled tills denna funktion är färdig
			const response = await fetch('/api/register', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify(formData)
			})
			const data = await response.json()
	
			// Vi tittar i backend: filen srcServer/routes/register.ts
			// Servern skickar tillbaka ett objekt: { success: boolean, token?: string }
			setErrorMessage(null)
			// Validera svaret från servern med Zod
			const validate = RegisterResponseSchema.safeParse(data)
			if (!validate.success) {
				setErrorMessage('Server returned an unexpected response')
				return
			}
	
			if( data.success ) {
				const jwt: string | undefined = data.token
				if (!jwt) {
					setErrorMessage('Server did not return a token')
					return
				}
				localStorage.setItem(LS_KEY, jwt)
				// spara, använd i framtida request
				// uppdatera listan med användare:
				// Alt. 1: skicka nytt request till servern (som om man klickar på knappen "Visa alla användare")
				// Alt. 2: uppdatera state-variabeln direkt <- går inte, eftersom vi inte har userId
				handleGetUsers()  // alt. 1
				// TODO: rensa formuläret, så man inte reggar samma användare igen
			} else {
				setErrorMessage('Registration failed')
			}
		}
	
	return (
		<div className="login-form">
			<h2>Logga in</h2>
			<form className='form' onSubmit={(e) => { e.preventDefault(); handleSubmitLogin(); }}>
				<p className='mustHave'>* obligatoriskt fält</p>
				<label>
					Användarnamn: *
					<input type="text" name="username"
					value={formData.username}
					onChange={event => setFormData({...formData, username: event.target.value})}
					/>
				</label>
				
				<label>
					Lösenord: *
					<input type="password" name="password" 
					value={formData.password}
					onChange={event => setFormData({...formData, password: event.target.value})}
					
					/>
				</label>
				
				<button className='loginbutton' type="submit">Logga in</button>
				<button className='registerbutton' type="button" onClick={handleSubmitRegister}>Registrera</button>
				{errorMessage && <p className='error'>{errorMessage}</p>}
			</form>
		</div>
	)
}
export default Login
