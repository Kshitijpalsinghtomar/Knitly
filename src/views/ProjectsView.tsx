import { LiveBrowse } from '../components/LiveBrowse'

/**
 * All-projects surface — the real browse of persisted sources & generated BRDs,
 * replacing the mock PROJECTS list with live API data.
 */
export function ProjectsView() {
  return (
    <LiveBrowse
      title="All sources"
      subtitle="Browse every source you’ve ingested and every BRD generated from them — live from the backend."
      showNew
    />
  )
}
