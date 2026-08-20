import {
  CalendarOutlined,
  CloseOutlined,
  CompassOutlined,
  DownOutlined,
  EnvironmentOutlined,
  MenuOutlined,
  PlusCircleOutlined,
  UserOutlined,
} from '@ant-design/icons'
import { Avatar, Button, Dropdown, Layout } from 'antd'
import { useMemo, useState } from 'react'
import { Link, NavLink, Outlet, useNavigate } from 'react-router'
import { useAuth } from '../../features/auth/context/useAuth'
import styles from './AppLayout.module.css'

function Brand() {
  return (
    <span className={styles.brandContent}>
      <span className={styles.brandMark} aria-hidden="true">
        <span />
        <span />
        <span />
      </span>
      <span>HueTrip</span>
    </span>
  )
}

export function AppLayout() {
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  const [loggingOut, setLoggingOut] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)

  const handleLogout = async () => {
    try {
      setLoggingOut(true)
      await logout()
    } finally {
      setLoggingOut(false)
      navigate('/login', { replace: true })
    }
  }

  const userMenuItems = useMemo(() => {
    const items = [
      {
        key: 'profile',
        icon: <UserOutlined />,
        label: <Link to="/profile">Hồ sơ của tôi</Link>,
      },
      {
        key: 'my-itineraries',
        icon: <CalendarOutlined />,
        label: <Link to="/itineraries/mine">Lịch trình của tôi</Link>,
      },
      {
        key: 'contribute-location',
        icon: <PlusCircleOutlined />,
        label: <Link to="/locations/contribute">Đóng góp địa điểm</Link>,
      },
    ]

    if (user?.role === 'admin') {
      items.push({
        key: 'admin',
        icon: <CompassOutlined />,
        label: <Link to="/admin">Trang quản trị</Link>,
      })
    }

    items.push(
      { type: 'divider' },
      { key: 'logout', danger: true, label: 'Đăng xuất' },
    )
    return items
  }, [user?.role])

  const handleUserMenu = ({ key }) => {
    if (key === 'logout') handleLogout()
  }

  return (
    <Layout className={styles.layout}>
      <Layout.Header className={styles.header}>
        <div className={styles.headerInner}>
          <NavLink className={styles.brand} to="/" aria-label="HueTrip - Trang chủ">
            <Brand />
          </NavLink>

          <nav className={styles.desktopNav} aria-label="Điều hướng chính">
            <NavLink to="/">Trang chủ</NavLink>
            <NavLink to="/explore">Khám phá</NavLink>
            <NavLink to="/itineraries">Lịch trình</NavLink>
          </nav>

          <div className={styles.headerActions}>
            {user ? (
              <Dropdown
                menu={{ items: userMenuItems, onClick: handleUserMenu }}
                placement="bottomRight"
                trigger={['click']}
              >
                <Button className={styles.userButton} loading={loggingOut}>
                  <Avatar
                    size={30}
                    src={user.avatarUrl}
                    icon={<UserOutlined />}
                  />
                  <span className={styles.userName}>{user.displayName}</span>
                  <DownOutlined className={styles.chevron} />
                </Button>
              </Dropdown>
            ) : (
              <>
                <Link className={styles.loginLink} to="/login">
                  Đăng nhập
                </Link>
                <Link className={styles.registerLink} to="/register">
                  Đăng ký
                </Link>
              </>
            )}

            <Button
              className={styles.menuButton}
              type="text"
              aria-label={menuOpen ? 'Đóng menu' : 'Mở menu'}
              aria-expanded={menuOpen}
              icon={menuOpen ? <CloseOutlined /> : <MenuOutlined />}
              onClick={() => setMenuOpen((current) => !current)}
            />
          </div>
        </div>

        {menuOpen ? (
          <nav
            className={styles.mobileNav}
            aria-label="Điều hướng trên di động"
            onClick={() => setMenuOpen(false)}
          >
            <NavLink to="/">Trang chủ</NavLink>
            <Link to="/explore">Khám phá</Link>
            <Link to="/itineraries">Lịch trình</Link>
            {user ? (
              <>
                <Link to="/profile">Hồ sơ của tôi</Link>
                <Link to="/itineraries/mine">Lịch trình của tôi</Link>
                <Link to="/locations/contribute">Đóng góp địa điểm</Link>
                {user.role === 'admin' ? <Link to="/admin">Trang quản trị</Link> : null}
                <Button type="text" danger loading={loggingOut} onClick={handleLogout}>
                  Đăng xuất
                </Button>
              </>
            ) : (
              <div className={styles.mobileAuthActions}>
                <Link to="/login">Đăng nhập</Link>
                <Link className={styles.registerLink} to="/register">Đăng ký</Link>
              </div>
            )}
          </nav>
        ) : null}
      </Layout.Header>

      <Layout.Content className={styles.content}>
        <Outlet />
      </Layout.Content>

      <footer className={styles.footer}>
        <div className={styles.footerInner}>
          <div className={styles.footerIntro}>
            <Link className={styles.footerBrand} to="/">
              <Brand />
            </Link>
            <p>
              Cùng cộng đồng khám phá những câu chuyện, địa điểm và trải nghiệm
              đáng nhớ tại Huế.
            </p>
          </div>

          <div className={styles.footerColumn}>
            <h2>Khám phá</h2>
            <Link to="/locations">Địa điểm</Link>
          </div>

          <div className={styles.footerColumn}>
            <h2>Tài khoản</h2>
            {user ? <Link to="/profile">Hồ sơ của tôi</Link> : <Link to="/login">Đăng nhập</Link>}
            {user ? null : <Link to="/register">Tạo tài khoản</Link>}
            {user?.role === 'admin' ? <Link to="/admin">Trang quản trị</Link> : null}
          </div>

          <div className={styles.footerColumn}>
            <h2>HueTrip</h2>
            <a href="#">Liên hệ</a>
            <span className={styles.footerLocation}>
              <EnvironmentOutlined /> Thành phố Huế, Việt Nam
            </span>
          </div>
        </div>

        <div className={styles.footerBottom}>
          <span>© {new Date().getFullYear()} HueTrip.</span>
          <span>Khám phá chậm, cảm nhận sâu.</span>
        </div>
      </footer>
    </Layout>
  )
}