import { CheckCircleOutlined } from '@ant-design/icons'
import { Button, Card, Tag } from "antd";
import { Link } from "react-router";
import {
  formatVoucherBenefit,
  formatVoucherDateTime,
  getViewerClaimPresentation,
  VOUCHER_STATUS,
} from "../voucherPresentation";
import styles from "../pages/VoucherPages.module.css";

export function VoucherCard({ voucher, owner = false, viewerClaim = voucher.viewerClaim }) {
  const status = owner ? VOUCHER_STATUS[voucher.status] : null;
  const viewerState = owner ? null : getViewerClaimPresentation(viewerClaim)
  return (
    <Card
      className={styles.voucherCard}
      cover={
        voucher.location?.coverImageUrl ? (
          <img src={voucher.location.coverImageUrl} alt={voucher.title} />
        ) : null
      }
    >
      <div className={styles.cardBody}>
        <div>
          {status ? <Tag color={status.color}>{status.label}</Tag> : null}
          {viewerState ? <Tag color={viewerState.tone === 'saved' ? 'success' : 'default'} icon={<CheckCircleOutlined />}>{viewerState.label}</Tag> : null}
          <span className={styles.benefit}>
            {formatVoucherBenefit(voucher.benefit)}
          </span>
        </div>
        <h3>{voucher.title}</h3>
        <p>{voucher.description}</p>
        <div className={styles.meta}>
          <span>Nhận đến {formatVoucherDateTime(voucher.claimEndAt)}</span>
          <span>Sử dụng đến {formatVoucherDateTime(voucher.redeemUntil)}</span>
          {owner ? (
            <span>
              {voucher.claimedCount}/{voucher.totalQuantity} lượt đã nhận ·{" "}
              {voucher.redeemedCount} lượt sử dụng
            </span>
          ) : (
            <span>Còn {voucher.remainingQuantity} suất</span>
          )}
        </div>
        <Link
          to={
            owner
              ? `/business/locations/${voucher.locationId}/vouchers/${voucher.id}`
              : `/vouchers/${voucher.id}`
          }
        >
          <Button type="primary" block>
            {owner ? "Quản lý Voucher" : viewerState?.action ?? "Xem và nhận Voucher"}
          </Button>
        </Link>
      </div>
    </Card>
  );
}
