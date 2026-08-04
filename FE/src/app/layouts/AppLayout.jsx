import { Button, Layout, Space, Typography } from 'antd'
import { useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router'
import { useAuth } from '../../features/auth/context/useAuth'
import styles from './AppLayout.module.css'

export function AppLayout() {
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  const [loggingOut, setLoggingOut] = useState(false)

  const handleLogout = async () => {
    try {
      setLoggingOut(true)
      await logout()
    } finally {
      setLoggingOut(false)
      navigate('/login', { replace: true })
    }
  }

  return (
    <Layout className={styles.layout}>
      <Layout.Header className={styles.header}>
        <NavLink className={styles.brand} to="/">
          HueTrip
        </NavLink>

        <nav className={styles.nav} aria-label="Điều hướng chính">
          <NavLink to="/">Trang chủ</NavLink>
          {user ? (
            <>
              <NavLink to="/profile">Hồ sơ</NavLink>
              <Typography.Text className={styles.userName}>
                {user.displayName}
              </Typography.Text>
              <Button
                size="small"
                loading={loggingOut}
                onClick={handleLogout}
              >
                Đăng xuất
              </Button>
            </>
          ) : (
            <Space>
              <NavLink to="/login">Đăng nhập</NavLink>
              <NavLink to="/register">Đăng ký</NavLink>
            </Space>
          )}
        </nav>
      </Layout.Header>

      <Layout.Content className={styles.content}>
        <Outlet />
      </Layout.Content>
    </Layout>
  )
}
