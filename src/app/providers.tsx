import { ReactFlowProvider } from '@xyflow/react'
import type { ReactNode } from 'react'

export default function Providers({ children }: { children: ReactNode }) {
  return (
    <ReactFlowProvider>
      {children}
    </ReactFlowProvider>
  )
}
