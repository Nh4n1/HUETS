import { App, Alert, Button, Card, Form, Input, Typography } from 'antd'
import { useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router'
import { registerApi } from '../api/authApi'
import { useAuth } from '../context/useAuth'
import { saveRegistrationVerification } from '../utils/registrationVerificationStorage'
import styles from './AuthPage.module.css'

export function RegisterPage() {
  const navigate = useNavigate()
  const { message } = App.useApp()
  const { isAuthenticated } = useAuth()
  const [submitting, setSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  async function handleRegister(values) {
    try {
      setSubmitting(true)
      setErrorMessage('')
      const registration = await registerApi(values)
      saveRegistrationVerification(registration)
      message.success('Mã xác thực đã được gửi tới email của bạn.')
      navigate('/register/verify', { replace: true })
    } catch (error) {
      setErrorMessage(
        error.response?.data?.message ?? 'Đăng ký không thành công.',
      )
    } finally {
      setSubmitting(false)
    }
  }

  if (isAuthenticated) {
    return <Navigate to="/profile" replace />
  }

  return (
    <main className={styles.page}>
      <Card className={styles.card}>
        <div className={styles.heading}>
          <Typography.Title level={2}>Tạo tài khoản</Typography.Title>
          <Typography.Text type="secondary">
            Lưu địa điểm và tạo lịch trình khám phá Huế.
          </Typography.Text>
        </div>

        {errorMessage ? (
          <Alert
            showIcon
            type="error"
            message={errorMessage}
            style={{ marginBottom: 16 }}
          />
        ) : null}

        <Form layout="vertical" onFinish={handleRegister}>
          <Form.Item
            name="displayName"
            label="Tên hiển thị"
            rules={[
              { required: true, message: 'Vui lòng nhập tên hiển thị.' },
              { min: 2, message: 'Tên phải có ít nhất 2 ký tự.' },
            ]}
          >
            <Input autoComplete="name" placeholder="Nguyễn Văn A" />
          </Form.Item>

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
            rules={[
              { required: true, message: 'Vui lòng nhập mật khẩu.' },
              { min: 8, message: 'Mật khẩu phải có ít nhất 8 ký tự.' },
            ]}
          >
            <Input.Password
              autoComplete="new-password"
              placeholder="Tối thiểu 8 ký tự"
            />
          </Form.Item>

          <Form.Item
            name="confirmPassword"
            label="Xác nhận mật khẩu"
            dependencies={['password']}
            rules={[
              { required: true, message: 'Vui lòng xác nhận mật khẩu.' },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue('password') === value) {
                    return Promise.resolve()
                  }
                  return Promise.reject(
                    new Error('Mật khẩu xác nhận không khớp.'),
                  )
                },
              }),
            ]}
          >
            <Input.Password
              autoComplete="new-password"
              placeholder="Nhập lại mật khẩu"
            />
          </Form.Item>

          <Button
            type="primary"
            htmlType="submit"
            block
            loading={submitting}
          >
            Đăng ký
          </Button>
        </Form>

        <div className={styles.footer}>
          <Typography.Text>
            Đã có tài khoản? <Link to="/login">Đăng nhập</Link>
          </Typography.Text>
        </div>
      </Card>
    </main>
  )
}
