import { Outlet } from 'react-router'
import Users from './UsersList'
import ChannelsList from './ChannelsList'
import '../App.css'
import CreateChannel from './CreateChannel'



const Chappy = () => {
   

    return (
        <div style={{ display: 'flex', height: '100%', }}>
            {/* Left sidebar - user list */}
            <aside className='sidebar' style={{ padding: 12 }}>
                <h4>Kanaler</h4>
                <ChannelsList />
            </aside>

            {/* Center content - the routable area. */}
            <main style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
                <Outlet />
            </main>

            {/* Right sidebar - user list */}
            <aside style={{ backgroundColor: '#0a0f0bff', width: 100, minWidth: 100, borderLeft: '1px solid var(--border)', padding: 12 }}>
                <Users />
            </aside>
        </div>
    )
}
export default Chappy