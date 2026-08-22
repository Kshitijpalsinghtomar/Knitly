import { LiveBrowse } from '../components/LiveBrowse'

/**
 * Project docs surface — now the REAL browse for the owner's persisted sources
 * and generated BRDs (from the live API), replacing the fixture-driven doc list.
 */
export function WorkspaceView() {
  return (
    <LiveBrowse
      title="Documents & sources"
      subtitle="Your persisted sources and generated BRDs, straight from the live backend. Generate a BRD from any source and open it to see its own requirements."
      showNew
    />
  )
}
