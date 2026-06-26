import React, { useState, useEffect } from 'react';
import './index.css';

const API_BASE = 'http://localhost:5000/api';

const nexusFetch = async (url, options = {}) => {
  options.credentials = 'include';
  options.headers = { ...options.headers, 'Content-Type': 'application/json' };
  const res = await fetch(`${API_BASE}${url}`, options);
  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.error || `HTTP error ${res.status}`);
  }
  return res.json();
};

export default function App() {
  const [user, setUser] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');

  const [description, setDescription] = useState('');
  const [clearanceRequired, setClearanceRequired] = useState('LEVEL_1');
  const [actionError, setActionError] = useState('');

  useEffect(() => {
    nexusFetch('/auth/session')
      .then(userData => { 
        setUser(userData); 
        fetchTasks(); 
      })
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  const fetchTasks = async () => {
    try {
      const data = await nexusFetch('/nexus/tasks');
      setTasks(data);
    } catch (err) {
      setActionError("Failed to synchronize with Nexus Core registry.");
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setAuthError('');
    try {
      const userData = await nexusFetch('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ username, password })
      });
      setUser(userData);
      fetchTasks();
    } catch (err) {
      setAuthError(err.message);
    }
  };

  const handleLogout = async () => {
    try {
      await nexusFetch('/auth/logout', { method: 'POST' });
      setUser(null);
      setTasks([]);
    } catch (err) {
      alert("Failed terminal session purge sequence.");
    }
  };

  const handleCreateTask = async (e) => {
    e.preventDefault();
    setActionError('');
    try {
      await nexusFetch('/nexus/tasks', {
        method: 'POST',
        body: JSON.stringify({ description, clearanceRequired })
      });
      setDescription('');
      fetchTasks();
    } catch (err) {
      setActionError(err.message);
    }
  };

  const handleDeleteTask = async (id) => {
    setActionError('');
    try {
      await nexusFetch(`/nexus/tasks/${id}`, { method: 'DELETE' });
      fetchTasks();
    } catch (err) {
      setActionError(err.message);
    }
  };

  if (loading) {
    return (
      <div className="loading-screen">
        INITIALIZING TEMPORAL COUPLING INTERFACE...
      </div>
    );
  }
   if (!user) {
    return (
      <div className="gateway-container">
        <div className="login-card">
          <div className="card-header">
            <h1 className="text-emerald">CHRONOSYNC</h1>
            <p className="subtitle">THE TEMPORAL NEXUS TERMINAL GATEWAY</p>
          </div>
          <form onSubmit={handleLogin} className="form-group">
            <div className="input-block">
              <label>OPERATOR ID</label>
              <input type="text" value={username} onChange={e => setUsername(e.target.value)} required />
            </div>
            <div className="input-block">
              <label>ACCESS CRYPTOGRAPH</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} required />
            </div>
            {authError && <div className="error-box">{authError}</div>}
            <button type="submit" className="btn-primary">INITIALIZE HANDSHAKE</button>
          </form>
        </div>
      </div>
    );
  }
  return (
    <div className="dashboard-container">
     <header className="main-header">
        <div>
          <h1 className="text-emerald">CHRONOSYNC :: NEXUS GRID</h1>
          <p className="subtitle">
            OPERATOR: <span className="highlight-emerald">{user.username.toUpperCase()}</span> | 
            NODE STATUS: <span className="highlight-cyan">{user.clearance}</span>
          </p>
        </div>
        <button onClick={handleLogout} className="btn-logout">DE-AUTHENTICATE TERMINAL</button>
      </header>

      <main className="main-layout">
        <section className="form-panel">
          <div className="sticky-form">
            <h2 className="panel-title">Inject Temporal Task Sequence</h2>
            <form onSubmit={handleCreateTask} className="form-group">
              <div className="input-block">
                <label>TASK DESCRIPTIVE MATRIX</label>
                <textarea rows="3" value={description} onChange={e => setDescription(e.target.value)} required placeholder="Recalibrate spatial compression arrays..."></textarea>
              </div>
              <div className="input-block">
                <label>CLEARANCE COEFFICIENT</label>
                <select value={clearanceRequired} onChange={e => setClearanceRequired(e.target.value)}>
                  <option value="LEVEL_1">LEVEL 1 (Cadet)</option>
                  <option value="LEVEL_2">LEVEL 2 (Officer)</option>
                  <option value="LEVEL_3">LEVEL 3 (Commander)</option>
                </select>
              </div>
              {actionError && <div className="error-box">{actionError}</div>}
              <button type="submit" className="btn-secondary">PRODUCE ACTIVE SEQUENCE</button>
            </form>
          </div>
        </section>

        <section className="grid-panel">
          <h2 className="panel-title grid-title-header">
            <span>Synchronized Temporal Matrix</span>
            <span className="count-label">Total Vector Pools: {tasks.length}</span>
          </h2>
          {tasks.length === 0 ? (
            <div className="empty-state">
              No continuous tasks registered. ChronoSync is idling safely.
            </div>
          ) : (
            <div className="task-grid">
              {tasks.map(task => (
                <TaskCard 
                  key={task.id} 
                  task={task} 
                  currentUser={user} 
                  onDelete={handleDeleteTask} 
                  onExpire={fetchTasks} 
                />
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

function TaskCard({ task, currentUser, onDelete, onExpire }) {
  const [timeLeft, setTimeLeft] = useState(Math.max(0, task.expirationTimestamp - Date.now()));

  useEffect(() => {
    const interval = setInterval(() => {
      const remaining = Math.max(0, task.expirationTimestamp - Date.now());
      setTimeLeft(remaining);
      if (remaining <= 0) {
        clearInterval(interval);
        onExpire(); 
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [task.expirationTimestamp]);

  const formatTime = (ms) => {
    const totalSecs = Math.floor(ms / 1000);
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const CLEARANCE_VALUES = { "LEVEL_1": 1, "LEVEL_2": 2, "LEVEL_3": 3 };
  const isActionable = (CLEARANCE_VALUES[currentUser.clearance] || 0) >= (CLEARANCE_VALUES[task.clearanceRequired] || 0);
  const isUrgent = timeLeft < 60000;

  return (
    <div className={`task-card ${isUrgent ? 'card-urgent' : ''}`}>
      <div>
        <div className="card-top-row">
          <span className="task-id">{task.id}</span>
          <span className={`clearance-badge badge-${task.clearanceRequired.toLowerCase()}`}>
            {task.clearanceRequired}
          </span>
        </div>
        <p className="task-description">{task.description}</p>
      </div>

      <div className="card-footer">
        <div>
          <div className="footer-label">EXPIRATION VECTOR</div>
          <div className={`timer-text ${isUrgent ? 'timer-urgent' : ''}`}>
            {formatTime(timeLeft)}
          </div>
        </div>

        {isActionable ? (
          <button onClick={() => onDelete(task.id)} className="btn-truncate">
            TRUNCATE
          </button>
        ) : (
          <button disabled className="btn-locked">
            LOCKED
          </button>
        )}
      </div>
    </div>
  );
}
