import {
  App,
  Alert,
  Button,
  Card,
  Descriptions,
  Modal,
  Skeleton,
  Typography,
} from "antd";
import { CheckCircleOutlined } from '@ant-design/icons'
import { useCallback, useEffect, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router";
import { useAuth } from "../../auth/context/useAuth";
import { claimVoucherApi, getPublicVoucherApi } from "../api/voucherApi";
import { formatVoucherBenefit, formatVoucherDateTime, getViewerClaimPresentation } from "../voucherPresentation";
import styles from "./VoucherPages.module.css";

export function PublicVoucherDetailPage() {
  const { voucherId } = useParams();
  const navigate = useNavigate();
  const routerLocation = useLocation();
  const { isAuthenticated, loading: authLoading } = useAuth();
  const { message } = App.useApp();
  const [voucher, setVoucher] = useState(null);
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const load = useCallback(async () => {
    if (authLoading) return
    setLoading(true);
    try {
      setVoucher(await getPublicVoucherApi(voucherId));
      setErrorMessage("");
    } catch (error) {
      setErrorMessage(
        error.response?.data?.message ?? "Không thể tải Voucher.",
      );
    } finally {
      setLoading(false);
    }
  }, [authLoading, voucherId]);
  useEffect(() => {
    Promise.resolve().then(load);
  }, [load]);
  function openClaim() {
    if (!isAuthenticated) {
      navigate("/login", { state: { from: routerLocation } });
      return;
    }
    setConfirmOpen(true);
  }
  async function claim() {
    setClaiming(true);
    try {
      const claimData = await claimVoucherApi(voucherId);
      message.success("Đã giữ một suất Voucher cho bạn.");
      navigate(`/vouchers/mine/${claimData.id}`);
    } catch (error) {
      setErrorMessage(
        error.response?.data?.message ?? "Không thể nhận Voucher.",
      );
      setConfirmOpen(false);
    } finally {
      setClaiming(false);
    }
  }
  if (loading)
    return (
      <main className={styles.page}>
        <Skeleton active />
      </main>
    );
  if (!voucher)
    return (
      <main className={styles.page}>
        <Alert type="error" showIcon message={errorMessage} />
      </main>
    );
  const viewerState = getViewerClaimPresentation(voucher.viewerClaim)
  return (
    <main className={styles.page}>
      <header className={styles.hero}>
        <div>
          <span className={styles.eyebrow}>
            Ưu đãi tại {voucher.location?.name}
          </span>
          <Typography.Title level={1}>{voucher.title}</Typography.Title>
          <p>{formatVoucherBenefit(voucher.benefit)}</p>
        </div>
        {viewerState ? (
          <div className={styles.viewerClaimState}>
            <strong><CheckCircleOutlined /> {voucher.viewerClaim.displayStatus === 'available' ? 'Đã lưu vào Voucher của bạn' : viewerState.label}</strong>
            <span>Sử dụng đến {formatVoucherDateTime(voucher.viewerClaim.redeemUntil)}</span>
            <Link to={`/vouchers/mine/${voucher.viewerClaim.id}`}><Button type="primary">{viewerState.action}</Button></Link>
          </div>
        ) : (
          <Button type="primary" size="large" disabled={!voucher.claimable} onClick={openClaim}>
            {voucher.claimable ? "Nhận Voucher" : "Hiện không thể nhận"}
          </Button>
        )}
      </header>
      {errorMessage ? (
        <Alert type="error" showIcon message={errorMessage} />
      ) : null}
      <div className={styles.detail}>
        <Card title="Quyền lợi và điều kiện">
          <Typography.Paragraph>{voucher.description}</Typography.Paragraph>
          <Descriptions
            column={1}
            items={[
              {
                key: "benefit",
                label: "Quyền lợi",
                children: formatVoucherBenefit(voucher.benefit),
              },
              { key: "terms", label: "Điều kiện", children: voucher.terms },
              {
                key: "remaining",
                label: "Số suất còn lại",
                children: voucher.remainingQuantity,
              },
              {
                key: "claim",
                label: "Nhận đến",
                children: formatVoucherDateTime(voucher.claimEndAt),
              },
              {
                key: "redeem",
                label: "Sử dụng đến",
                children: formatVoucherDateTime(voucher.redeemUntil),
              },
            ]}
          />
        </Card>
        <Card title="Địa điểm áp dụng">
          <strong>{voucher.location?.name}</strong>
          <p>{voucher.location?.formattedAddress}</p>
          <Link to={`/locations/${voucher.locationId}`}>Xem Location</Link>
        </Card>
      </div>
      <Modal
        title="Nhận Voucher"
        open={confirmOpen}
        okText="Nhận Voucher"
        cancelText="Để sau"
        confirmLoading={claiming}
        onOk={claim}
        onCancel={() => setConfirmOpen(false)}
      >
        <Typography.Title level={4}>
          {formatVoucherBenefit(voucher.benefit)}
        </Typography.Title>
        <p>{voucher.terms}</p>
        <p>
          <strong>Sử dụng trước:</strong>{" "}
          {formatVoucherDateTime(voucher.redeemUntil)}
        </p>
        <Alert
          type="info"
          showIcon
          message="Mỗi tài khoản chỉ nhận một lần. Một suất được giữ ngay khi bạn xác nhận."
        />
      </Modal>
    </main>
  );
}
