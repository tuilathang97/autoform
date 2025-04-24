import React from 'react';
import ReactDOM from 'react-dom/client';
import Popup from './Popup.jsx';

async function initApp() {
  if (import.meta.env.MODE === 'standalone') {
    const chromeMock = await import('../mocks/chrome');
    window.chrome = chromeMock.default;
    console.log('[DEV] Mock chrome API loaded');
  }

  const root = ReactDOM.createRoot(document.getElementById('root'));
  root.render(<Popup />);
}

initApp().catch(console.error);