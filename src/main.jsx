import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'

// Global reset
const style = document.createElement('style')
style.textContent = `
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; -webkit-tap-highlight-color: transparent; }
  html, body { height: 100%; overflow: hidden; background: #000; font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Segoe UI', sans-serif; }
  #root { height: 100%; }
  input:focus, select:focus, textarea:focus, button:focus { outline: none; }
  button { font-family: inherit; }
`
document.head.appendChild(style)

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
