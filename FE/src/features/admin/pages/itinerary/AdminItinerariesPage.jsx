import { SearchOutlined } from "@ant-design/icons";
import {
  Alert,
  Button,
  Input,
  Modal,
  Select,
  Space,
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
      await moderateItineraryApi(record.id, { status: "active" });
      message.success("Đã hiện lại lịch trình.");
      reload();
    } catch (error) {
      message.error(error.response?.data?.message ?? "Không thể cập nhật.");
    }
  };

  const confirmHide = async () => {
    if (!hideReason.trim()) {
      message.warning("Vui lòng nhập lý do ẩn.");
      return;
    }
    try {
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
    }
  };

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
      title: "Thao tác",
      key: "actions",
      render: (_, record) => (
        <Space className={styles.actions} size={8}>
          <Link to={`/admin/itineraries/${record.id}`}>
            <Button className={styles.detailButton} size="small" type="link">
              Chi tiết
            </Button>
          </Link>
          {record.status === "hidden" ? (
            <Button
              className={styles.actionButton}
              size="small"
              onClick={() => handleUnhide(record)}
            >
              Hiện lại
            </Button>
          ) : (
            <Button
              className={styles.actionButton}
              size="small"
              onClick={() => setHideTarget(record)}
            >
              Ẩn
            </Button>
          )}
        </Space>
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
        title="Ẩn lịch trình"
        open={!!hideTarget}
        onOk={confirmHide}
        onCancel={() => {
          setHideTarget(null);
          setHideReason("");
        }}
        okText="Ẩn"
        cancelText="Huỷ"
      >
        <Input.TextArea
          rows={3}
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
