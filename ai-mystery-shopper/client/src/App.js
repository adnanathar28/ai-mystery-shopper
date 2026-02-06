import React, { useState } from 'react';
import axios from 'axios';
import { AlertCircle, CheckCircle, Play, Loader } from 'lucide-react';
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
      // Connect to your Node backend
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
        <p>UX Friction Detector</p>
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
            placeholder="e.g., Find the contact page and verify email" 
            value={goal}
            onChange={(e) => setGoal(e.target.value)}
          />
        </div>
        
        <button onClick={runTest} disabled={loading} className="start-btn">
          {loading ? <><Loader className="spin"/> Simulating...</> : <><Play size={18}/> Start Mission</>}
        </button>
      </div>

      {error && <div className="error-msg">{error}</div>}

      {report && (
        <div className="results-area">
          <div className="score-card">
            <h2>Confusion Score</h2>
            <div className={`score ${report.confusionScore > 50 ? 'bad' : 'good'}`}>
              {report.confusionScore}/100
            </div>
            <div className="status">
               {report.confusionScore > 50 
                 ? <><AlertCircle color="#ff6b6b"/> High Friction Detected</> 
                 : <><CheckCircle color="#51cf66"/> Smooth Experience</>}
            </div>
          </div>

          <div className="timeline">
            <h3>Shopper Journey Log</h3>
            {report.log.filter(l => l.type === 'ai_thought').map((step, i) => (
              <div key={i} className="log-item">
                <div className="step-number">{i + 1}</div>
                <div className="step-content">
                  <p className="thought">"{step.details.thought}"</p>
                  <div className="meta">
                    <span className="frustration">Frustration: {step.details.aiFrustrationLevel}/10</span>
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