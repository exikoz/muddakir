/**
 * Mobile providers — same as desktop but without ReactFlowProvider.
 * Saves bundle size and avoids ReactFlow context errors in mobile components.
 */

import type { ReactNode } from 'react'
import { useDirection } from '../i18n/useDirection'

export default function MobileProviders({ children }: { children: ReactNode }) {
  useDirection()
  return <>{children}</>
}
