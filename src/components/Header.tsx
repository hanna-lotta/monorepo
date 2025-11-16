import { NavLink, useNavigate } from 'react-router';
import useUserStore from '../store/userStore';
import './Header.css';

const Header = () => {
	const username = useUserStore((s) => s.user?.username)
	
	const navigate = useNavigate()
	
return (
<header className='nav'>
	<div className='nav-content'>
		<h1 className='appName'>CHAPPY</h1>
		<nav className='links'>
			<NavLink to="/" >Login</NavLink>
			<NavLink to="/chappy/">Chappy</NavLink>
			<div >
				{username ? (
					<div className="username" onClick={() => { navigate('/chappy/profile') }} >
						<h4 >{username}</h4>
					</div>
				) : (
					<h4 >{'Gäst'}</h4>
				)}
			</div>
		</nav>
	</div>
</header>
	);
};

export default Header;