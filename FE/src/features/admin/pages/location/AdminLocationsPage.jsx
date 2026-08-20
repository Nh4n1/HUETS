import { EnvironmentOutlined, SearchOutlined } from "@ant-design/icons";
import {
  Alert,
  App,
  Button,
  Form,
  Input,
  Modal,
  Select,
  Space,
  Table,
  Tag,
  Typography,
} from "antd";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router";
import {
  approveLocationApi,
  getAdminLocationsApi,
  rejectLocationApi,
} from "../../api/adminLocationsApi";
import {
  formatDateTime,
  LOCATION_STATUS,
} from "../../components/location/locationPresentation";
import styles from "./AdminLocationsPage.module.css";

const PAGE_SIZE = 12;

export function AdminLocationsPage({
  fixedStatus,
  title = "Quản lý địa điểm",
}) {
  const { message, modal } = App.useApp();
  const [rejectForm] = Form.useForm();

  const [locations, setLocations] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState(fixedStatus ?? "");
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [searchText, setSearchText] = useState("");

  const [rejectTarget, setRejectTarget] = useState(null);
  const [moderatingId, setModeratingId] = useState(null);

  async function loadLocations() {
    try {
      setLoading(true);
      const { data, meta } = await getAdminLocationsApi({
        page,
        pageSize: PAGE_SIZE,
        status: (fixedStatus ?? status) || undefined,
      });
      setLocations(data);
      setTotal(meta.total);
      setErrorMessage("");
    } catch (error) {
      setErrorMessage(
        error.response?.data?.message ?? "Không thể tải danh sách địa điểm.",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let active = true;

    getAdminLocationsApi({
      page,
      pageSize: PAGE_SIZE,
      status: (fixedStatus ?? status) || undefined,
    })
      .then(({ data, meta }) => {
        if (!active) return;
        setLocations(data);
        setTotal(meta.total);
        setErrorMessage("");
      })
      .catch((error) => {
        if (!active) return;
        setErrorMessage(
          error.response?.data?.message ?? "Không thể tải danh sách địa điểm.",
        );
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [fixedStatus, page, status]);

  async function runModeration(record, request, successMessage) {
    try {
      setModeratingId(record.id);
      await request();
      message.success(successMessage);
      await loadLocations();
    } catch (error) {
      if (error.response?.data?.code === "STALE_RESOURCE") {
        message.warning(
          "Địa điểm đã được thay đổi bởi thao tác khác. Danh sách đã được tải lại.",
        );
        await loadLocations();
        return;
      }
      message.error(
        error.response?.data?.message ?? "Không thể thực hiện kiểm duyệt.",
      );
    } finally {
      setModeratingId(null);
    }
  }

  function handleApprove(record) {
    modal.confirm({
      title: `Duyệt địa điểm "${record.name}"?`,
      content: "Địa điểm sẽ được hiển thị công khai ngay sau khi duyệt.",
      okText: "Duyệt",
      cancelText: "Hủy",
      onOk: () =>
        runModeration(
          record,
          () =>
            approveLocationApi(record.id, {
              expectedStatus: record.status,
              expectedUpdatedAt: record.updatedAt,
            }),
          "Đã duyệt địa điểm.",
        ),
    });
  }

  function openRejectModal(record) {
    setRejectTarget(record);
    rejectForm.resetFields();
  }

  async function handleRejectConfirm() {
    const values = await rejectForm.validateFields();
    const record = rejectTarget;
    await runModeration(
      record,
      () =>
        rejectLocationApi(record.id, {
          expectedStatus: record.status,
          expectedUpdatedAt: record.updatedAt,
          reason: values.reason,
        }),
      "Đã từ chối địa điểm.",
    );
    setRejectTarget(null);
  }

  const columns = [
    {
      title: "Tên địa điểm",
      dataIndex: "name",
      key: "name",
      width: 300,
      render: (name, record) => (
        <div className={styles.locationCell}>
          {record.coverImageUrl ? (
            <img
              className={styles.thumbnail}
              src={record.coverImageUrl}
              alt=""
            />
          ) : (
            <span className={styles.thumbnailFallback} aria-hidden="true">
              <EnvironmentOutlined />
            </span>
          )}
          <div>
            <Link
              className={styles.locationName}
              to={`/admin/locations/${record.id}`}
            >
              {name}
            </Link>
            <span
              className={styles.locationAddress}
              title={record.formattedAddress}
            >
              {record.formattedAddress || "Chưa cập nhật địa chỉ"}
            </span>
          </div>
        </div>
      ),
    },
    {
      title: "Trạng thái",
      dataIndex: "status",
      key: "status",
      render: (value) => {
        const presentation = LOCATION_STATUS[value] ?? {
          label: value,
          color: "default",
        };
        return <Tag color={presentation.color}>{presentation.label}</Tag>;
      },
    },
    {
      title: "Danh mục",
      key: "category",
      render: (_, record) => record.category?.name,
    },
    {
      title: "Người đóng góp",
      key: "contributor",
      render: (_, record) =>
        record.contributor?.displayName ?? "Không xác định",
    },
    {
      title: "Cập nhật",
      dataIndex: "updatedAt",
      key: "updatedAt",
      render: formatDateTime,
    },
    {
      title: "Thao tác",
      key: "actions",
      width: 220,
      fixed: "right",
      render: (_, record) =>
        record.status === "pending" ? (
          <Space size={6}>
            <Button
              size="small"
              type="primary"
              loading={moderatingId === record.id}
              disabled={moderatingId !== null && moderatingId !== record.id}
              onClick={() => handleApprove(record)}
            >
              Duyệt
            </Button>
            <Button
              size="small"
              danger
              disabled={moderatingId !== null}
              onClick={() => openRejectModal(record)}
            >
              Từ chối
            </Button>
            <Link to={`/admin/locations/${record.id}`}>
              <Button size="small">Chi tiết</Button>
            </Link>
          </Space>
        ) : (
          <Link to={`/admin/locations/${record.id}`}>
            <Button size="small">Chi tiết</Button>
          </Link>
        ),
    },
  ];

  const filteredLocations = useMemo(() => {
    const keyword = searchText.trim().toLocaleLowerCase("vi");
    if (!keyword) return locations;

    return locations.filter((item) =>
      [
        item.name,
        item.formattedAddress,
        item.category?.name,
        item.contributor?.displayName,
      ].some((value) => value?.toLocaleLowerCase("vi").includes(keyword)),
    );
  }, [locations, searchText]);

  function handlePageChange(nextPage) {
    setLoading(true);
    setPage(nextPage);
  }

  function handleStatusChange(nextStatus) {
    setLoading(true);
    setPage(1);
    setStatus(nextStatus);
  }

  return (
    <main className={`${styles.page} page-container`}>
      <header className={styles.header}>
        <div>
          <span className={styles.eyebrow}>HueTrip Admin</span>
          <Typography.Title level={2}>{title}</Typography.Title>
          <Typography.Text type="secondary">
            Theo dõi, kiểm duyệt và cập nhật các địa điểm được đóng góp trên hệ
            thống.
          </Typography.Text>
        </div>
        <Link to="/admin/locations/new">
          <Button type="primary" size="large">
            Thêm địa điểm
          </Button>
        </Link>
      </header>

      <section className={styles.toolbar} aria-label="Công cụ quản lý địa điểm">
        <Input
          className={styles.search}
          allowClear
          prefix={<SearchOutlined />}
          placeholder="Tìm trong trang theo tên, địa chỉ, danh mục..."
          value={searchText}
          onChange={(event) => setSearchText(event.target.value)}
        />
        <div className={styles.filters}>
          {fixedStatus ? null : (
            <Select
              value={status}
              onChange={handleStatusChange}
              className={styles.statusSelect}
              options={[
                { value: "", label: "Tất cả trạng thái" },
                ...Object.entries(LOCATION_STATUS).map(([value, item]) => ({
                  value,
                  label: item.label,
                })),
              ]}
            />
          )}
          <Button loading={loading} onClick={loadLocations}>
            Tải lại
          </Button>
        </div>
      </section>

      {errorMessage ? (
        <Alert
          type="error"
          showIcon
          message={errorMessage}
          style={{ marginBottom: 16 }}
        />
      ) : null}

      <section className={styles.tableCard}>
        <div className={styles.tableHeading}>
          <div>
            <strong>Danh sách địa điểm</strong>
            <span>
              {searchText
                ? `${filteredLocations.length} kết quả trong trang`
                : `${total} địa điểm`}
            </span>
          </div>
        </div>
        <Table
          rowKey="id"
          loading={loading}
          dataSource={filteredLocations}
          columns={columns}
          scroll={{ x: 1050 }}
          locale={{
            emptyText: searchText
              ? "Không có địa điểm phù hợp trong trang này."
              : "Chưa có địa điểm.",
          }}
          pagination={{
            current: page,
            pageSize: PAGE_SIZE,
            total,
            showSizeChanger: false,
            showTotal: (value) => `${value} địa điểm`,
            onChange: handlePageChange,
          }}
        />
      </section>

      <Modal
        title={
          rejectTarget
            ? `Từ chối địa điểm "${rejectTarget.name}"`
            : "Từ chối địa điểm"
        }
        open={Boolean(rejectTarget)}
        okText="Xác nhận từ chối"
        cancelText="Hủy"
        okButtonProps={{
          danger: true,
          loading: moderatingId === rejectTarget?.id,
        }}
        onOk={handleRejectConfirm}
        onCancel={() => setRejectTarget(null)}
      >
        <Form form={rejectForm} layout="vertical">
          <Form.Item
            name="reason"
            label="Lý do từ chối"
            rules={[
              {
                required: true,
                whitespace: true,
                message: "Vui lòng nhập lý do từ chối.",
              },
              { max: 1000, message: "Lý do không được vượt quá 1000 ký tự." },
            ]}
          >
            <Input.TextArea
              rows={4}
              placeholder="Mô tả thông tin cần người đóng góp chỉnh sửa"
            />
          </Form.Item>
        </Form>
      </Modal>
    </main>
  );
}
