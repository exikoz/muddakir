import { ReactFlowProvider } from '@xyflow/react'
import type { ReactNode } from 'react'
import { useDirection } from '../i18n/useDirection'

export default function Providers({ children }: { children: ReactNode }) {
  useDirection()

  return (
    <ReactFlowProvider>
      {children}
    </ReactFlowProvider>
  )
}
