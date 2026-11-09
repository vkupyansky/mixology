import { StrictMode, useEffect, useState } from 'react';
import ReactDOM from 'react-dom/client';
import {
  BrowserRouter as Router,
  Routes,
  Route,
  useNavigate,
} from 'react-router-dom';
import type { z } from 'zod';
import { namesSchema } from '../../shared/flavor.js';
import FlavorEditor from './FlavorEditor';
import './App.css';

function App() {
  const [names, setNames] = useState<z.infer<typeof namesSchema>>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [attempt, setAttempt] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch('/api/names', {
          signal: controller.signal,
        });
        if (!response.ok) throw new Error('Не удалось загрузить каталог.');
        const data = namesSchema.parse(await response.json());
        if (!controller.signal.aborted) setNames(data);
      } catch (error) {
        if (!controller.signal.aborted) {
          setError(
            error instanceof Error
              ? error.message
              : 'Не удалось загрузить каталог.',
          );
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    void load();
    return () => controller.abort();
  }, [attempt]);

  return (
    <div className="container">
      <h3 className="title">Всего вкусов: {names.length}</h3>
      {loading && <p role="status">Загрузка...</p>}
      {error && (
        <div role="alert">
          <p>{error}</p>
          <button onClick={() => setAttempt((value) => value + 1)}>
            Повторить
          </button>
        </div>
      )}
      {!loading && !error && !names.length && (
        <p>Каталог пуст. Выполните первоначальную загрузку данных.</p>
      )}
      <ul className="flavor-list">
        {names.map((item) => (
          <li key={item.id}>
            <button
              className="flavor-item"
              onClick={() => navigate(`/flavor/${item.id}`)}
            >
              <span className="flavor-id">{item.id}</span>
              <span
                className="flavor-name"
                style={{
                  color: item.status === 'empty' ? '#8a6500' : '#177b2e',
                }}
              >
                {item.name}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Root() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<App />} />
        <Route path="/flavor/:id" element={<FlavorEditor />} />
      </Routes>
    </Router>
  );
}

const container = document.getElementById('root');
if (!container) throw new Error('Не найден корневой элемент приложения');
ReactDOM.createRoot(container).render(
  <StrictMode>
    <Root />
  </StrictMode>,
);
