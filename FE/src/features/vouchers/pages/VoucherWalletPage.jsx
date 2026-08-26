import { Alert, Button, Card, Empty, Skeleton, Tabs, Tag, Typography } from 'antd'
import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router'
import { getMyVoucherClaimsApi } from '../api/voucherApi'
import { CLAIM_STATUS, formatVoucherBenefit, getClaimTab } from '../voucherPresentation'
import styles from './VoucherPages.module.css'

export function VoucherWalletPage() {
  const [claims, setClaims] = useState([]); const [loading, setLoading] = useState(true); const [errorMessage, setErrorMessage] = useState('')
  const load = useCallback(async () => { setLoading(true); try { setClaims(await getMyVoucherClaimsApi()); setErrorMessage('') } catch (error) { setErrorMessage(error.response?.data?.message ?? 'Không thể tải Ví Voucher.') } finally { setLoading(false) } }, [])
  useEffect(() => { Promise.resolve().then(load) }, [load])
  const tabs = [{ key: 'available', label: 'Có thể sử dụng' }, { key: 'used', label: 'Đã sử dụng' }, { key: 'unavailable', label: 'Hết hạn/không khả dụng' }].map((tab) => { const filtered = claims.filter((claim) => getClaimTab(claim.displayStatus) === tab.key); return { ...tab, label: `${tab.label} (${filtered.length})`, children: filtered.length ? <div className={styles.formStack}>{filtered.map((claim) => { const status = CLAIM_STATUS[claim.displayStatus]; return <Card key={claim.id}><div className={styles.claimCard}>{claim.location?.coverImageUrl ? <img src={claim.location.coverImageUrl} alt={claim.location.name} /> : <div />}<div><Tag color={status.color}>{status.label}</Tag><Typography.Title level={4}>{claim.title}</Typography.Title><strong>{formatVoucherBenefit(claim.benefit)}</strong><div className={styles.meta}><span>{claim.location?.name}</span><span>Sử dụng đến {new Date(claim.redeemUntil).toLocaleString('vi-VN')}</span></div></div><Link to={`/vouchers/mine/${claim.id}`}><Button type="primary">Xem Voucher</Button></Link></div></Card> })}</div> : <Empty description={`Chưa có Voucher ${tab.label.toLowerCase()}.`} /> } })
  return <main className={styles.page}><header className={styles.hero}><div><span className={styles.eyebrow}>Quyền lợi cá nhân</span><Typography.Title level={2}>Voucher của tôi</Typography.Title><p>VoucherClaim lưu snapshot quyền lợi tại thời điểm bạn nhận.</p></div></header>{errorMessage ? <Alert type="error" showIcon message={errorMessage} /> : null}{loading ? <Skeleton active /> : <Tabs items={tabs} />}</main>
}
