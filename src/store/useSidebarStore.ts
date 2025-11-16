import { create } from 'zustand'
import { z } from 'zod'

interface User {
  username: string
  userId: string
}

interface Channel {
  id: string
  name: string
}

interface AppState {
  users: User[]

  channels: Channel[]
  selectedUserId: string | null
  selectedChannelId: string | null
  loadingUsers: boolean
  loadingChannels: boolean
  loadUsers: () => Promise<void>
  loadChannels: () => Promise<void>
  selectUser: (id: string) => void
  selectChannel: (id: string) => void
}

const useSidebarStore = create<AppState>((set: any) => ({
  users: [],
  channels: [],
  selectedUserId: null,
  selectedChannelId: null,
  loadingUsers: false,
  loadingChannels: false,

  loadUsers: async () => {
    set({ loadingUsers: true })
    try {
      const token = localStorage.getItem('jwt')
      const headers: Record<string, string> = { 'Content-Type': 'application/json' }
      if (token) headers['Authorization'] = `Bearer: ${token}`

      const res = await fetch('/api/users', { headers })
      if (!res.ok) {
        console.error('Failed to fetch users', await res.text())
        set({ users: [] })
        return
      }
      const data = await res.json()

      // Validera users-respons med Zod
      const UserItem = z.object({ userId: z.string(), username: z.string() })
      const UserArray = z.array(UserItem)

      const parsedUsers = UserArray.safeParse(data)
      if (!parsedUsers.success) {
        console.error('Failed to validate users response', parsedUsers.error)
        set({ users: [] })
        return
      }

      set({ users: parsedUsers.data })
    } catch (err) {
      console.error('loadUsers error', err)
      set({ users: [] })
    } finally {
      set({ loadingUsers: false })
    }
  },

  loadChannels: async () => {
    set({ loadingChannels: true })
    try {
      const token = localStorage.getItem('jwt')
      const headers: Record<string, string> = { 'Content-Type': 'application/json' }
      if (token) headers['Authorization'] = `Bearer: ${token}`

      const res = await fetch('/api/channel', { headers })
      if (!res.ok) {
        console.error('Failed to fetch channels', await res.text())
        set({ channels: [] })
        return
      }
      const data = await res.json() // parsar JSON-body från server

      // Normalisera till { id, name }
      const ChannelItem = z.object({ 
		pk: z.string(), 
		name: z.string().optional() })
      const ChannelArray = z.array(ChannelItem)

      const parsed = ChannelArray.safeParse(data)
      if (!parsed.success) {
        console.error('Failed to validate channels response', parsed.error)
        set({ channels: [] })
        return
      }

      const parsedChannels: Channel[] = parsed.data.map((item) => ({
        id: item.pk.replace(/^channel#/, ''),
        name: item.name ?? '',
      }))

      set({ channels: parsedChannels })
    } catch (err) {
      console.error('loadChannels error', err)
      set({ channels: [] })
    } finally {
      set({ loadingChannels: false })
    }
  },

  selectUser: (id: string) => set({ selectedUserId: id }),
  selectChannel: (id: string) => set({ selectedChannelId: id }),
}))

export default useSidebarStore
