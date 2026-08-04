import { Alert, Button, Card, Form, Input, Typography } from 'antd'
import { Link, Navigate, useLocation } from 'react-router'
import { useAuth } from '../auth/useAuth'
import styles from './AuthPage.module.css'

export function LoginPage() {
  const location = useLocation()
  const { login, isAuthenticated, loading, error, clearError } = useAuth()

  const from = location.state?.from
  const destination = from
    ? `${from.pathname}${from.search ?? ''}${from.hash ?? ''}`
    : '/profile'

  async function handleLogin(values) {
    await login(values)
  }

  if (isAuthenticated) {
    return <Navigate to={destination} replace />
  }

  return (
    <main className={styles.page}>
      <Card className={styles.card}>
        <div className={styles.heading}>
          <Typography.Title level={2}>Đăng nhập HueTrip</Typography.Title>
          <Typography.Text type="secondary">
            Tiếp tục khám phá và xây dựng lịch trình tại Huế.
          </Typography.Text>
        </div>

        {error ? (
          <Alert
            showIcon
            type="error"
            message={error}
            style={{ marginBottom: 16 }}
          />
        ) : null}

        <Form
          layout="vertical"
          onFinish={handleLogin}
          onValuesChange={clearError}
        >
          <Form.Item
            name="email"
            label="Email"
            rules={[
              { required: true, message: 'Vui lòng nhập email.' },
              { type: 'email', message: 'Email không hợp lệ.' },
            ]}
          >
            <Input autoComplete="email" placeholder="user@example.com" />
          </Form.Item>

          <Form.Item
            name="password"
            label="Mật khẩu"
            rules={[{ required: true, message: 'Vui lòng nhập mật khẩu.' }]}
          >
            <Input.Password
              autoComplete="current-password"
              placeholder="Nhập mật khẩu"
            />
          </Form.Item>

          <Button
            type="primary"
            htmlType="submit"
            block
            loading={loading}
          >
            Đăng nhập
          </Button>
        </Form>

        <div className={styles.footer}>
          <Typography.Text>
            Chưa có tài khoản? <Link to="/register">Đăng ký</Link>
          </Typography.Text>
        </div>
      </Card>
    </main>
  )
}
