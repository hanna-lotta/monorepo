import { Outlet } from 'react-router'
import Users from './UsersList'
import ChannelsList from './ChannelsList'
import '../App.css'
import './Chappy.css'



const Chappy = () => {
   

    return (
        <div className="chappy-container" >
            {/* Left sidebar - user list */}
            <aside className='sidebar'>
                <h4>Kanaler</h4>
                <ChannelsList />
            </aside>

            {/* Center content - the routable area. */}
            <div className="chappy-main" >
                <Outlet />
            </div>

            {/* Right sidebar - user list */}
            <aside className='sidebar'>
                <Users />
            </aside>
        </div>
    )
}
export default Chappy