import { useEffect } from 'react'
import { ThemeProvider } from './context/ThemeContext'
import { AppProvider, useApp } from './context/AppContext'
import { getHealth } from './lib/api'
import { st } from './lib/utils'
import { Ico } from './components/ui/Icon'
import { LeftRail } from './components/LeftRail'
import { Topbar } from './components/Topbar'
import { CopilotPanel } from './components/CopilotPanel'
import { DocGenModal } from './components/DocGenModal'
import { HomeView } from './views/HomeView'
import { ProjectsView } from './views/ProjectsView'
import { WorkspaceView } from './views/WorkspaceView'
import { DocumentView } from './views/DocumentView'
import { GraphView } from './views/GraphView'
import { ConflictsView } from './views/ConflictsView'
import { IntegrationsView } from './views/IntegrationsView'
import { KnowledgeView } from './views/KnowledgeView'
import { TeamView } from './views/TeamView'
import { SettingsView } from './views/SettingsView'
import { NotificationsView } from './views/NotificationsView'
import { RequirementView } from './views/RequirementView'
import { TraceabilityView } from './views/TraceabilityView'

function Shell() {
  const { view, aiOpen, genOpen, setGenOpen, setView, setServerStatus, serverStatus } = useApp()

  useEffect(() => {
    getHealth().then(setServerStatus)
  }, [setServerStatus])

  const afterGenerate = () => {
    setGenOpen(false)
    setView('document')
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
      <Topbar />
      {serverStatus.mode === 'offline' && (
        <div style={st({ padding: '6px 18px', fontSize: 12, color: 'var(--err)', background: 'rgba(224,95,106,0.10)', borderBottom: '1px solid rgba(224,95,106,0.25)', display: 'flex', alignItems: 'center', gap: 6 })}>
          <Ico n="warning" s={12} c="var(--err)" />
          Backend not reachable — ingest &amp; generation need `pnpm start`. Demo data still available.
        </div>
      )}
      {serverStatus.mode === 'memory' && (
        <div style={st({ padding: '6px 18px', fontSize: 12, color: 'var(--warn)', background: 'rgba(230,163,60,0.10)', borderBottom: '1px solid rgba(230,163,60,0.25)', display: 'flex', alignItems: 'center', gap: 6 })}>
          <Ico n="shield" s={12} c="var(--warn)" />
          Database not configured — running with in-memory storage. Set <code style={{ fontFamily: 'var(--font-mono, monospace)' }}>DATABASE_URL</code> (Neon) for durable persistence.
        </div>
      )}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        <LeftRail />
        <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
          {view === 'home'          && <HomeView />}
          {view === 'projects'      && <ProjectsView />}
          {view === 'workspace'     && <WorkspaceView />}
          {view === 'document'      && <DocumentView />}
          {view === 'graph'         && <GraphView />}
          {view === 'conflicts'     && <ConflictsView />}
          {view === 'integrations'  && <IntegrationsView />}
          {view === 'knowledge'     && <KnowledgeView />}
          {view === 'team'          && <TeamView />}
          {view === 'settings'      && <SettingsView />}
          {view === 'notifications' && <NotificationsView />}
          {view === 'requirement'   && <RequirementView />}
          {view === 'traceability'  && <TraceabilityView />}
        </div>
        {aiOpen && <CopilotPanel />}
      </div>
      {genOpen && <DocGenModal onClose={() => setGenOpen(false)} onGenerate={afterGenerate} />}
    </div>
  )
}

export default function App() {
  return (
    <ThemeProvider>
      <AppProvider>
        <Shell />
      </AppProvider>
    </ThemeProvider>
  )
}
