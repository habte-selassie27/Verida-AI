import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import './styles/global.css';
import './components/Layout.css';
import './components/DatasetCard.css';
import './components/Pagination.css';
import './components/ProvenanceTree.css';
import './pages/Home.css';
import './pages/DatasetDetail.css';
import './pages/PublisherProfile.css';
import './pages/Upload.css';
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
