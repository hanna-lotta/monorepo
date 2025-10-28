import './App.css'
import { NavLink, Outlet,  } from 'react-router'

//handleGetUsers()
//TODO fixa zustand och gör handleGetUsers till en funktion så att den kan användas globalt

function App() {
  return (
	<>
	  <header className='nav'>
		<h1 className='appName'>CHAPPY</h1>
		<nav className='links'>
			<NavLink to="/">Login</NavLink>
			<NavLink to="/chappy/">Chappy</NavLink>
			<h4 style={{ paddingRight: "10px" }}>HANNA</h4>
			{/* {user.username} */} 
		</nav>
		</header>
	  <main>
		<Outlet />
	  </main>
	</>
  )
}

export default App
