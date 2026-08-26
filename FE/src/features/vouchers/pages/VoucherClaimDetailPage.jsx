import { Alert, Button, Card, Descriptions, Skeleton, Tag, Typography } from 'antd'
import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router'
import { getMyVoucherClaimApi } from '../api/voucherApi'
import { CLAIM_STATUS, formatVoucherBenefit } from '../voucherPresentation'
import styles from './VoucherPages.module.css'
import { RedemptionSessionSheet } from '../../redemption/components/RedemptionSessionSheet'

export function VoucherClaimDetailPage() {
  const { claimId } = useParams(); const [claim, setClaim] = useState(null); const [loading, setLoading] = useState(true); const [sheetOpen, setSheetOpen] = useState(false); const [errorMessage, setErrorMessage] = useState('')
  const load = useCallback(async () => { setLoading(true); try { setClaim(await getMyVoucherClaimApi(claimId)); setErrorMessage('') } catch (error) { setErrorMessage(error.response?.data?.message ?? 'Không thể tải VoucherClaim.') } finally { setLoading(false) } }, [claimId])
  useEffect(() => { Promise.resolve().then(load) }, [load])
  if (loading) return <main className={styles.page}><Skeleton active /></main>
  if (!claim) return <main className={styles.page}><Alert type="error" showIcon message={errorMessage} /></main>
  const status = CLAIM_STATUS[claim.displayStatus]
  return <main className={styles.page}><header className={styles.hero}><div><span className={styles.eyebrow}>{claim.location?.name}</span><Typography.Title level={2}>{claim.title}</Typography.Title><Tag color={status.color}>{status.label}</Tag></div><Link to="/vouchers/mine"><Button>Về Ví Voucher</Button></Link></header><div className={styles.detail}><Card title="Quyền lợi đã cấp"><Typography.Title level={3} type="success">{formatVoucherBenefit(claim.benefit)}</Typography.Title><Descriptions column={1} items={[{ key: 'terms', label: 'Điều kiện', children: claim.terms }, { key: 'location', label: 'Địa điểm', children: `${claim.location?.name} · ${claim.location?.formattedAddress}` }, { key: 'deadline', label: 'Sử dụng đến', children: new Date(claim.redeemUntil).toLocaleString('vi-VN') }, { key: 'claimed', label: 'Đã nhận lúc', children: new Date(claim.claimedAt).toLocaleString('vi-VN') }]} /></Card><Card title="Sử dụng tại địa điểm">{claim.isRedeemable ? <><Alert type="info" showIcon message="Voucher sẵn sàng sử dụng tại quầy." description="QR và mã chữ cùng đại diện một phiên 5 phút. Việc mở mã chưa đánh dấu Voucher là đã dùng." /><Button block type="primary" onClick={() => setSheetOpen(true)}>Sử dụng tại địa điểm</Button></> : <Alert type="warning" showIcon message={status.label} />}</Card></div><RedemptionSessionSheet open={sheetOpen} claimId={claimId} onClose={() => setSheetOpen(false)} onUsed={() => load()} /></main>
}
