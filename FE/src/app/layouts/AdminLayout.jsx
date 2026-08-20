import {
  AppstoreOutlined,
  BellOutlined,
  CalendarOutlined,
  DashboardOutlined,
  EnvironmentOutlined,
  FlagOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  SettingOutlined,
  StarOutlined,
  TagsOutlined,
  TeamOutlined,
} from '@ant-design/icons'
import { Button, Layout, Menu, Space, Typography } from 'antd'
import { useMemo, useState } from 'react'
import { Link, Outlet, useLocation, useNavigate } from 'react-router'
import { useAuth } from '../../features/auth/context/useAuth'
import styles from './AdminLayout.module.css'

const LOCATIONS_GROUP_KEY = 'locations'

// Sidebar items without a real page yet link nowhere ('#') until their feature is built.
function placeholderLink(label) {
  return (
    <a href="#" onClick={(event) => event.preventDefault()}>
      {label}
    </a>
  )
}

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
    label: placeholderLink('Quản lý đánh giá'),
  },
  {
    key: '/admin/itineraries',
    icon: <CalendarOutlined />,
    label: <Link to="/admin/itineraries">Quản lý lịch trình</Link>,
  },
  {
    key: '/admin/reports',
    icon: <FlagOutlined />,
    label: placeholderLink('Báo cáo nội dung'),
  },
  {
    key: '/admin/users',
    icon: <TeamOutlined />,
    label: <Link to="/admin/users">Quản lý người dùng</Link>,
  },
  {
    key: '/admin/categories',
    icon: <TagsOutlined />,
    label: placeholderLink('Quản lý danh mục & thẻ'),
  },
  {
    key: '/admin/settings',
    icon: <SettingOutlined />,
    label: placeholderLink('Cài đặt hệ thống'),
  },
]

function getSelectedKey(pathname) {
  if (pathname === '/admin/locations/new') return '/admin/locations/new'
  if (pathname === '/admin/locations/pending') return '/admin/locations/pending'
  if (pathname.startsWith('/admin/locations/')) return '/admin/locations'
  if (pathname === '/admin/locations') return '/admin/locations'
  if (pathname.startsWith('/admin/itineraries')) return '/admin/itineraries'
  if (pathname === '/admin/users') return '/admin/users'
  return '/admin'
}

export function AdminLayout() {
  const location = useLocation()
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  const [collapsed, setCollapsed] = useState(false)
  const [loggingOut, setLoggingOut] = useState(false)
  const [openKeys, setOpenKeys] = useState(
    location.pathname.startsWith('/admin/locations') ? [LOCATIONS_GROUP_KEY] : [],
  )

  const selectedKeys = useMemo(() => [getSelectedKey(location.pathname)], [location.pathname])

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
        collapsible
        collapsed={collapsed}
        onCollapse={setCollapsed}
        trigger={null}
        breakpoint="lg"
      >
        <div className={styles.brand}>
          <AppstoreOutlined />
          {collapsed ? null : <span>HueTrip Admin</span>}
        </div>
        <Menu
          theme="dark"
          mode="inline"
          items={menuItems}
          selectedKeys={selectedKeys}
          openKeys={openKeys}
          onOpenChange={setOpenKeys}
        />
      </Layout.Sider>

      <Layout>
        <Layout.Header className={styles.header}>
          <Button
            type="text"
            className={styles.collapseButton}
            icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
            onClick={() => setCollapsed((previous) => !previous)}
          />

          <Space size="middle">
            <Link to="/">Về trang chủ</Link>
            <BellOutlined />
            <Typography.Text>{user?.displayName}</Typography.Text>
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
