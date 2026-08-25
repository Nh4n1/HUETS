import { App, Alert, Button, Card, Input, Space, Typography } from 'antd'
import { useEffect, useMemo, useState } from 'react'
import { Navigate, useNavigate } from 'react-router'
import {
  resendRegistrationCodeApi,
  verifyRegistrationApi,
} from '../api/authApi'
import { useAuth } from '../context/useAuth'
import {
  clearRegistrationVerification,
  getRegistrationVerification,
  saveRegistrationVerification,
} from '../utils/registrationVerificationStorage'
import styles from './AuthPage.module.css'

const secondsUntil = (date, now) => Math.max(
  Math.ceil((new Date(date).getTime() - now) / 1_000),
  0,
)

const initialNow = Date.now()

export function RegisterVerificationPage() {
  const navigate = useNavigate()
  const { message } = App.useApp()
  const { isAuthenticated } = useAuth()
  const [registration, setRegistration] = useState(getRegistrationVerification)
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
    () => registration ? secondsUntil(registration.resendAvailableAt, now) : 0,
    [registration, now],
  )
  const expirySeconds = useMemo(
    () => registration ? secondsUntil(registration.expiresAt, now) : 0,
    [registration, now],
  )

  async function handleVerify() {
    if (!registration || code.length !== 6) return
    try {
      setSubmitting(true)
      setError('')
      await verifyRegistrationApi({ registrationId: registration.registrationId, code })
      clearRegistrationVerification()
      message.success('Xác thực thành công. Tài khoản của bạn đã được tạo.')
      navigate('/login', { replace: true })
    } catch (requestError) {
      const errorCode = requestError.response?.data?.code
      if (errorCode === 'REGISTRATION_VERIFICATION_NOT_FOUND') {
        clearRegistrationVerification()
      }
      setError(requestError.response?.data?.message ?? 'Không thể xác thực mã. Vui lòng thử lại.')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleResend() {
    if (!registration || resendSeconds > 0) return
    try {
      setResending(true)
      setError('')
      const result = await resendRegistrationCodeApi({
        registrationId: registration.registrationId,
      })
      const nextRegistration = saveRegistrationVerification({
        ...registration,
        expiresAt: result.expiresAt,
        resendAvailableAt: result.resendAvailableAt,
      })
      setRegistration(nextRegistration)
      setCode('')
      setNow(Date.now())
      message.success('Một mã xác thực mới đã được gửi.')
    } catch (requestError) {
      const details = requestError.response?.data?.details
      if (details?.resendAvailableAt) {
        const nextRegistration = saveRegistrationVerification({
          ...registration,
          resendAvailableAt: details.resendAvailableAt,
        })
        setRegistration(nextRegistration)
      }
      setError(requestError.response?.data?.message ?? 'Không thể gửi lại mã. Vui lòng thử lại.')
    } finally {
      setResending(false)
    }
  }

  function handleChangeEmail() {
    clearRegistrationVerification()
    navigate('/register', { replace: true })
  }

  if (isAuthenticated) return <Navigate to="/profile" replace />
  if (!registration) return <Navigate to="/register" replace />

  return (
    <main className={styles.page}>
      <Card className={styles.card}>
        <div className={styles.heading}>
          <Typography.Title level={2}>Xác thực email</Typography.Title>
          <Typography.Text type="secondary">
            Nhập mã gồm 6 chữ số đã gửi tới {registration.maskedEmail}.
          </Typography.Text>
        </div>

        {error ? (
          <Alert showIcon type="error" message={error} style={{ marginBottom: 16 }} />
        ) : null}
        {expirySeconds === 0 ? (
          <Alert
            showIcon
            type="warning"
            message="Mã xác thực đã hết hạn. Hãy gửi một mã mới."
            style={{ marginBottom: 16 }}
          />
        ) : null}

        <Space direction="vertical" size="middle" style={{ width: '100%' }}>
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

          <Button
            type="primary"
            block
            loading={submitting}
            disabled={code.length !== 6 || expirySeconds === 0}
            onClick={handleVerify}
          >
            Xác thực
          </Button>

          <Button
            block
            loading={resending}
            disabled={resendSeconds > 0}
            onClick={handleResend}
          >
            {resendSeconds > 0 ? `Gửi lại mã sau ${resendSeconds}s` : 'Gửi lại mã'}
          </Button>

          <Button type="link" block onClick={handleChangeEmail}>
            Thay đổi email
          </Button>
        </Space>
      </Card>
    </main>
  )
}
