import { Alert, Skeleton } from "antd";
import { useEffect, useState } from "react";
import { getPublicLocationVouchersApi } from "../api/voucherApi";
import { useAuth } from '../../auth/context/useAuth'
import { VoucherCard } from "./VoucherCard";
import styles from "../pages/VoucherPages.module.css";

export function PublicVouchersSection({ locationId }) {
  const { loading: authLoading } = useAuth()
  const [vouchers, setVouchers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  useEffect(() => {
    if (authLoading) return undefined
    let active = true;
    getPublicLocationVouchersApi(locationId)
      .then((data) => {
        if (active) {
          setVouchers(data);
          setErrorMessage("");
        }
      })
      .catch(
        (error) =>
          active &&
          setErrorMessage(
            error.response?.data?.message ?? "Không thể tải Voucher.",
          ),
      )
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [authLoading, locationId]);
  if (loading)
    return (
      <section className={styles.publicSection}>
        <h2>Ưu đãi tại địa điểm</h2>
        <Skeleton active />
      </section>
    );
  if (errorMessage)
    return <Alert type="warning" showIcon message={errorMessage} />;
  if (!vouchers.length) return null;
  return (
    <section className={styles.publicSection}>
      <h2>Ưu đãi tại địa điểm</h2>
      <div className={styles.grid}>
        {vouchers.map((voucher) => (
          <VoucherCard key={voucher.id} voucher={voucher} viewerClaim={voucher.viewerClaim} />
        ))}
      </div>
    </section>
  );
}
