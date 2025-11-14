import './App.css'
import { NavLink, Outlet, useNavigate } from 'react-router'
import useUserStore from './store/userStore'
//import Logout from './pages/Logout'
// Users moved into the authenticated Chappy page so it's not shown on the login route
//import Channel from './pages/Channel'



function App() {
	const username = useUserStore((s) => s.user?.username)

	const navigate = useNavigate()

	return (
		<>
			<header className='nav'>
				<h1 className='appName'>CHAPPY</h1>
				<nav className='links'>
					<NavLink to="/" style={{display: 'flex', alignItems: 'center', gap: 12}}>Login</NavLink>
					<NavLink to="/chappy/" style={{display: 'flex', alignItems: 'center', gap: 12}}>Chappy</NavLink>
					<div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
						{username ? (
							<div onClick={() => { navigate('/chappy/profile') }} style={{ textDecoration: 'none', color: 'inherit', display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }}>
								<h4 style={{ paddingRight: 10, margin: 0 }}>{username}</h4>
							</div>
						) : (
							<h4 style={{ paddingRight: 10 }}>{'Gäst'}</h4>
						)}
						
					</div>
				</nav>
			</header>
			<main>
				<Outlet />
			</main>
		</>
	)
}

export default App
