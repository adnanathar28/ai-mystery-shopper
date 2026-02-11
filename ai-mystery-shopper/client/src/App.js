import React, { useState } from 'react';
import { 
  LayoutDashboard, 
  PlayCircle, 
  List, 
  AlertTriangle, 
  FileText, 
  Settings, 
  Zap,
  Clock,
  ShieldAlert,
  Activity
} from 'lucide-react';
import './App.css';

// We will build these sub-views next
import DashboardHome from './views/DashboardHome';
// import RunsList from './views/RunsList';
// import LiveRunConfig from './views/LiveRunConfig';

function App() {
  const [activeView, setActiveView] = useState('dashboard');
  
  // This would eventually come from your backend/database
  const [runsHistory, setRunsHistory] = useState([
    { id: 'RUN-7329', status: 'Completed', score: 12, device: 'iPhone 13', url: 'https://example.com', date: 'Feb 10, 10:30 PM' },
    { id: 'RUN-7330', status: 'Issue Found', score: 82, device: 'Desktop Chrome', url: 'https://shop.com', date: 'Feb 11, 02:15 AM' },
  ]);

  const renderView = () => {
    switch(activeView) {
      case 'dashboard': return <DashboardHome runs={runsHistory} />;
      // case 'runs': return <RunsList runs={runsHistory} />;
      // case 'config': return <LiveRunConfig />;
      default: return <DashboardHome />;
    }
  };

  return (
    <div className="dashboard-container">
      {/* SIDEBAR */}
      <aside className="sidebar">
        <div className="logo">
          <Zap color="#60a5fa" fill="#60a5fa" size={24} />
          <span>SentinelBot</span>
        </div>
        
        <nav>
          <button 
            className={activeView === 'dashboard' ? 'active' : ''} 
            onClick={() => setActiveView('dashboard')}
          >
            <LayoutDashboard size={20} /> Dashboard
          </button>
          <button 
            className={activeView === 'config' ? 'active' : ''} 
            onClick={() => setActiveView('config')}
          >
            <PlayCircle size={20} /> Run Now
          </button>
          <button 
            className={activeView === 'runs' ? 'active' : ''} 
            onClick={() => setActiveView('runs')}
          >
            <List size={20} /> All Runs
          </button>
          <button>
            <AlertTriangle size={20} /> Issues
          </button>
          <button>
            <FileText size={20} /> Evidence
          </button>
        </nav>

        <div className="sidebar-footer">
          <button><Settings size={20} /> Settings</button>
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <main className="main-content">
        <header className="top-bar">
          <div className="breadcrumb">Project / {activeView.toUpperCase()}</div>
          <button className="run-btn" onClick={() => setActiveView('config')}>
            <PlayCircle size={18} /> Run Mission
          </button>
        </header>

        <section className="view-container">
          {renderView()}
        </section>
      </main>
    </div>
  );
}

export default App;