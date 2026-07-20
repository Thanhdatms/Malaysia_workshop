import TopBar from './TopBar';

export default function WorkspaceShell({ wide, children }) {
  return (
    <div className="app-shell">
      <TopBar />
      <div className={`page ${wide ? 'page--wide' : ''}`}>{children}</div>
    </div>
  );
}
