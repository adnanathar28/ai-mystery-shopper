// src/views/DashboardHome.js
import React from 'react';
import { Activity, ShieldAlert, Clock, Play } from 'lucide-react';

const DashboardHome = ({ runs }) => {
  return (
    <div className="dashboard-home">
      <h1>Autonomous Signup Monitoring</h1>
      <p className="subtitle">Vision-driven agents monitoring friction across your user flows.</p>

      {/* STATS ROW */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon"><Play size={20} color="#60a5fa"/></div>
          <div className="stat-info">
            <label>Runs Today</label>
            <div className="value">12</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon"><ShieldAlert size={20} color="#f87171"/></div>
          <div className="stat-info">
            <label>Issues Detected</label>
            <div className="value">4</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon"><Clock size={20} color="#fbbf24"/></div>
          <div className="stat-info">
            <label>Avg Time to Detect</label>
            <div className="value">406.1s</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon"><Activity size={20} color="#34d399"/></div>
          <div className="stat-info">
            <label>Success Rate</label>
            <div className="value">94%</div>
          </div>
        </div>
      </div>

      <div className="dashboard-grid">
        {/* RECENT RUNS TABLE */}
        <div className="panel recent-runs">
          <h3>Live Run Status</h3>
          <table>
            <thead>
              <tr>
                <th>Run ID</th>
                <th>Device</th>
                <th>Status</th>
                <th>Result</th>
              </tr>
            </thead>
            <tbody>
              {runs.map(run => (
                <tr key={run.id}>
                  <td>{run.id}</td>
                  <td>{run.device}</td>
                  <td><span className={`badge ${run.status.toLowerCase().replace(' ', '-')}`}>{run.status}</span></td>
                  <td className={run.score > 50 ? 'text-red' : 'text-green'}>
                    {run.score > 50 ? 'Issue Found' : 'No Issues'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* SLACK PREVIEW AREA */}
        <div className="panel slack-preview">
          <h3>Slack Alert Preview</h3>
          <div className="slack-card">
             <div className="slack-header">
                <strong>SentinelBot</strong> <span className="time">10:45 PM</span>
             </div>
             <div className="slack-content">
                <p className="slack-title">🚨 CRITICAL FRICTION: Checkout Flow</p>
                <div className="slack-attachment">
                    <p><strong>Goal:</strong> Complete purchase</p>
                    <p><strong>Confusion Score:</strong> 82/100</p>
                    <p><strong>Diagnosis:</strong> Element Intercepted</p>
                    <div className="slack-btn">Watch Recording</div>
                </div>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardHome;