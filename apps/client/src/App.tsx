import { useState, useEffect } from 'react';
import type { HealthCheckResponse } from '@monorepo/shared';

function App() {
  const [health, setHealth] = useState<HealthCheckResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('http://localhost:3000/health')
      .then((res) => res.json())
      .then((data) => {
        setHealth(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Failed to fetch health:', err);
        setLoading(false);
      });
  }, []);

  return (
    <div style={{ padding: '2rem', fontFamily: 'sans-serif' }}>
      <h1>Client App</h1>
      <p>This is a placeholder for the client application.</p>

      <div
        style={{
          marginTop: '2rem',
          padding: '1rem',
          background: '#f5f5f5',
          borderRadius: '8px',
        }}
      >
        <h2>API Health Status</h2>
        {loading ? (
          <p>Loading...</p>
        ) : health ? (
          <pre
            style={{
              background: '#fff',
              padding: '1rem',
              borderRadius: '4px',
              overflow: 'auto',
            }}
          >
            {JSON.stringify(health, null, 2)}
          </pre>
        ) : (
          <p style={{ color: 'red' }}>Failed to connect to API</p>
        )}
      </div>
    </div>
  );
}

export default App;
