import {
  AppstoreOutlined,
  CalendarOutlined,
  DashboardOutlined,
  EnvironmentOutlined,
  FlagOutlined,
  HomeOutlined,
  StarOutlined,
  TeamOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
} from '@ant-design/icons'
import { Button, Layout, Menu, Space, Typography } from 'antd'
import { useMemo, useState } from 'react'
import { Link, Outlet, useLocation, useNavigate } from 'react-router'
import { useAuth } from '../../features/auth/context/useAuth'
import styles from './AdminLayout.module.css'

const LOCATIONS_GROUP_KEY = 'locations'
const ADMIN_ONLY_MENU_KEYS = new Set(['/admin/users'])

const menuItems = [
  {
    key: '/admin',
    icon: <DashboardOutlined />,
    label: <Link to="/admin">Tổng quan</Link>,
  },
  {
    key: LOCATIONS_GROUP_KEY,
    icon: <EnvironmentOutlined />,
    label: 'Quản lý địa điểm',
    children: [
      { key: '/admin/locations/pending', label: <Link to="/admin/locations/pending">Hàng chờ kiểm duyệt</Link> },
      { key: '/admin/locations', label: <Link to="/admin/locations">Tất cả địa điểm</Link> },
      { key: '/admin/locations/new', label: <Link to="/admin/locations/new">Thêm địa điểm mới</Link> },
    ],
  },
  {
    key: '/admin/reviews',
    icon: <StarOutlined />,
    label: <Link to="/admin/reviews">Quản lý đánh giá</Link>,
  },
  {
    key: '/admin/itineraries',
    icon: <CalendarOutlined />,
    label: <Link to="/admin/itineraries">Quản lý lịch trình</Link>,
  },
  {
    key: '/admin/reports',
    icon: <FlagOutlined />,
    label: <Link to="/admin/reports">Báo cáo nội dung</Link>,
  },
  {
    key: '/admin/users',
    icon: <TeamOutlined />,
    label: <Link to="/admin/users">Quản lý người dùng</Link>,
  },
]

function getSelectedKey(pathname) {
  if (pathname === '/admin/locations/new') return '/admin/locations/new'
  if (pathname === '/admin/locations/pending') return '/admin/locations/pending'
  if (pathname.startsWith('/admin/locations/')) return '/admin/locations'
  if (pathname === '/admin/locations') return '/admin/locations'
  if (pathname.startsWith('/admin/itineraries')) return '/admin/itineraries'
  if (pathname === '/admin/reviews') return '/admin/reviews'
  if (pathname.startsWith('/admin/reports')) return '/admin/reports'
  if (pathname === '/admin/users') return '/admin/users'
  return '/admin'
}

export function AdminLayout() {
  const location = useLocation()
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  const [collapsed, setCollapsed] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [loggingOut, setLoggingOut] = useState(false)
  const isLocationsSection = location.pathname.startsWith('/admin/locations')

  const selectedKeys = useMemo(() => [getSelectedKey(location.pathname)], [location.pathname])
  const visibleMenuItems = useMemo(
    () => menuItems.filter((item) => user?.role === 'admin' || !ADMIN_ONLY_MENU_KEYS.has(item.key)),
    [user?.role],
  )

  const handleBreakpoint = (broken) => {
    setIsMobile(broken)
    setCollapsed(broken)
  }

  const toggleSidebar = () => {
    setCollapsed((previous) => !previous)
  }

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
      <Layout.Sider
        className={styles.sidebar}
        width={264}
        collapsedWidth={isMobile ? 0 : 80}
        collapsible
        collapsed={collapsed}
        onCollapse={setCollapsed}
        onBreakpoint={handleBreakpoint}
        trigger={null}
        breakpoint="lg"
      >
        <div className={styles.brand}>
          <span className={styles.brandMark} aria-hidden="true">
            <AppstoreOutlined />
          </span>
          {collapsed ? null : (
            <span className={styles.brandText}>
              <strong>HueTrip</strong>
              <small>Không gian quản trị</small>
            </span>
          )}
        </div>
        {collapsed ? null : <div className={styles.menuLabel}>Điều hướng</div>}
        <Menu
          key={location.pathname}
          className={styles.menu}
          theme="dark"
          mode="inline"
          items={visibleMenuItems}
          selectedKeys={selectedKeys}
          defaultOpenKeys={isLocationsSection ? [LOCATIONS_GROUP_KEY] : []}
          onClick={() => {
            if (isMobile) setCollapsed(true)
          }}
        />
        <div className={styles.sidebarFooter}>
          <Link to="/" className={styles.homeLink} title="Về trang chủ">
            <HomeOutlined />
            {collapsed ? null : <span>Về trang chủ</span>}
          </Link>
        </div>
      </Layout.Sider>

      {isMobile && !collapsed ? (
        <button
          type="button"
          className={styles.sidebarBackdrop}
          aria-label="Đóng menu quản trị"
          onClick={() => setCollapsed(true)}
        />
      ) : null}

      <Layout>
        <Layout.Header className={styles.header}>
          <Button
            type="text"
            className={styles.collapseButton}
            icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
            aria-label={collapsed ? 'Mở menu quản trị' : 'Thu gọn menu quản trị'}
            aria-expanded={!collapsed}
            onClick={toggleSidebar}
          >
            <span>{collapsed ? 'Mở menu' : 'Thu gọn menu'}</span>
          </Button>

          <Space className={styles.userActions} size="middle">
            <Link to="/">Về trang chủ</Link>
            <Typography.Text className={styles.userName}>{user?.displayName}</Typography.Text>
            <Button size="small" loading={loggingOut} onClick={handleLogout}>
              Đăng xuất
            </Button>
          </Space>
        </Layout.Header>

        <Layout.Content className={styles.content}>
          <Outlet />
        </Layout.Content>
      </Layout>
    </Layout>
  )
}
