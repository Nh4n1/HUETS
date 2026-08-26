import { App, Alert, Button, Typography } from 'antd'
import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { createVoucherApi, transitionVoucherApi } from '../api/voucherApi'
import { VoucherForm } from '../components/VoucherForm'
import styles from './VoucherPages.module.css'

export function OwnerVoucherCreatePage() {
  const { locationId } = useParams(); const navigate = useNavigate(); const { message } = App.useApp()
  const [loading, setLoading] = useState(false); const [errorMessage, setErrorMessage] = useState('')
  async function save(payload, publish) {
    setLoading(true); setErrorMessage('')
    try { const voucher = await createVoucherApi(locationId, payload); if (publish) await transitionVoucherApi(locationId, voucher.id, 'publish'); message.success(publish ? 'Đã tạo và phát hành Voucher.' : 'Đã lưu bản nháp.'); navigate(`/business/locations/${locationId}/vouchers/${voucher.id}`) }
    catch (error) { setErrorMessage(error.response?.data?.message ?? 'Không thể tạo Voucher.') }
    finally { setLoading(false) }
  }
  return <main className={styles.page}><header className={styles.hero}><div><span className={styles.eyebrow}>HueTrip Business</span><Typography.Title level={2}>Tạo Voucher</Typography.Title><p>Voucher được self-publish bởi verified owner, không qua Admin moderation.</p></div><Link to={`/business/locations/${locationId}/vouchers`}><Button>Về danh sách</Button></Link></header>{errorMessage ? <Alert type="error" showIcon message={errorMessage} /> : null}<VoucherForm loading={loading} onSave={save} /></main>
}
