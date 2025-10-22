import './App.css'
import { NavLink, Outlet } from 'react-router'
import Login from './pages/Login'
import Chappy from './pages/Chappy'



function App() {
  
  return (
    <>
		<h1>Monorepo</h1>
		<nav className='links'>
			<NavLink to="/">Login</NavLink>
			<NavLink to="/chappy/">Chappy</NavLink>
		</nav>
		<main>
			<Outlet />
		</main>
    </>
  )
}

export default App
