import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import './styles/global.css';
import App from './App';

const rootElement = document.getElementById('root');

if (rootElement === null) {
  throw new Error('Root element with id "root" was not found.');
}

createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
