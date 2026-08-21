import { createContext, useContext, useState, type Dispatch, type ReactNode, type SetStateAction } from 'react'
import type { BRD, ServerStatus, Source, View } from '../types'

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
  // ── Live Ariadne slice ──
  liveSource: Source | null
  setLiveSource: Dispatch<SetStateAction<Source | null>>
  liveBRD: BRD | null
  setLiveBRD: Dispatch<SetStateAction<BRD | null>>
  serverStatus: ServerStatus
  setServerStatus: Dispatch<SetStateAction<ServerStatus>>
  /** Ariadne gate: PRD is only unlocked once the live BRD is complete. */
  prdUnlocked: boolean
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
  liveSource: null,
  setLiveSource: () => {},
  liveBRD: null,
  setLiveBRD: () => {},
  serverStatus: { ok: false, dbConfigured: false, mode: 'offline', detail: 'Backend not checked yet.' },
  setServerStatus: () => {},
  prdUnlocked: false,
})

export function AppProvider({ children }: { children: ReactNode }) {
  const [view, setView] = useState<View>('home')
  const [activeProjectId, setActiveProjectId] = useState('p1')
  const [activeReqId, setActiveReqId] = useState<string | null>(null)
  const [aiOpen, setAiOpen] = useState(false)
  const [genOpen, setGenOpen] = useState(false)
  const [liveSource, setLiveSource] = useState<Source | null>(null)
  const [liveBRD, setLiveBRD] = useState<BRD | null>(null)
  const [serverStatus, setServerStatus] = useState<ServerStatus>({
    ok: false,
    dbConfigured: false,
    mode: 'offline',
    detail: 'Backend not checked yet.',
  })

  return (
    <AppCtx.Provider
      value={{
        view, setView,
        activeProjectId, setActiveProjectId,
        activeReqId, setActiveReqId,
        aiOpen, setAiOpen,
        genOpen, setGenOpen,
        liveSource, setLiveSource,
        liveBRD, setLiveBRD,
        serverStatus, setServerStatus,
        prdUnlocked: !!liveBRD?.complete,
      }}
    >
      {children}
    </AppCtx.Provider>
  )
}

export function useApp() {
  return useContext(AppCtx)
}
