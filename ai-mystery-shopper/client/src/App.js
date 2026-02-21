import React, { useState } from 'react';
import axios from 'axios';
import { AlertCircle, CheckCircle, Play, Loader, Video } from 'lucide-react';
import './App.css';

function App() {
  const [url, setUrl] = useState('');
  const [goal, setGoal] = useState('');
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState(null);
  const [error, setError] = useState('');
  const [persona, setPersona] = useState('first_time_user');
  const [device, setDevice] = useState('mobile');
  const [advancedMode, setAdvancedMode] = useState(false);

  const runTest = async () => {
    if (!url) return alert('Please fill in target URL');
    if (advancedMode && !goal) return alert('Please provide a custom goal or turn off advanced mode');

    setLoading(true);
    setReport(null);
    setError('');

    try {
      const response = await axios.post('http://localhost:3001/api/shop', {
        url,
        goal: advancedMode ? goal : undefined,
        autonomous: !advancedMode,
        persona,
        device
      });
      setReport(response.data.report);
    } catch (err) {
      setError('Error: Ensure backend is running on port 3001.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const autonomousRuns = report?.mode === 'autonomous' ? report.runs || [] : [];
  const displayReport = report?.mode === 'autonomous'
    ? [...autonomousRuns].sort((a, b) => b.report.confusionScore - a.report.confusionScore)[0]?.report
    : report;

  return (
    <div className="app-container">
      <header>
        <h1>AI Mystery Shopper</h1>
        <p>Mobile UX Friction Detector</p>
      </header>

      <div className="input-card">
        <div className="input-group">
          <label>Target Website URL</label>
          <input
            type="text"
            placeholder="https://www.example.com"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
          />
        </div>

        <div className="input-group" style={{ marginBottom: '15px' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <input
              type="checkbox"
              checked={advancedMode}
              onChange={(e) => setAdvancedMode(e.target.checked)}
            />
            Advanced mode (manual goal/persona/device)
          </label>
        </div>

        {advancedMode && (
          <>
            <div className="input-group">
              <label>Shopper Goal</label>
              <input
                type="text"
                placeholder="e.g., Login and find the contact page"
                value={goal}
                onChange={(e) => setGoal(e.target.value)}
              />
            </div>

            <div className="config-section" style={{ display: 'flex', gap: '15px', marginBottom: '20px' }}>
              <div className="input-group" style={{ flex: 1 }}>
                <label>Persona</label>
                <select value={persona} onChange={(e) => setPersona(e.target.value)} className="config-select">
                  <option value="first_time_user">First-Time User</option>
                  <option value="elderly_user">Elderly User</option>
                  <option value="power_user">Power User</option>
                  <option value="adversarial_tester">Adversarial Tester</option>
                </select>
              </div>

              <div className="input-group" style={{ flex: 1 }}>
                <label>Device</label>
                <select value={device} onChange={(e) => setDevice(e.target.value)} className="config-select">
                  <option value="mobile">iPhone 13 (Mobile)</option>
                  <option value="tablet">iPad Mini (Tablet)</option>
                </select>
              </div>
            </div>
          </>
        )}

        <button onClick={runTest} disabled={loading} className="start-btn">
          {loading
            ? <><Loader className="spin" /> {advancedMode ? 'Running manual mission...' : 'Running autonomous QA suite...'}</>
            : <><Play size={18} /> {advancedMode ? 'Start Manual Mission' : 'Start Autonomous QA'}</>}
        </button>
      </div>

      {error && <div className="error-msg">{error}</div>}

      {report && displayReport && (
        <div className="results-area">
          {report.mode === 'autonomous' && (
            <div className="video-card" style={{ marginBottom: '30px', background: '#1f2937', padding: '20px', borderRadius: '12px', border: '1px solid #374151' }}>
              <h3 style={{ marginTop: 0 }}>Autonomous Suite Summary</h3>
              <p style={{ margin: '8px 0' }}>Scenarios tested: <strong>{report.summary?.scenariosTested}</strong></p>
              <p style={{ margin: '8px 0' }}>Worst score: <strong>{report.summary?.worstScore}/100</strong></p>
              <p style={{ margin: '8px 0' }}>Top diagnosis: <strong>{report.summary?.topDiagnosis}</strong></p>
            </div>
          )}

          <div className="score-card">
            <h2>Confusion Score {report.mode === 'autonomous' ? '(Worst Case)' : ''}</h2>
            <div className={`score ${displayReport.confusionScore > 60 ? 'bad' : displayReport.confusionScore > 30 ? 'warning' : 'good'}`}>
              {displayReport.confusionScore}/100
            </div>
            <div className="status">
              {displayReport.confusionScore > 60
                ? <><AlertCircle color="#ff6b6b" /> Critical Friction</>
                : displayReport.confusionScore > 30
                  ? <><AlertCircle color="#fcc419" /> Potential UX Issue</>
                  : <><CheckCircle color="#51cf66" /> Smooth Experience</>}
            </div>
            {displayReport.topDiagnosis !== 'None' && (
              <div className="diagnosis-badge" style={{ marginTop: '15px', padding: '8px', background: '#374151', borderRadius: '6px', fontSize: '0.9rem' }}>
                Top Diagnosis: <strong>{displayReport.topDiagnosis}</strong>
              </div>
            )}
          </div>

          {displayReport.videoUrl && (
            <div className="video-card" style={{ marginBottom: '30px', background: '#1f2937', padding: '20px', borderRadius: '12px', border: '1px solid #374151' }}>
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '10px', margin: '0 0 15px 0' }}>
                <Video size={20} /> Session Evidence
              </h3>
              <video
                controls
                width="100%"
                src={`http://localhost:3001${displayReport.videoUrl}`}
                style={{ borderRadius: '8px', border: '1px solid #374151' }}
              />
            </div>
          )}

          {report.mode === 'autonomous' && (
            <div className="timeline" style={{ marginBottom: '25px' }}>
              <h3>Scenario Results</h3>
              {autonomousRuns.map((run, i) => (
                <div key={i} className="log-item">
                  <div className="step-number">{i + 1}</div>
                  <div className="step-content">
                    <p className="thought" style={{ marginBottom: 6 }}>
                      {run.scenario.persona} on {run.scenario.device}
                    </p>
                    <div className="meta">
                      <span className="frustration">Score: {run.report.confusionScore}/100</span>
                      <span className="frustration" style={{ marginLeft: '10px' }}>Diagnosis: {run.report.topDiagnosis}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="timeline">
            <h3>Shopper Journey Log</h3>
            {(displayReport.log || []).filter(l => l.type === 'ai_thought').map((step, i) => (
              <div key={i} className="log-item">
                <div className="step-number">{i + 1}</div>
                <div className="step-content">
                  <p className="thought">"{step.details.thought}"</p>
                  <div className="meta">
                    <span className="frustration">{step.details.aiFrustrationLevel <= 2 ? 'Status: Smooth' : `Frustration: ${step.details.aiFrustrationLevel}/10`}</span>
                    {step.details.diagnosis && step.details.diagnosis !== 'Healthy' && (
                      <span className="frustration" style={{ background: '#7f1d1d', color: '#fecaca', marginLeft: '10px' }}>
                        {step.details.diagnosis}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
