import '@fontsource-variable/fraunces';
import '@fontsource-variable/geist';
import '@fontsource/geist-mono/500.css';
import './index.css';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from '@/app/App';
import { createBackend } from '@/data/backend';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App backend={createBackend()} />
  </StrictMode>,
);
