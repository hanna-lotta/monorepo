import { useState } from 'react'
import '../App.css'
import { AuthSchema, RegisterResponseSchema } from '../data/validation'
import { useNavigate } from 'react-router'
import useUserStore from '../store/userStore'

//dubbel?_flytta
interface FormData {
	username: string
	password: string
}
/*
interface Touched {
username: boolean
password: boolean
}
*/


const Login = () => {
	const [formData, setFormData] = useState<FormData>({username: '', password: ''})
	//const [authErrorMessage, setAuthErrorMessage] = useState<string>('')
	
	//const [touched, setTouched] = useState<Touched>({username: false, password: false}) 
	const [errorMessage, setErrorMessage] = useState<string | null>(null)
	
	const navigate = useNavigate();
	
	const setUser = useUserStore((s) => s.setUser)
	
	const handleGoToChappy = () => {
		navigate('/chappy/');
	}
	
	const LS_KEY = 'jwt'
	
	
	const handleSubmitLogin = async () => {
		
		const parsed = AuthSchema.safeParse(formData)
		if (!parsed.success) {
			setErrorMessage('Please fill in valid username and password')
			return
		}
		setErrorMessage(null) // Rensa tidigare fel innan nätverksanropet
		try {
			const response = await fetch('/api/login', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify(formData)
			})

			if (!response.ok) {
				setErrorMessage(`Server error: ${response.status}`)
				return
			}

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
				// Server returns username in login response; save it so header can display it
				if (data.username) {
					localStorage.setItem('username', data.username)
					setUser({ username: data.username })
				}
				// Navigera till Chappy efter lyckad login
				navigate('/chappy/')
			} else {
				setErrorMessage('Login failed')
			}
		} catch (err) {
			setErrorMessage('Network or server error')
		}
	}
	
	const handleSubmitRegister = async () => {
		// Validera lokalt innan request
		const parsed = AuthSchema.safeParse(formData)
		if (!parsed.success) {
			setErrorMessage('Please fill in valid username and password')
			return
		}
		// Rensa tidigare fel innan nätverksanropet
		setErrorMessage(null)
		// TODO: gör register-knappen disabled tills denna funktion är färdig
		try {
			const response = await fetch('/api/register', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify(formData)
			})

			if (!response.ok) {
				setErrorMessage(`Server error: ${response.status}`)
				return
			}

			const data = await response.json()

			// Validera svaret från servern med Zod
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
				// Spara username från servern om det returneras
				if (data.username) {
					localStorage.setItem('username', data.username)
					setUser({ username: data.username })
				}
				// Navigera till Chappy efter lyckad registrering
				navigate('/chappy/')
			} else {
				setErrorMessage('Registration failed')
			}
		} catch (err) {
			setErrorMessage('Network or server error')
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
		<button className='guestbutton' onClick={handleGoToChappy}>Besök Chappy som gäst</button>
		{errorMessage && <p className='error'>{errorMessage}</p>}
		</form>
		</div>
	)
}
export default Login
