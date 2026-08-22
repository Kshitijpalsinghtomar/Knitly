import { createContext, useContext, useState, type Dispatch, type ReactNode, type SetStateAction } from 'react'
import type { BRD, ServerStatus, Source, View } from '../types'
import { getBRD, getSource } from '../lib/api'

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
  /** Id of the BRD currently open in the document viewer (drives navigation). */
  activeBRDId: string | null
  setActiveBRDId: (id: string | null) => void
  /** Persisted source selected for generation (e.g. chosen from a browse list). */
  activeSource: Source | null
  setActiveSource: Dispatch<SetStateAction<Source | null>>
  /** Open a specific persisted BRD by id — resolves + renders IT (not a fixture). */
  openBRD: (id: string) => Promise<void>
  /** Navigate back to the browse/list surface for documents & sources. */
  cancelDocument: () => void
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
  activeBRDId: null,
  setActiveBRDId: () => {},
  activeSource: null,
  setActiveSource: () => {},
  openBRD: () => Promise.resolve(),
  cancelDocument: () => {},
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
  const [activeBRDId, setActiveBRDId] = useState<string | null>(null)
  const [activeSource, setActiveSource] = useState<Source | null>(null)
  const [serverStatus, setServerStatus] = useState<ServerStatus>({
    ok: false,
    dbConfigured: false,
    mode: 'offline',
    detail: 'Backend not checked yet.',
  })

  const openBRD = async (id: string) => {
    setActiveBRDId(id)
    setActiveReqId(null)
    // Resolve the full BRD (its own requirements/conflicts) so the viewer is real.
    try {
      const brd = await getBRD(id)
      setLiveBRD(brd)
      if (brd.sourceId) {
        try {
          const src = await getSource(brd.sourceId)
          setLiveSource(src)
        } catch {
          /* source title is best-effort */
        }
      }
    } catch {
      // Leave liveBRD as-is; viewer will show a load error with retry.
      setLiveBRD(null)
    }
    setView('document')
  }

  const cancelDocument = () => {
    setLiveBRD(null)
    setActiveBRDId(null)
    setActiveReqId(null)
    setView('workspace')
  }

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
        activeBRDId, setActiveBRDId,
        activeSource, setActiveSource,
        openBRD, cancelDocument,
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
