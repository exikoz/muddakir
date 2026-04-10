import { useState } from 'react'
import DebugConsole from './DebugConsole'
import './DevModeToggle.css'

export default function DevModeToggle() {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <>
      <button 
        className="dev-mode-toggle" 
        onClick={() => setIsOpen(true)}
        title="Open Debug Console"
      >
        🔧
      </button>
      
      {isOpen && <DebugConsole onClose={() => setIsOpen(false)} />}
    </>
  )
}
