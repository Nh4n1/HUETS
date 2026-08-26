import { Alert, Button, Card, Form, Input, Typography } from 'antd'
import { useState } from 'react'
import { useNavigate } from 'react-router'
import { activateRedemptionDeviceApi } from '../api/redemptionApi'
import styles from './RedemptionPages.module.css'

export function RedemptionSetupPage() {
  const navigate = useNavigate(); const [loading, setLoading] = useState(false); const [errorMessage, setErrorMessage] = useState('')
  async function activate(values) { setLoading(true); setErrorMessage(''); try { await activateRedemptionDeviceApi(values.activationCode); navigate('/redeem', { replace: true }) } catch (error) { const code = error.response?.data?.code; const copy = { INVALID_ACTIVATION_CODE: 'Mã không đúng hoặc không còn hiệu lực.', ACTIVATION_CODE_EXPIRED: 'Mã đã hết hạn. Yêu cầu người quản lý tạo mã mới.', ACTIVATION_CODE_CONSUMED: 'Mã đã được dùng. Yêu cầu người quản lý tạo mã mới.', RATE_LIMITED: 'Quá nhiều lần thử. Vui lòng chờ rồi thử lại.' }; setErrorMessage(copy[code] ?? error.response?.data?.message ?? 'Không thể kích hoạt thiết bị.') } finally { setLoading(false) } }
  return <section className={styles.page}><div className={styles.hero}><Typography.Title level={2}>Kích hoạt thiết bị quầy</Typography.Title><p>Nhập mã một lần do người quản lý Location tạo.</p></div><Card>{errorMessage ? <Alert type="error" showIcon message={errorMessage} style={{ marginBottom: 16 }} /> : null}<Form layout="vertical" onFinish={activate}><Form.Item name="activationCode" label="Activation Code" normalize={(value) => value?.toUpperCase().replace(/[^A-Z0-9]/g, '')} rules={[{ required: true, message: 'Vui lòng nhập Activation Code.' }]}><Input size="large" autoComplete="one-time-code" /></Form.Item><Button block type="primary" size="large" htmlType="submit" loading={loading}>Kích hoạt</Button></Form></Card></section>
}
