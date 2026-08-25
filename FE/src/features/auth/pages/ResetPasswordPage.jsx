import { App, Alert, Button, Card, Form, Input, Space, Typography } from 'antd'
import { useEffect, useMemo, useState } from 'react'
import { Navigate, useNavigate } from 'react-router'
import { resendPasswordResetCodeApi, resetPasswordApi } from '../api/authApi'
import { useAuth } from '../context/useAuth'
import {
  clearPasswordResetState,
  getPasswordResetState,
  savePasswordResetState,
} from '../utils/passwordResetStorage'
import styles from './AuthPage.module.css'

const secondsUntil = (date, now) => Math.max(
  Math.ceil((new Date(date).getTime() - now) / 1_000),
  0,
)

const initialNow = Date.now()

export function ResetPasswordPage() {
  const navigate = useNavigate()
  const { message } = App.useApp()
  const { isAuthenticated } = useAuth()
  const [resetState, setResetState] = useState(getPasswordResetState)
  const [code, setCode] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [resending, setResending] = useState(false)
  const [error, setError] = useState('')
  const [now, setNow] = useState(initialNow)

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1_000)
    return () => window.clearInterval(timer)
  }, [])

  const resendSeconds = useMemo(
    () => resetState ? secondsUntil(resetState.resendAvailableAt, now) : 0,
    [resetState, now],
  )
  const expirySeconds = useMemo(
    () => resetState ? secondsUntil(resetState.expiresAt, now) : 0,
    [resetState, now],
  )

  async function handleReset(values) {
    if (!resetState || code.length !== 6 || expirySeconds === 0) return
    try {
      setSubmitting(true)
      setError('')
      await resetPasswordApi({
        email: resetState.email,
        code,
        newPassword: values.newPassword,
        confirmPassword: values.confirmPassword,
      })
      clearPasswordResetState()
      message.success('Mật khẩu đã được đặt lại. Vui lòng đăng nhập bằng mật khẩu mới.')
      navigate('/login', { replace: true })
    } catch (requestError) {
      setError(requestError.response?.data?.message ?? 'Không thể đặt lại mật khẩu.')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleResend() {
    if (!resetState || resendSeconds > 0) return
    try {
      setResending(true)
      setError('')
      const result = await resendPasswordResetCodeApi({ email: resetState.email })
      const nextState = savePasswordResetState({ ...resetState, ...result })
      setResetState(nextState)
      setCode('')
      setNow(Date.now())
      message.info('Nếu email tồn tại trong HueTrip, một mã mới đã được gửi.')
    } catch (requestError) {
      const resendAvailableAt = requestError.response?.data?.details?.resendAvailableAt
      if (resendAvailableAt) {
        const nextState = savePasswordResetState({ ...resetState, resendAvailableAt })
        setResetState(nextState)
      }
      setError(requestError.response?.data?.message ?? 'Không thể gửi lại mã.')
    } finally {
      setResending(false)
    }
  }

  function handleChangeEmail() {
    clearPasswordResetState()
    navigate('/forgot-password', { replace: true })
  }

  if (isAuthenticated) return <Navigate to="/profile" replace />
  if (!resetState) return <Navigate to="/forgot-password" replace />

  return (
    <main className={styles.page}>
      <Card className={styles.card}>
        <div className={styles.heading}>
          <Typography.Title level={2}>Đặt lại mật khẩu</Typography.Title>
          <Typography.Text type="secondary">
            Nhập mã gồm 6 chữ số đã gửi tới {resetState.maskedEmail}.
          </Typography.Text>
        </div>

        {error ? <Alert showIcon type="error" message={error} style={{ marginBottom: 16 }} /> : null}
        {expirySeconds === 0 ? (
          <Alert
            showIcon
            type="warning"
            message="Mã đặt lại mật khẩu đã hết hạn. Hãy gửi một mã mới."
            style={{ marginBottom: 16 }}
          />
        ) : null}

        <Form layout="vertical" onFinish={handleReset} onValuesChange={() => setError('')}>
          <Form.Item label="Mã xác thực" required>
            <div className={styles.otpField}>
              <Input.OTP
                autoFocus
                length={6}
                value={code}
                onChange={setCode}
                formatter={(value) => value.replace(/\D/g, '')}
                disabled={submitting}
              />
            </div>
          </Form.Item>

          <Form.Item
            name="newPassword"
            label="Mật khẩu mới"
            rules={[
              { required: true, message: 'Vui lòng nhập mật khẩu mới.' },
              { min: 8, max: 128, message: 'Mật khẩu phải có từ 8 đến 128 ký tự.' },
            ]}
          >
            <Input.Password autoComplete="new-password" placeholder="Từ 8 đến 128 ký tự" />
          </Form.Item>

          <Form.Item
            name="confirmPassword"
            label="Xác nhận mật khẩu"
            dependencies={['newPassword']}
            rules={[
              { required: true, message: 'Vui lòng xác nhận mật khẩu.' },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue('newPassword') === value) return Promise.resolve()
                  return Promise.reject(new Error('Mật khẩu xác nhận không khớp.'))
                },
              }),
            ]}
          >
            <Input.Password autoComplete="new-password" placeholder="Nhập lại mật khẩu mới" />
          </Form.Item>

          <Space direction="vertical" size="middle" style={{ width: '100%' }}>
            <Button
              type="primary"
              htmlType="submit"
              block
              loading={submitting}
              disabled={code.length !== 6 || expirySeconds === 0}
            >
              Đặt lại mật khẩu
            </Button>

            <Button block loading={resending} disabled={resendSeconds > 0} onClick={handleResend}>
              {resendSeconds > 0 ? `Gửi lại mã sau ${resendSeconds}s` : 'Gửi lại mã'}
            </Button>

            <Button type="link" block onClick={handleChangeEmail}>
              Thay đổi email
            </Button>
          </Space>
        </Form>
      </Card>
    </main>
  )
}
