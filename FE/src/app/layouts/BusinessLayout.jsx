import {
  DashboardOutlined,
  EnvironmentOutlined,
  FileProtectOutlined,
  HomeOutlined,
  LogoutOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  PlusCircleOutlined,
  ShopOutlined,
  UserOutlined,
} from '@ant-design/icons'
import { Button, Layout, Menu, Spin, Typography } from 'antd'
import { useEffect, useMemo, useState } from 'react'
import { Link, Outlet, useLocation, useNavigate } from 'react-router'
import { useAuth } from '../../features/auth/context/useAuth'
import { getBusinessSummaryApi } from '../../features/business/api/businessApi'
import styles from './BusinessLayout.module.css'

function selectedMenuKey(pathname) {
  if (pathname === '/business/register') return '/business/register'
  if (pathname.startsWith('/business/ownerships')) return '/business/ownerships'
  if (pathname.startsWith('/business/locations')) return '/business/locations'
  return '/business'
}

export function BusinessLayout() {
  const location = useLocation()
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  const [summary, setSummary] = useState(null)
  const [loadingSummary, setLoadingSummary] = useState(true)
  const [collapsed, setCollapsed] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [loggingOut, setLoggingOut] = useState(false)

  useEffect(() => {
    let active = true
    getBusinessSummaryApi()
      .then((result) => active && setSummary(result))
      .catch(() => active && setSummary({ verifiedCount: 0, menuState: 'none' }))
      .finally(() => active && setLoadingSummary(false))
    return () => { active = false }
  }, [location.pathname])

  const hasVerifiedOwnership = (summary?.verifiedCount ?? 0) > 0
  const menuItems = useMemo(() => hasVerifiedOwnership ? [
    { key: '/business', icon: <DashboardOutlined />, label: <Link to="/business">Tổng quan</Link> },
    { key: '/business/locations', icon: <EnvironmentOutlined />, label: <Link to="/business/locations">Địa điểm của tôi</Link> },
    { key: '/business/ownerships', icon: <FileProtectOutlined />, label: <Link to="/business/ownerships">Hồ sơ xác minh</Link> },
  ] : [
    { key: '/business/ownerships', icon: <FileProtectOutlined />, label: <Link to="/business/ownerships">Trạng thái xác minh</Link> },
    { key: '/business/register', icon: <PlusCircleOutlined />, label: <Link to="/business/register">Đăng ký địa điểm kinh doanh</Link> },
  ], [hasVerifiedOwnership])

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
      <Layout.Sider className={styles.sidebar} width={264} collapsedWidth={isMobile ? 0 : 80} collapsible
        collapsed={collapsed} trigger={null} breakpoint="lg"
        onCollapse={setCollapsed} onBreakpoint={(broken) => { setIsMobile(broken); setCollapsed(broken) }}>
        <Link className={styles.brand} to="/business">
          <span className={styles.brandMark}><ShopOutlined /></span>
          {collapsed ? null : <span><strong>HueTrip</strong><small>Business Workspace</small></span>}
        </Link>
        {collapsed ? null : <div className={styles.menuLabel}>Quản lý kinh doanh</div>}
        {loadingSummary ? <Spin className={styles.menuLoading} /> : (
          <Menu className={styles.menu} theme="dark" mode="inline" items={menuItems}
            selectedKeys={[selectedMenuKey(location.pathname)]}
            onClick={() => isMobile && setCollapsed(true)} />
        )}
        <div className={styles.sidebarFooter}>
          <Link to="/" title="Về HueTrip"><HomeOutlined />{collapsed ? null : <span>Về HueTrip</span>}</Link>
          <Link to="/profile" title="Tài khoản"><UserOutlined />{collapsed ? null : <span>Tài khoản</span>}</Link>
          <button type="button" title="Đăng xuất" disabled={loggingOut} onClick={handleLogout}>
            <LogoutOutlined />{collapsed ? null : <span>Đăng xuất</span>}
          </button>
        </div>
      </Layout.Sider>

      {isMobile && !collapsed ? <button type="button" className={styles.backdrop} aria-label="Đóng menu Business" onClick={() => setCollapsed(true)} /> : null}

      <Layout>
        <Layout.Header className={styles.header}>
          <Button type="text" icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
            aria-label={collapsed ? 'Mở menu Business' : 'Thu gọn menu Business'}
            onClick={() => setCollapsed((value) => !value)} />
          <div className={styles.headerUser}>
            <Typography.Text>{user?.displayName}</Typography.Text>
          </div>
        </Layout.Header>
        <Layout.Content className={styles.content}><Outlet /></Layout.Content>
      </Layout>
    </Layout>
  )
}
