import { createContext, useCallback, useContext, useEffect, useMemo, useState, type Dispatch, type ReactNode, type SetStateAction } from 'react'
import { listBRDs } from '../lib/api'
import type { BRD, DocType, ServerStatus, Source, View } from '../types'

/**
 * App-wide state, including the "live" Ariadne slice — the real (non-mock) data
 * path from ingest → BRD → downstream documents.
 *
 * The live slice is a *chain* of documents, not a single BRD: a root BRD plus
 * any downstream docs (PRD/spec/stories/…) generated from it. `liveDocs` holds
 * them all keyed by id; `activeDocId` selects the one currently on screen. The
 * common accessors (`liveBRD`, `activeDoc`, `downstreamDocs`) are derived so
 * consumers never reach into the array directly.
 */
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
  /** Every live document (root BRD + downstream docs), keyed by id. */
  liveDocs: BRD[]
  /** The root BRD of the live chain (the one document with no parent). */
  liveBRD: BRD | null
  /** Downstream documents generated from the live BRD. */
  downstreamDocs: BRD[]
  /** Which document is currently on screen (falls back to the root BRD). */
  activeDocId: string | null
  setActiveDocId: (id: string | null) => void
  /** The document currently on screen. */
  activeDoc: BRD | null
  /** Add or replace a document by id and make it active. */
  upsertLiveDoc: (doc: BRD) => void
  /** Functionally update one live document in place. */
  updateLiveDoc: (id: string, updater: (doc: BRD) => BRD) => void
  /** Clear the entire live chain (source + all documents). */
  resetLive: () => void
  serverStatus: ServerStatus
  setServerStatus: Dispatch<SetStateAction<ServerStatus>>
  /** Ariadne gate: downstream docs are only unlocked once the live BRD is complete. */
  prdUnlocked: boolean
  /**
   * When the generate dialog is opened for a specific downstream type, this
   * carries the preset so the modal starts on that type (e.g. "Generate PRD"
   * from the gate card). Null = start on the default BRD flow.
   */
  genPreset: DocType | null
  setGenPreset: (t: DocType | null) => void
}

const noop = () => {}

const AppCtx = createContext<AppCtxValue>({
  view: 'home',
  setView: noop,
  activeProjectId: 'p1',
  setActiveProjectId: noop,
  activeReqId: null,
  setActiveReqId: noop,
  aiOpen: false,
  setAiOpen: noop,
  genOpen: false,
  setGenOpen: noop,
  liveSource: null,
  setLiveSource: noop,
  liveDocs: [],
  liveBRD: null,
  downstreamDocs: [],
  activeDocId: null,
  setActiveDocId: noop,
  activeDoc: null,
  upsertLiveDoc: noop,
  updateLiveDoc: noop,
  resetLive: noop,
  serverStatus: { ok: false, dbConfigured: false, mode: 'offline', detail: 'Backend not checked yet.' },
  setServerStatus: noop,
  prdUnlocked: false,
  genPreset: null,
  setGenPreset: noop,
})

export function AppProvider({ children }: { children: ReactNode }) {
  const [view, setView] = useState<View>('home')
  const [activeProjectId, setActiveProjectId] = useState('p1')
  const [activeReqId, setActiveReqId] = useState<string | null>(null)
  const [aiOpen, setAiOpen] = useState(false)
  const [genOpen, setGenOpen] = useState(false)
  const [liveSource, setLiveSource] = useState<Source | null>(null)
  const [liveDocs, setLiveDocs] = useState<BRD[]>([])
  const [activeDocId, setActiveDocId] = useState<string | null>(null)
  const [genPreset, setGenPreset] = useState<DocType | null>(null)
  const [serverStatus, setServerStatus] = useState<ServerStatus>({
    ok: false,
    dbConfigured: false,
    mode: 'offline',
    detail: 'Backend not checked yet.',
  })

  const upsertLiveDoc = useCallback((doc: BRD) => {
    setLiveDocs((prev) => {
      const i = prev.findIndex((d) => d.id === doc.id)
      if (i === -1) return [...prev, doc]
      const next = prev.slice()
      next[i] = doc
      return next
    })
    setActiveDocId(doc.id)
  }, [])

  const updateLiveDoc = useCallback((id: string, updater: (doc: BRD) => BRD) => {
    setLiveDocs((prev) => prev.map((d) => (d.id === id ? updater(d) : d)))
  }, [])

  const resetLive = useCallback(() => {
    setLiveDocs([])
    setActiveDocId(null)
    setLiveSource(null)
  }, [])

  // Rehydrate the live chain from the server on mount so a page reload doesn't
  // throw away the real (non-mock) BRD → downstream chain. The documents are
  // durably persisted server-side (Neon, or the in-memory fallback for a running
  // process); the client just re-links them. We resume the MOST RECENT chain:
  // the newest root BRD (the one with no parent) plus every document that
  // descends from it via `parentId`. It only populates when the live slice is
  // still empty (never clobbers an in-progress generation) and silently no-ops
  // when the backend is unreachable — the app still runs on demo data and the
  // next generation repopulates the slice.
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const docs = await listBRDs() // newest-first, all document types
        if (cancelled || docs.length === 0) return
        const root = docs.find((d) => !d.parentId) // newest root (list is newest-first)
        if (!root) return
        // Walk the root's transitive descendants by parentId into one chain.
        const chain: BRD[] = [root]
        const ids = new Set<string>([root.id])
        for (let added = true; added; ) {
          added = false
          for (const d of docs) {
            if (!ids.has(d.id) && d.parentId && ids.has(d.parentId)) {
              chain.push(d)
              ids.add(d.id)
              added = true
            }
          }
        }
        setLiveDocs((prev) => (prev.length > 0 ? prev : chain))
        setActiveDocId((prev) => prev ?? root.id)
      } catch {
        // Backend unreachable — leave the live slice empty (demo data still works).
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  // The root BRD of the live chain: the single document with no parent.
  const liveBRD = useMemo(() => liveDocs.find((d) => !d.parentId) ?? null, [liveDocs])
  const downstreamDocs = useMemo(() => liveDocs.filter((d) => !!d.parentId), [liveDocs])
  const activeDoc = useMemo(
    () => liveDocs.find((d) => d.id === activeDocId) ?? liveBRD,
    [liveDocs, activeDocId, liveBRD],
  )

  const value = useMemo<AppCtxValue>(
    () => ({
      view, setView,
      activeProjectId, setActiveProjectId,
      activeReqId, setActiveReqId,
      aiOpen, setAiOpen,
      genOpen, setGenOpen,
      liveSource, setLiveSource,
      liveDocs,
      liveBRD,
      downstreamDocs,
      activeDocId, setActiveDocId,
      activeDoc,
      upsertLiveDoc,
      updateLiveDoc,
      resetLive,
      serverStatus, setServerStatus,
      prdUnlocked: !!liveBRD?.complete,
      genPreset, setGenPreset,
    }),
    [
      view, activeProjectId, activeReqId, aiOpen, genOpen, liveSource,
      liveDocs, liveBRD, downstreamDocs, activeDocId, activeDoc,
      upsertLiveDoc, updateLiveDoc, resetLive, serverStatus, genPreset,
    ],
  )

  return <AppCtx.Provider value={value}>{children}</AppCtx.Provider>
}

export function useApp() {
  return useContext(AppCtx)
}
