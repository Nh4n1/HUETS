import { Spin } from 'antd'
import { Navigate, Outlet, useLocation } from 'react-router'
import { useAuth } from './useAuth'

export function ProtectedRoute() {
  const { loading, isAuthenticated } = useAuth()
  const location = useLocation()

  if (loading) {
    return <Spin fullscreen tip="Đang kiểm tra phiên đăng nhập..." />
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />
  }

  return <Outlet />
}
