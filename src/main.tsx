import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { setupFetchInterceptor } from './lib/apiMock';

// Seamlessly handle missing backend (e.g. static platforms like Vercel) with localStorage database
setupFetchInterceptor();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
