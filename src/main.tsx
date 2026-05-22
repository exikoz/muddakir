import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { inject } from '@vercel/analytics'
import './i18n/config'
import './index.css'
import './store/themeStore' // Initialize theme before render
import App from './app/App'

inject()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
