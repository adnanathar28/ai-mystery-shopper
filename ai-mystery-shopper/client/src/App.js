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

  const runTest = async () => {
    if (!url || !goal) return alert("Please fill in both fields");
    setLoading(true);
    setReport(null);
    setError('');

    try {
      const response = await axios.post('http://localhost:3001/api/shop', { url, goal });
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
          <label>Shopper Goal</label>
          <input 
            type="text" 
            placeholder="e.g., Login and find the contact page" 
            value={goal}
            onChange={(e) => setGoal(e.target.value)}
          />
        </div>
        
        <button onClick={runTest} disabled={loading} className="start-btn">
          {loading ? <><Loader className="spin"/> Simulating Mobile User...</> : <><Play size={18}/> Start Mission</>}
        </button>
      </div>

      {error && <div className="error-msg">{error}</div>}

      {report && (
        <div className="results-area">
          {/* SCORE CARD */}
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
                <div className="diagnosis-badge">
                    Diagnosis: <strong>{report.topDiagnosis}</strong>
                </div>
            )}
          </div>

          {/* VIDEO EVIDENCE PLAYER (NEW) */}
          {report.videoUrl && (
            <div className="video-card" style={{ marginBottom: '30px', background: '#1f2937', padding: '20px', borderRadius: '12px' }}>
                <h3 style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <Video size={20} /> Session Evidence
                </h3>
                <video 
                    controls 
                    width="100%" 
                    src={`http://localhost:3001${report.videoUrl}`} 
                    style={{ borderRadius: '8px', marginTop: '10px', border: '1px solid #374151' }}
                />
            </div>
          )}

          {/* LOGS */}
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