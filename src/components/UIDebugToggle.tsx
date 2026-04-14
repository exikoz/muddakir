import { useState } from 'react'
import { Sliders } from 'lucide-react'
import UIDebugCustomizer from './UIDebugCustomizer'

export default function UIDebugToggle() {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <>
      <button 
        className="ui-debug-toggle" 
        onClick={() => setIsOpen(!isOpen)}
        title="UI Customizer"
      >
        <Sliders size={20} />
      </button>
      
      {isOpen && <UIDebugCustomizer onClose={() => setIsOpen(false)} />}
    </>
  )
}
