import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { TeamProvider } from './context/TeamContext';
import TopBar from './components/TopBar';
import Join from './pages/Join';
import Dashboard from './pages/Dashboard';
import QuestionWizard from './pages/QuestionWizard';
import Admin from './pages/Admin';

export default function App() {
  return (
    <BrowserRouter>
      <TeamProvider>
        <div className="app-shell">
          <TopBar />
          <Routes>
            <Route path="/" element={<Join />} />
            <Route path="/workspace" element={<Dashboard />} />
            <Route path="/workspace/question/:id" element={<QuestionWizard />} />
            <Route path="/admin" element={<Admin />} />
          </Routes>
        </div>
      </TeamProvider>
    </BrowserRouter>
  );
}
