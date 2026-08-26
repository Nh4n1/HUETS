import { Alert, Button, Modal, Typography } from 'antd'
import { CopyOutlined, ReloadOutlined } from '@ant-design/icons'
import { QRCodeSVG } from 'qrcode.react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { createRedemptionSessionApi, getVoucherClaimStatusApi } from '../api/redemptionApi'
import styles from '../pages/RedemptionPages.module.css'

export function RedemptionSessionSheet({ open, claimId, onClose, onUsed }) {
  const [session, setSession] = useState(null)
  const [now, setNow] = useState(0)
  const [loading, setLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  const createSession = useCallback(async () => {
    setLoading(true); setErrorMessage('')
    try { setSession(await createRedemptionSessionApi(claimId)); setNow(Date.now()) }
    catch (error) { setErrorMessage(error.response?.data?.message ?? 'Không thể tạo mã sử dụng.') }
    finally { setLoading(false) }
  }, [claimId])

  useEffect(() => {
    if (!open) return
    Promise.resolve().then(createSession)
  }, [open, createSession])

  useEffect(() => {
    if (!open || !session) return undefined
    const timer = window.setInterval(() => setNow(Date.now()), 1000)
    const polling = window.setInterval(async () => {
      try { const claim = await getVoucherClaimStatusApi(claimId); if (claim.status === 'used') { onUsed?.(claim); onClose() } } catch { /* keep sheet usable; next poll retries */ }
    }, 2000)
    return () => { window.clearInterval(timer); window.clearInterval(polling) }
  }, [claimId, onClose, onUsed, open, session])

  const seconds = useMemo(() => session ? Math.max(0, Math.ceil((new Date(session.expiresAt).getTime() - now) / 1000)) : 0, [now, session])
  const countdown = `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`
  return <Modal open={open} onCancel={onClose} footer={null} title="Sử dụng Voucher tại địa điểm" width={520} destroyOnHidden><div className={styles.sessionSheet}>{errorMessage ? <Alert type="error" showIcon message={errorMessage} /> : null}{loading ? <Typography.Text>Đang tạo phiên bảo mật...</Typography.Text> : null}{session ? <><div className={styles.qrWrap}><QRCodeSVG value={session.qrValue} size={260} level="M" marginSize={2} /></div><Typography.Title level={2} copyable={{ text: session.displayCode, icon: <CopyOutlined /> }}>{session.displayCode}</Typography.Title><Typography.Text>Hết hạn sau {countdown}</Typography.Text><Alert type="info" showIcon message="Chưa xác nhận sử dụng" description="Chỉ rời quầy sau khi nhân viên xác nhận thành công trên thiết bị quầy." />{seconds === 0 ? <Button type="primary" icon={<ReloadOutlined />} onClick={createSession}>Tạo mã mới</Button> : null}</> : null}</div></Modal>
}
