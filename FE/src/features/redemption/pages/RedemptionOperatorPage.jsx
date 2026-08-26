import {
  App,
  Alert,
  Button,
  Card,
  Form,
  Input,
  Result,
  Skeleton,
  Tabs,
  Typography,
} from "antd";
import { DisconnectOutlined, ScanOutlined } from "@ant-design/icons";
import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router";
import {
  confirmVoucherRedemptionApi,
  getRedemptionDeviceSessionApi,
  logoutRedemptionDeviceApi,
  verifyVoucherRedemptionApi,
} from "../api/redemptionApi";
import { QrScanner } from "../components/QrScanner";
import { formatVoucherBenefit } from "../../vouchers/voucherPresentation";
import styles from "./RedemptionPages.module.css";

const ERROR_COPY = {
  INVALID_REDEMPTION_CODE: "Mã không đúng hoặc không còn hiệu lực.",
  REDEMPTION_SESSION_EXPIRED: "Mã đã hết hạn. Yêu cầu khách tạo mã mới.",
  WRONG_LOCATION: "Voucher không áp dụng tại địa điểm này.",
  ALREADY_USED: "Voucher đã được sử dụng trước đó.",
  CLAIM_EXPIRED: "Voucher của khách đã hết hạn sử dụng.",
  DEVICE_REVOKED: "Thiết bị đã bị thu hồi. Liên hệ người quản lý.",
  OWNERSHIP_NOT_ACTIVE: "Quyền quản lý địa điểm không còn hiệu lực.",
  LOCATION_NOT_PUBLIC: "Địa điểm hiện không đủ điều kiện xác nhận Voucher.",
};

export function RedemptionOperatorPage() {
  const navigate = useNavigate();
  const { modal } = App.useApp();
  const [form] = Form.useForm();
  const [device, setDevice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("scan");
  const [verification, setVerification] = useState(null);
  const [result, setResult] = useState(null);
  const [working, setWorking] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  useEffect(() => {
    let active = true;
    getRedemptionDeviceSessionApi()
      .then((data) => active && setDevice(data))
      .catch(() => active && navigate("/redeem/setup", { replace: true }))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [navigate]);
  const verify = useCallback(async (payload) => {
    setWorking(true);
    setErrorMessage("");
    setResult(null);
    try {
      setVerification(await verifyVoucherRedemptionApi(payload));
    } catch (error) {
      const code = error.response?.data?.code;
      setErrorMessage(
        ERROR_COPY[code] ??
          error.response?.data?.message ??
          "Không thể kiểm tra Voucher.",
      );
    } finally {
      setWorking(false);
    }
  }, []);
  const handleQr = useCallback(
    (token) => verify({ token, method: "qr" }),
    [verify],
  );
  async function confirm() {
    setWorking(true);
    try {
      setResult(
        await confirmVoucherRedemptionApi(verification.verificationToken),
      );
      setVerification(null);
    } catch (error) {
      const code = error.response?.data?.code;
      setErrorMessage(
        ERROR_COPY[code] ??
          error.response?.data?.message ??
          "Không thể xác nhận sử dụng.",
      );
      setVerification(null);
    } finally {
      setWorking(false);
    }
  }
  async function disconnect() {
    await logoutRedemptionDeviceApi().catch(() => {});
    navigate("/redeem/setup", { replace: true });
  }
  if (loading) return <Skeleton active />;
  return (
    <section className={styles.page}>
      <div className={styles.hero}>
        <Typography.Title level={2}>{device?.name}</Typography.Title>
        <p>Location #{device?.locationId}</p>
      </div>
      <Button icon={<DisconnectOutlined />} onClick={disconnect}>
        Ngắt thiết bị
      </Button>
      {errorMessage ? (
        <Alert
          type="error"
          showIcon
          message={errorMessage}
          closable
          onClose={() => setErrorMessage("")}
        />
      ) : null}
      {result ? (
        <Card>
          <Result
            status="success"
            title="Đã ghi nhận sử dụng"
            subTitle={`Mã giao dịch ${result.transactionCode} · ${new Date(result.redeemedAt).toLocaleString("vi-VN")}`}
            extra={
              <Button type="primary" onClick={() => setResult(null)}>
                Xác nhận Voucher tiếp theo
              </Button>
            }
          />
        </Card>
      ) : verification ? (
        <Card>
          <div className={styles.verifyCard}>
            <Typography.Title level={3}>Voucher hợp lệ</Typography.Title>
            <div className={styles.benefit}>
              {formatVoucherBenefit(verification.claim.benefit)}
            </div>
            <p>{verification.claim.terms}</p>
            <p>
              Khách:{" "}
              <strong>
                {verification.claim.customerDisplayName ?? "Không hiển thị"}
              </strong>
            </p>
            <p>
              Hạn dùng:{" "}
              {new Date(verification.claim.redeemUntil).toLocaleString("vi-VN")}
            </p>
            <Alert
              type="warning"
              showIcon
              message="Chỉ xác nhận sau khi đã kiểm tra điều kiện và áp dụng ưu đãi cho hóa đơn."
            />
            <div className={styles.verifyActions}>
              <Button
                type="primary"
                danger
                size="large"
                block
                loading={working}
                onClick={() =>
                  modal.confirm({
                    title: "Xác nhận Voucher đã sử dụng?",
                    content:
                      "Hành động này không thể hoàn tác. Vui lòng đảm bảo bạn đã áp dụng ưu đãi trên hóa đơn cho khách.",
                    okText: "Xác nhận sử dụng",
                    cancelText: "Hủy bỏ",
                    okButtonProps: { danger: true },
                    width: 440,
                    centered: true,
                    onOk: confirm,
                  })
                }
              >
                Đã áp dụng ưu đãi — Xác nhận sử dụng
              </Button>
              <Button block size="large" onClick={() => setVerification(null)}>
                Hủy kiểm tra
              </Button>
            </div>
          </div>
        </Card>
      ) : (
        <Card>
          <Tabs
            activeKey={tab}
            onChange={setTab}
            items={[
              {
                key: "scan",
                label: "Quét QR",
                children: (
                  <QrScanner active={tab === "scan"} onScan={handleQr} />
                ),
              },
              {
                key: "code",
                label: "Nhập mã Voucher",
                children: (
                  <Form
                    form={form}
                    layout="vertical"
                    onFinish={({ displayCode }) =>
                      verify({ displayCode, method: "code" })
                    }
                  >
                    <Form.Item
                      name="displayCode"
                      label="Mã Voucher"
                      normalize={(value) =>
                        value?.toUpperCase().replace(/[^A-Z0-9]/g, "")
                      }
                      rules={[{ required: true }]}
                    >
                      <Input size="large" autoComplete="off" />
                    </Form.Item>
                    <Button
                      block
                      type="primary"
                      size="large"
                      icon={<ScanOutlined />}
                      htmlType="submit"
                      loading={working}
                    >
                      Kiểm tra Voucher
                    </Button>
                  </Form>
                ),
              },
            ]}
          />
        </Card>
      )}
    </section>
  );
}
