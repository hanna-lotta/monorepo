import { useState } from 'react'
import '../App.css'
import { RegisterResponseSchema } from '../data/validation'
import { useNavigate } from 'react-router'
import useUserStore from '../store/userStore'
import './Login.css'


interface FormData {
	username: string
	password: string
}

const Login = () => {
	const [formData, setFormData] = useState<FormData>({username: '', password: ''})
	const [errors, setErrors] = useState<{username?: string, password?: string, general?: string}>({})
	
	const [touched, setTouched] = useState<{username: boolean, password: boolean}>({username: false, password: false}) 
	
	const navigate = useNavigate();
	
	const setUser = useUserStore((s) => s.setUser)
	
	const handleGoToChappy = () => {
		navigate('/chappy/');
	}
	
	const LS_KEY = 'jwt'
	
	const ValidateForm = () => {
		const newErrors: {username?: string; password?: string} = {}

		if (!formData.username) {
			newErrors.username = 'Avändarnamn krävs'
		} else if (formData.username.length < 3) {
			newErrors.username = 'Avändarnamn måste vara minst 3 tecken'
		}

		if (!formData.password) {
			newErrors.password = 'Lösenord krävs'
		} else if (formData.password.length < 6) {
			newErrors.password = 'Lösenord måste vara minst 6 tecken'
		}
		setErrors(newErrors)
		return Object.keys(newErrors).length === 0 //kollar om newErrors är ett tomt objekt = inga fel = formuläret är OK!
	}

	const handleSubmitLogin = async () => {
		// Markera alla fält som touched vid submit
        setTouched({username: true, password: true})
		
		if (!ValidateForm()) {
			return
		}

		setErrors({}) // Rensa tidigare fel innan nätverksanropet(objekt)

		try {
			const response = await fetch('/api/login', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify(formData)
			})

			if (!response.ok) {
				console.log(`Server error: ${response.status}`)
				return
			}

			const data = await response.json()
			const validate = RegisterResponseSchema.safeParse(data)
			if (!validate.success) {
				console.log('Server returned an unexpected response')
				return
			}

			if (data.success) {
				const jwt: string | undefined = data.token
				if (!jwt) {
					console.log('Server did not return a token')
					return
				}
				localStorage.setItem(LS_KEY, jwt)
				// Servern returnerar användarnamn i login-svaret; spara det så headern kan visa det
				if (data.username) {
					localStorage.setItem('username', data.username)
					setUser({ username: data.username })
				}
				// Navigera till Chappy efter lyckad login
				navigate('/chappy/')
			} else {
				console.log('Login failed')
			}
		} catch (err) {
			console.log('Network or server error')
		}
	}
	
	const handleSubmitRegister = async () => {
		// Markera alla fält som touched vid submit
        setTouched({username: true, password: true})

		if (!ValidateForm()) {
			return
		}

		// Rensa tidigare fel innan nätverksanropet
		setErrors({})
		
		try {
			const response = await fetch('/api/register', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify(formData)
			})

			if (!response.ok) {
				console.log(`Server error: ${response.status}`)
				return
			}

			const data = await response.json()


			if (data.success) {
				const jwt: string | undefined = data.token
				if (!jwt) {
					console.log('Server did not return a token')
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
				console.log('Registration failed')
			}
		} catch (err) {
			console.log('Network or server error')
		}
	}
	
	return (
		<div className="login">
		<h2>Logga in</h2>
		<form className='form' onSubmit={(e) => { e.preventDefault(); handleSubmitLogin(); }}> 
		<p className='mustHave'>* obligatoriskt fält</p>
		<div className="label-container">
		<label>
		Användarnamn: *
		<input type="text" name="username"
		value={formData.username}
		onChange={event => {
			setFormData({...formData, username: event.target.value})
			// Validera direkt om fältet redan är touched
		if (touched.username) {
			ValidateForm()
		}
		}}
		onBlur={() => {
			setTouched(prev => ({...prev, username: true}))
			ValidateForm()
		}}
		className={errors.username && touched.username ? 'error' : ''}
		/>
		<span className={`error-text ${!(errors.username && touched.username) ? 'hidden' : ''}`}>
			{errors.username}
		</span>
		</label>
		
		<label>
		Lösenord: *
		<input type="password" 
		name="password" 
		value={formData.password}
		onChange={event => {
			setFormData({...formData, password: event.target.value})
		    if (touched.password) {
				ValidateForm()
			}
		}}
		onBlur={() => {
			setTouched(prev => ({...prev, password: true}))
			ValidateForm()
		}}
		className={errors.password && touched.password ? 'error' : ''}
		/>
		<span className={`error-text ${!(errors.password && touched.password) ? 'hidden' : ''}`}>
			{errors.password}
		</span>
		</label>
		</div>
		<button className='loginbutton' type="submit">Logga in</button>
		<button className='registerbutton' type="button" onClick={handleSubmitRegister}>Registrera</button>
		<button className='guestbutton' onClick={handleGoToChappy}>Besök Chappy som gäst</button>
		
		</form>
		</div>
	)
}
export default Login
