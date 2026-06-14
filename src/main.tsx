import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import ShareReport from './components/ShareReport.tsx';
import './index.css';

const isShareReport = window.location.pathname === '/share-report';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {isShareReport ? <ShareReport /> : <App />}
  </StrictMode>
);
