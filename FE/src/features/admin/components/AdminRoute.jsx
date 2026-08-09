import { Spin } from 'antd'
import { Navigate, Outlet, useLocation } from 'react-router'
import { useAuth } from '../../auth/context/useAuth'

export function AdminRoute() {
  const { loading, isAuthenticated, user } = useAuth()
  const location = useLocation()

  if (loading) {
    return <Spin fullscreen tip="Đang kiểm tra quyền truy cập..." />
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />
  }

  if (user?.role !== 'admin') {
    return <Navigate to="/" replace />
  }

  return <Outlet />
}
