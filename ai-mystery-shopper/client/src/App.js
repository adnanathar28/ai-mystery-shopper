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
  const [network, setNetwork] = useState('WiFi');
  const [locale, setLocale] = useState('EN');

  const runTest = async () => {
    if (!url) return alert("Please enter a target URL");
    setLoading(true);
    setReport(null);
    setError('');

    try {
      // Sending persona and device to the backend
      const response = await axios.post('http://localhost:3001/api/shop', { 
        url, 
        goal, 
        persona, 
        device,
        network,
        locale
      });
      setReport(response.data.report);
    } catch (err) {
      setError('Error: Ensure backend is running on port 3001.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

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
        <div className="input-group">
          <label>Shopper Goal (Leave blank for autonomous discovery)</label>
          <input 
            type="text" 
            placeholder="e.g., 'Purchase a hat' or leave blank for Auto-QA" 
            value={goal}
            onChange={(e) => setGoal(e.target.value)}
          />
          {!goal && <small style={{color: '#60a5fa'}}>Note: AI will automatically determine the best test path!</small>}
        </div>
        

        {/* PERSONA & DEVICE CONFIGURATION */}
        {/* PERSONA, DEVICE, NETWORK & LOCALE CONFIGURATION */}
        <div className="config-grid" style={{ 
          display: 'grid', 
          gridTemplateColumns: '1fr 1fr', 
          gap: '15px', 
          marginBottom: '20px' 
        }}>
          <div className="input-group">
            <label>Persona</label>
            <select value={persona} onChange={(e) => setPersona(e.target.value)} className="config-select">
              <option value="first_time_user">First-Time User</option>
              <option value="elderly_user">Elderly User</option>
              <option value="adversarial_tester">Adversarial Tester</option>
            </select>
          </div>
          
          <div className="input-group">
            <label>Device</label>
            <select value={device} onChange={(e) => setDevice(e.target.value)} className="config-select">
              <option value="mobile">iPhone 13</option>
              <option value="tablet">iPad Mini</option>
            </select>
          </div>

          <div className="input-group">
            <label>Network Speed</label>
            <select value={network} onChange={(e) => setNetwork(e.target.value)} className="config-select">
              <option value="WiFi">WiFi (No Throttling)</option>
              <option value="4G">4G (Average)</option>
              <option value="3G">3G (Slow/Stress Test)</option>
            </select>
          </div>

          <div className="input-group">
            <label>Target Locale</label>
            <select value={locale} onChange={(e) => setLocale(e.target.value)} className="config-select">
              <option value="EN">English</option>
              <option value="ES">Spanish</option>
              <option value="FR">French</option>
            </select>
          </div>
        </div>
        
        <button onClick={runTest} disabled={loading} className="start-btn">
          {loading ? <><Loader className="spin"/> Simulating {persona.replace('_', ' ')}...</> : <><Play size={18}/> Start Mission</>}
        </button>
      </div>

      {error && <div className="error-msg">{error}</div>}

      {report && (
        <div className="results-area">
          {/* NEW: MISSION BRIEFING CARD */}
          <div className="mission-briefing-card">
              <div className="briefing-header">
                  <span className="ai-badge">AI STRATEGIST</span>
                  <h2>Mission Briefing</h2>
              </div>
              <div className="briefing-content">
                  <div className="briefing-item">
                      <label>Objective</label>
                      <p>{report.goal}</p>
                  </div>
                  {report.rationale && (
                      <div className="briefing-item">
                          <label>Rationale</label>
                          <p className="rationale-text">"{report.rationale}"</p>
                      </div>
                  )}
                  <div className="briefing-item">
                      <label>Planned Milestones</label>
                      <div className="milestone-chips">
                          {report.milestones?.map((m, i) => (
                              <span key={i} className="milestone-chip">{i+1}. {m}</span>
                          ))}
                      </div>
                  </div>
              </div>
          </div>
          
          <div className="score-card">
            <h2>Confusion Score</h2>
            <div className={`score ${report.confusionScore > 60 ? 'bad' : report.confusionScore > 30 ? 'warning' : 'good'}`}>
              {report.confusionScore}/100
            </div>
            <div className="status">
              {report.confusionScore > 60 
                ? <><AlertCircle color="#ff6b6b"/> Critical Friction</> 
                : report.confusionScore > 30
                ? <><AlertCircle color="#fcc419"/> Potential UX Issue</>
                : <><CheckCircle color="#51cf66"/> Smooth Experience</>}
            </div>
            {report.topDiagnosis !== "None" && (
                <div className="diagnosis-badge" style={{marginTop: '15px', padding: '8px', background: '#374151', borderRadius: '6px', fontSize: '0.9rem'}}>
                    Top Diagnosis: <strong>{report.topDiagnosis}</strong>
                </div>
            )}
          </div>

          {report.videoUrl && (
            <div className="video-card" style={{ marginBottom: '30px', background: '#1f2937', padding: '20px', borderRadius: '12px', border: '1px solid #374151' }}>
                <h3 style={{ display: 'flex', alignItems: 'center', gap: '10px', margin: '0 0 15px 0' }}>
                    <Video size={20} /> Session Evidence
                </h3>
                <video 
                    controls 
                    width="100%" 
                    src={`http://localhost:3001${report.videoUrl}`} 
                    style={{ borderRadius: '8px', border: '1px solid #374151' }}
                />
            </div>
          )}

          <div className="timeline">
            <h3>Shopper Journey Log</h3>
            {report.log.filter(l => l.type === 'ai_thought').map((step, i) => (
              <div key={i} className="log-item">
                <div className="step-number">{i + 1}</div>
                <div className="step-content">
                  <p className="thought">"{step.details.thought}"</p>
                  <div className="meta">
                    <span className="frustration">{step.details.aiFrustrationLevel <= 2 ? 'Status: Smooth' : `Frustration: ${step.details.aiFrustrationLevel}/10`}</span>
                    {step.details.diagnosis && step.details.diagnosis !== "Healthy" && (
                         <span className="frustration" style={{background: '#7f1d1d', color: '#fecaca', marginLeft: '10px'}}>
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