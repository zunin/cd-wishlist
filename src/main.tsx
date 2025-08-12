import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

//const worker = new Worker(new URL('./worker/worker.js', import.meta.url))
//worker.postMessage("hello world");
navigator.serviceWorker.register(new URL('./worker/worker.js', import.meta.url));

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
