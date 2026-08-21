import { ThemeProvider } from './context/ThemeContext'
import { AppProvider, useApp } from './context/AppContext'
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
  const { view, aiOpen, genOpen, setGenOpen, setView } = useApp()

  const afterGenerate = () => {
    setGenOpen(false)
    setView('document')
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
      <Topbar />
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
