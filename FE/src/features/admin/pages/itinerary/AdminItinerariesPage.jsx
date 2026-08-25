import { EyeOutlined, MoreOutlined, SearchOutlined } from "@ant-design/icons";
import {
  Alert,
  Button,
  Dropdown,
  Input,
  Modal,
  Select,
  Table,
  Tag,
  Typography,
  message,
} from "antd";
import { useEffect, useState } from "react";
import { Link } from "react-router";
import {
  getAdminItinerariesApi,
  moderateItineraryApi,
} from "../../api/adminItinerariesApi";
import styles from "./AdminItinerariesPage.module.css";

const PAGE_SIZE = 12;
const STATUS_TAG = {
  active: { label: "Hiển thị", color: "green" },
  hidden: { label: "Đã ẩn", color: "orange" },
};

export function AdminItinerariesPage() {
  const [itineraries, setItineraries] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("");
  const [queryInput, setQueryInput] = useState("");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [submittingId, setSubmittingId] = useState(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const [hideTarget, setHideTarget] = useState(null);
  const [hideReason, setHideReason] = useState("");

  useEffect(() => {
    let active = true;
    getAdminItinerariesApi({
      page,
      pageSize: PAGE_SIZE,
      status: status || undefined,
      q: query || undefined,
    })
      .then(({ data, meta }) => {
        if (!active) return;
        setItineraries(data);
        setTotal(meta.total);
        setErrorMessage("");
      })
      .catch((error) => {
        if (active)
          setErrorMessage(
            error.response?.data?.message ??
              "Không thể tải danh sách lịch trình.",
          );
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [page, status, query, reloadKey]);

  const reload = () => {
    setLoading(true);
    setReloadKey((value) => value + 1);
  };

  const handleUnhide = async (record) => {
    try {
      setSubmittingId(record.id);
      await moderateItineraryApi(record.id, { status: "active" });
      message.success("Đã hiện lại lịch trình.");
      reload();
    } catch (error) {
      message.error(error.response?.data?.message ?? "Không thể cập nhật.");
    } finally {
      setSubmittingId(null);
    }
  };

  const confirmHide = async () => {
    if (!hideReason.trim()) {
      message.warning("Vui lòng nhập lý do ẩn.");
      return;
    }
    try {
      setSubmittingId(hideTarget.id);
      await moderateItineraryApi(hideTarget.id, {
        status: "hidden",
        reason: hideReason.trim(),
      });
      message.success("Đã ẩn lịch trình.");
      setHideTarget(null);
      setHideReason("");
      reload();
    } catch (error) {
      message.error(error.response?.data?.message ?? "Không thể cập nhật.");
    } finally {
      setSubmittingId(null);
    }
  };

  const actionItems = (record) => [
    {
      key: "detail",
      icon: <EyeOutlined />,
      label: <Link to={`/admin/itineraries/${record.id}`}>Xem chi tiết</Link>,
    },
    { type: "divider" },
    record.status === "hidden"
      ? { key: "restore", label: "Hiện lại", disabled: submittingId !== null, onClick: () => handleUnhide(record) }
      : { key: "hide", danger: true, label: "Ẩn lịch trình", disabled: submittingId !== null, onClick: () => setHideTarget(record) },
  ];

  const columns = [
    {
      title: "Tiêu đề",
      dataIndex: "title",
      key: "title",
      render: (title, record) => (
        <Link
          className={styles.titleLink}
          to={`/admin/itineraries/${record.id}`}
        >
          {title}
        </Link>
      ),
    },
    {
      title: "Chủ sở hữu",
      key: "owner",
      render: (_, record) => (
        <span className={styles.ownerText}>
          {record.owner?.displayName ?? "Không xác định"}
        </span>
      ),
    },
    {
      title: "Trạng thái",
      dataIndex: "status",
      key: "status",
      render: (value) => (
        <Tag className={styles.statusTag} color={STATUS_TAG[value]?.color}>
          {STATUS_TAG[value]?.label ?? value}
        </Tag>
      ),
    },
    {
      title: "Số ngày / điểm dừng",
      key: "stats",
      render: (_, record) => (
        <span className={styles.tripStats}>
          <strong>{record.dayCount}</strong> ngày <i />{" "}
          <strong>{record.stopCount}</strong> điểm
        </span>
      ),
    },
    {
      title: "Lý do ẩn",
      key: "hiddenReason",
      render: (_, record) => (
        <span
          className={
            record.status === "hidden"
              ? styles.hiddenReason
              : styles.emptyReason
          }
        >
          {record.status === "hidden"
            ? (record.moderation?.hiddenReason ?? "Không có lý do")
            : "—"}
        </span>
      ),
    },
    {
      title: <MoreOutlined aria-label="Thao tác" />,
      key: "actions",
      width: 64,
      align: "center",
      fixed: "right",
      render: (_, record) => (
        <Dropdown trigger={["click"]} placement="bottomRight" menu={{ items: actionItems(record) }}>
          <Button
            className={styles.actionMenuButton}
            type="text"
            size="small"
            icon={<MoreOutlined />}
            loading={submittingId === record.id}
            aria-label={`Mở thao tác với ${record.title}`}
          />
        </Dropdown>
      ),
    },
  ];

  return (
    <main className={`${styles.page} page-container`}>
      <header className={styles.pageHeader}>
        <div>
          <span className={styles.eyebrow}>Nội dung cộng đồng</span>
          <Typography.Title level={2}>
            Quản lý lịch trình cộng đồng
          </Typography.Title>
          <p>
            Kiểm duyệt các lịch trình đã được người dùng công khai. Lịch trình
            riêng tư không xuất hiện tại đây.
          </p>
        </div>
      </header>

      <section className={styles.toolbar} aria-label="Bộ lọc lịch trình">
        <form
          className={styles.filters}
          onSubmit={(event) => {
            event.preventDefault();
            setLoading(true);
            setPage(1);
            setQuery(queryInput.trim());
          }}
        >
          <Input
            allowClear
            size="large"
            className={styles.search}
            prefix={<SearchOutlined />}
            placeholder="Tìm theo tiêu đề"
            value={queryInput}
            onChange={(event) => {
              const value = event.target.value;
              setQueryInput(value);
              if (!value) {
                setLoading(true);
                setPage(1);
                setQuery("");
              }
            }}
          />
          <Select
            size="large"
            value={status}
            onChange={(value) => {
              setLoading(true);
              setPage(1);
              setStatus(value);
            }}
            className={styles.select}
            options={[
              { value: "", label: "Tất cả trạng thái" },
              { value: "active", label: "Hiển thị" },
              { value: "hidden", label: "Đã ẩn" },
            ]}
          />
        </form>
        <Typography.Text className={styles.resultCount} type="secondary">
          <strong>{total}</strong> lịch trình công khai
        </Typography.Text>
      </section>

      {errorMessage ? (
        <Alert
          className={styles.alert}
          type="error"
          showIcon
          message={errorMessage}
          action={
            <Button size="small" onClick={reload}>
              Thử lại
            </Button>
          }
        />
      ) : null}

      <section className={styles.contentCard}>
        <Table
          className={styles.table}
          size="small"
          rowClassName={(record) =>
            record.status === "hidden" ? styles.hiddenRow : ""
          }
          rowKey="id"
          loading={loading}
          dataSource={itineraries}
          columns={columns}
          scroll={{ x: 900 }}
          locale={{
            emptyText: "Không có lịch trình công khai phù hợp với bộ lọc.",
          }}
          pagination={{
            current: page,
            pageSize: PAGE_SIZE,
            total,
            showSizeChanger: false,
            onChange: (nextPage) => {
              setLoading(true);
              setPage(nextPage);
            },
          }}
        />
      </section>

      <Modal
        className={styles.hideItineraryModal}
        title="Ẩn lịch trình"
        open={!!hideTarget}
        confirmLoading={submittingId === hideTarget?.id}
        closable={submittingId === null}
        keyboard={submittingId === null}
        maskClosable={submittingId === null}
        onOk={confirmHide}
        onCancel={() => {
          if (submittingId !== null) return;
          setHideTarget(null);
          setHideReason("");
        }}
        okText="Ẩn"
        cancelText="Huỷ"
      >
        <Input.TextArea
          rows={4}
          maxLength={500}
          showCount
          placeholder="Lý do ẩn (bắt buộc)"
          value={hideReason}
          onChange={(event) => setHideReason(event.target.value)}
        />
      </Modal>
    </main>
  );
}
