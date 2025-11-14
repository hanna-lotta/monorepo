import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { createHashRouter, RouterProvider } from 'react-router'
import './index.css'
import App from './App.tsx'
import Login from './pages/Login.tsx'
import Chappy from './pages/Chappy.tsx'
import Channel from './pages/Channel.tsx'
import CreateChannel from './pages/CreateChannel.tsx'
import Profile from './pages/Profile.tsx'
import DM from './pages/DM.tsx'

//'/chappy/' → renders the Chappy layout component. Inside Chappy, the <Outlet /> will render the active child:
//'#/chappy/channel/:channelId' → renders Channel inside Chappy (center area).
//'#/chappy/profile' → renders Profile inside Chappy (in the same outlet).
const router = createHashRouter ([
	{
		path: '/',
		Component: App,
		children: [
				{
					index: true,
					Component: Login
				},
				{
					path: "chappy",
					Component: Chappy,
					children: [
						{
							path: "channel/:channelId",
							Component: Channel,
						},
						{
							path: "create-channel",
							Component: CreateChannel,
						},
						{
							path: "dm/:userId",
							Component: DM,
						},
						{
							path: "profile",
							Component: Profile,
						}
					]
				}
		]
	}
])









createRoot(document.getElementById('root')!).render(
  <StrictMode>
   	<RouterProvider router={router}/>
  </StrictMode>,
)
