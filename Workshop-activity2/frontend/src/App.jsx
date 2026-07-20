import { Navigate, Route, Routes } from 'react-router-dom';
import { TeamProvider, useTeam } from './context/TeamContext';
import ChatWidget from './components/ChatWidget';
import Join from './pages/Join';
import Workspace from './pages/Workspace';
import MapStep from './pages/MapStep';
import IdentifyStep from './pages/IdentifyStep';
import DesignStep from './pages/DesignStep';
import Analysis from './pages/Analysis';
import ReviewSubmission from './pages/ReviewSubmission';
import Congratulations from './pages/Congratulations';
import Admin from './pages/Admin';

function RequireTeam({ children }) {
  const { team, restoring } = useTeam();
  if (restoring) {
    return (
      <div className="page">
        <p className="muted">Loading your workspace…</p>
      </div>
    );
  }
  if (!team) return <Navigate to="/" replace />;
  return children;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Join />} />
      <Route
        path="/workspace"
        element={
          <RequireTeam>
            <Workspace />
          </RequireTeam>
        }
      />
      <Route
        path="/workspace/map"
        element={
          <RequireTeam>
            <MapStep />
          </RequireTeam>
        }
      />
      <Route
        path="/workspace/identify"
        element={
          <RequireTeam>
            <IdentifyStep />
          </RequireTeam>
        }
      />
      <Route
        path="/workspace/design"
        element={
          <RequireTeam>
            <DesignStep />
          </RequireTeam>
        }
      />
      <Route
        path="/workspace/analysis"
        element={
          <RequireTeam>
            <Analysis />
          </RequireTeam>
        }
      />
      <Route
        path="/workspace/review"
        element={
          <RequireTeam>
            <ReviewSubmission />
          </RequireTeam>
        }
      />
      <Route
        path="/workspace/done"
        element={
          <RequireTeam>
            <Congratulations />
          </RequireTeam>
        }
      />
      <Route path="/admin" element={<Admin />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function AppShell() {
  const { team } = useTeam();
  return (
    <>
      <AppRoutes />
      {team && <ChatWidget />}
    </>
  );
}

export default function App() {
  return (
    <TeamProvider>
      <AppShell />
    </TeamProvider>
  );
}
