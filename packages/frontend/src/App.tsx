import { useState } from 'react';
import { ChatWindow } from './components/chat/ChatWindow';
import { DocumentUpload } from './components/upload/DocumentUpload';
import './styles/index.css';

export function App() {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  return (
    <div className="app">
      {/* Sidebar toggle for mobile */}
      <button
        className="app__sidebar-toggle"
        onClick={() => setSidebarOpen((o) => !o)}
        aria-label={sidebarOpen ? 'Hide sidebar' : 'Show sidebar'}
        type="button"
      >
        {sidebarOpen ? '◀' : '▶'}
      </button>

      {/* Sidebar — document management */}
      <aside className={`app__sidebar ${sidebarOpen ? 'app__sidebar--open' : ''}`}>
        <DocumentUpload />

        <div className="app__sidebar-footer">
          <p className="app__demo-note">
            Demo: Employee ID <strong>EMP001</strong>
          </p>
        </div>
      </aside>

      {/* Main chat area */}
      <main className="app__main">
        <ChatWindow />
      </main>
    </div>
  );
}
