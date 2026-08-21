import { createContext, useContext, useState, type ReactNode } from 'react'
import type { View } from '../types'

interface AppCtxValue {
  view: View
  setView: (v: View) => void
  activeProjectId: string
  setActiveProjectId: (id: string) => void
  activeReqId: string | null
  setActiveReqId: (id: string | null) => void
  aiOpen: boolean
  setAiOpen: (v: boolean) => void
  genOpen: boolean
  setGenOpen: (v: boolean) => void
}

const AppCtx = createContext<AppCtxValue>({
  view: 'home',
  setView: () => {},
  activeProjectId: 'p1',
  setActiveProjectId: () => {},
  activeReqId: null,
  setActiveReqId: () => {},
  aiOpen: false,
  setAiOpen: () => {},
  genOpen: false,
  setGenOpen: () => {},
})

export function AppProvider({ children }: { children: ReactNode }) {
  const [view, setView] = useState<View>('home')
  const [activeProjectId, setActiveProjectId] = useState('p1')
  const [activeReqId, setActiveReqId] = useState<string | null>(null)
  const [aiOpen, setAiOpen] = useState(false)
  const [genOpen, setGenOpen] = useState(false)

  return (
    <AppCtx.Provider value={{ view, setView, activeProjectId, setActiveProjectId, activeReqId, setActiveReqId, aiOpen, setAiOpen, genOpen, setGenOpen }}>
      {children}
    </AppCtx.Provider>
  )
}

export function useApp() {
  return useContext(AppCtx)
}
