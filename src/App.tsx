import { useState } from 'react'
import './App.css'
import { AuthSchema } from './data/validation'

interface FormData {
	username: string
	password: string
}

interface UserResponse {
	username: string
	userId: string
}
interface Touched {
	username: boolean
	password: boolean
}

function App() {
  const [formData, setFormData] = useState<FormData>({username: '', password: ''})
  const [authErrorMessage, setAuthErrorMessage] = useState<string>('')
  const [users, setUsers] = useState<UserResponse[]>([])
  //const [touched, setTouched] = useState<Touched>({username: false, password: false}) //TODO gör färdigt

  return (
    <>
	 <main>
		<h1>Monorepo</h1>
		<div className="login-form">
			<h2>Logga in</h2>
			<form className='form'>
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
				<button className='registerbutton' type="submit">Registrera</button>
			</form>
		</div>
	 </main>
    </>
  )
}

export default App
