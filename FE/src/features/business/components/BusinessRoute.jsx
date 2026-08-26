import { Navigate, Outlet } from 'react-router'
import { useAuth } from '../../auth/context/useAuth'
import { canAccessBusinessWorkspace } from '../businessAccess'

export function BusinessRoute() {
  const { user } = useAuth()
  return canAccessBusinessWorkspace(user) ? <Outlet /> : <Navigate to="/" replace />
}
