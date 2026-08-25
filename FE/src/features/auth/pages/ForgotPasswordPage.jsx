import { App, Alert, Button, Card, Form, Input, Typography } from 'antd'
import { useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router'
import { forgotPasswordApi } from '../api/authApi'
import { useAuth } from '../context/useAuth'
import { savePasswordResetState } from '../utils/passwordResetStorage'
import styles from './AuthPage.module.css'

export function ForgotPasswordPage() {
  const navigate = useNavigate()
  const { message } = App.useApp()
  const { isAuthenticated } = useAuth()
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(values) {
    try {
      setSubmitting(true)
      setError('')
      const email = values.email.trim()
      const result = await forgotPasswordApi({ email })
      savePasswordResetState({ ...result, email })
      message.info('Nếu email tồn tại trong HueTrip, mã đặt lại mật khẩu đã được gửi.')
      navigate('/forgot-password/reset', { replace: true })
    } catch (requestError) {
      setError(requestError.response?.data?.message ?? 'Không thể gửi mã đặt lại mật khẩu.')
    } finally {
      setSubmitting(false)
    }
  }

  if (isAuthenticated) return <Navigate to="/profile" replace />

  return (
    <main className={styles.page}>
      <Card className={styles.card}>
        <div className={styles.heading}>
          <Typography.Title level={2}>Quên mật khẩu</Typography.Title>
          <Typography.Text type="secondary">
            Nhập email đã đăng ký để nhận mã xác thực.
          </Typography.Text>
        </div>

        {error ? <Alert showIcon type="error" message={error} style={{ marginBottom: 16 }} /> : null}

        <Form layout="vertical" onFinish={handleSubmit} onValuesChange={() => setError('')}>
          <Form.Item
            name="email"
            label="Email"
            rules={[
              { required: true, message: 'Vui lòng nhập email.' },
              { type: 'email', message: 'Email không hợp lệ.' },
            ]}
          >
            <Input autoFocus autoComplete="email" placeholder="user@example.com" />
          </Form.Item>

          <Button type="primary" htmlType="submit" block loading={submitting}>
            Gửi mã xác thực
          </Button>
        </Form>

        <div className={styles.footer}>
          <Link to="/login">← Quay lại đăng nhập</Link>
        </div>
      </Card>
    </main>
  )
}
