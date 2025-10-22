import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { createHashRouter, RouterProvider } from 'react-router'
import './index.css'
import App from './App.tsx'
import Login from './pages/Login.tsx'
import Chappy from './pages/Chappy.tsx'


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
				path: "/chappy/",
				Component: Chappy
			}
		]
	}
])









createRoot(document.getElementById('root')!).render(
  <StrictMode>
   	<RouterProvider router={router}/>
  </StrictMode>,
)
