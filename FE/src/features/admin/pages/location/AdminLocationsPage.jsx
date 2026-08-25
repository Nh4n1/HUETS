import {
  DeleteOutlined,
  EditOutlined,
  EnvironmentOutlined,
  EyeInvisibleOutlined,
  EyeOutlined,
  MoreOutlined,
  SearchOutlined,
} from "@ant-design/icons";
import {
  Alert,
  App,
  Button,
  Dropdown,
  Form,
  Input,
  Modal,
  Select,
  Table,
  Tag,
  Typography,
} from "antd";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router";
import { useAuth } from "../../../auth/context/useAuth";
import {
  approveLocationApi,
  deleteAdminLocationApi,
  getAdminLocationsApi,
  hideLocationApi,
  rejectLocationApi,
  restoreLocationApi,
} from "../../api/adminLocationsApi";
import {
  LOCATION_STATUS,
} from "../../components/location/locationPresentation";
import styles from "./AdminLocationsPage.module.css";

const PAGE_SIZE = 12;
const DELETABLE_STATUSES = new Set(["hidden", "rejected", "withdrawn"]);

export function AdminLocationsPage({
  fixedStatus,
  title = "Quản lý địa điểm",
}) {
  const { message, modal } = App.useApp();
  const { user } = useAuth();
  const [rejectForm] = Form.useForm();
  const [hideForm] = Form.useForm();
  const [deleteForm] = Form.useForm();
  const isAdmin = user?.role === "admin";

  const [locations, setLocations] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState(fixedStatus ?? "");
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [searchText, setSearchText] = useState("");

  const [rejectTarget, setRejectTarget] = useState(null);
  const [hideTarget, setHideTarget] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [moderatingId, setModeratingId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

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
      return true;
    } catch (error) {
      if (error.response?.data?.code === "STALE_RESOURCE") {
        message.warning(
          "Địa điểm đã được thay đổi bởi thao tác khác. Danh sách đã được tải lại.",
        );
        await loadLocations();
        return false;
      }
      message.error(
        error.response?.data?.message ?? "Không thể thực hiện kiểm duyệt.",
      );
      return false;
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
    const completed = await runModeration(
      record,
      () =>
        rejectLocationApi(record.id, {
          expectedStatus: record.status,
          expectedUpdatedAt: record.updatedAt,
          reason: values.reason,
        }),
      "Đã từ chối địa điểm.",
    );
    if (completed) setRejectTarget(null);
  }

  function openHideModal(record) {
    setHideTarget(record);
    hideForm.resetFields();
  }

  async function handleHideConfirm() {
    const values = await hideForm.validateFields();
    const record = hideTarget;
    const completed = await runModeration(
      record,
      () => hideLocationApi(record.id, {
        expectedStatus: record.status,
        expectedUpdatedAt: record.updatedAt,
        reason: values.reason,
      }),
      "Đã ẩn địa điểm khỏi nội dung công khai.",
    );
    if (completed) setHideTarget(null);
  }

  function handleRestore(record) {
    modal.confirm({
      title: `Hiện lại địa điểm "${record.name}"?`,
      content: "Địa điểm sẽ xuất hiện trở lại trên trang công khai và có thể được thêm vào lịch trình.",
      okText: "Hiện lại",
      cancelText: "Hủy",
      onOk: () => runModeration(
        record,
        () => restoreLocationApi(record.id, {
          expectedStatus: record.status,
          expectedUpdatedAt: record.updatedAt,
        }),
        "Đã hiện lại địa điểm.",
      ),
    });
  }

  function openDeleteModal(record) {
    setDeleteTarget(record);
    deleteForm.resetFields();
  }

  async function handleDeleteConfirm() {
    const values = await deleteForm.validateFields();
    const record = deleteTarget;
    try {
      setDeletingId(record.id);
      await deleteAdminLocationApi(record.id, {
        expectedStatus: record.status,
        expectedUpdatedAt: record.updatedAt,
        reason: values.reason,
      });
      message.success("Đã xóa địa điểm khỏi hệ thống.");
      setDeleteTarget(null);
      await loadLocations();
    } catch (error) {
      if (error.response?.data?.code === "STALE_RESOURCE") {
        message.warning("Địa điểm đã thay đổi. Danh sách đã được tải lại.");
        setDeleteTarget(null);
        await loadLocations();
        return;
      }
      message.error(error.response?.data?.message ?? "Không thể xóa địa điểm.");
    } finally {
      setDeletingId(null);
    }
  }

  const columns = [
    {
      title: "Tên địa điểm",
      dataIndex: "name",
      key: "name",
      width: 270,
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
      title: <MoreOutlined aria-label="Thao tác" />,
      key: "actions",
      width: 64,
      align: "center",
      fixed: "right",
      render: (_, record) => (
        <div className={styles.rowActions}>
          <Dropdown
            trigger={["click"]}
            placement="bottomRight"
            menu={{ items: getActionItems(record) }}
          >
            <Button
              type="text"
              size="small"
              className={styles.actionMenuButton}
              icon={<MoreOutlined />}
              loading={moderatingId === record.id || deletingId === record.id}
              aria-label={`Mở thao tác với ${record.name}`}
            />
          </Dropdown>
        </div>
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

  function getActionItems(record) {
    const busyWithAnotherRecord = moderatingId !== null && moderatingId !== record.id;
    const items = [];

    if (record.status === "pending") {
      items.push(
        {
          key: "approve",
          label: "Duyệt địa điểm",
          disabled: busyWithAnotherRecord,
          onClick: () => handleApprove(record),
        },
        {
          key: "reject",
          danger: true,
          label: "Từ chối",
          disabled: moderatingId !== null,
          onClick: () => openRejectModal(record),
        },
      );
    }

    if (record.status === "approved") {
      items.push({
        key: "hide",
        icon: <EyeInvisibleOutlined />,
        label: "Ẩn khỏi nội dung công khai",
        disabled: moderatingId !== null,
        onClick: () => openHideModal(record),
      });
    }

    if (record.status === "hidden") {
      items.push({
        key: "restore",
        icon: <EyeOutlined />,
        label: "Hiện lại địa điểm",
        disabled: busyWithAnotherRecord,
        onClick: () => handleRestore(record),
      });
    }

    if (isAdmin) {
      if (items.length > 0) items.push({ type: "divider" });
      items.push({
        key: "edit",
        icon: <EditOutlined />,
        label: <Link to={`/admin/locations/${record.id}/edit`}>Chỉnh sửa</Link>,
      });

      if (DELETABLE_STATUSES.has(record.status)) {
        items.push({
          key: "delete",
          danger: true,
          icon: <DeleteOutlined />,
          label: "Xóa khỏi hệ thống",
          disabled: deletingId !== null && deletingId !== record.id,
          onClick: () => openDeleteModal(record),
        });
      }
    }

    return [
      {
        key: "detail",
        icon: <EyeOutlined />,
        label: <Link to={`/admin/locations/${record.id}`}>Xem chi tiết</Link>,
      },
      ...(items.length > 0 ? [{ type: "divider" }, ...items] : []),
    ];
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
          <Button
            className={styles.reloadButton}
            loading={loading}
            onClick={loadLocations}
          >
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
          size="small"
          loading={loading}
          dataSource={filteredLocations}
          columns={columns}
          scroll={{ x: 720 }}
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
        <Alert
          className={styles.rejectExplanation}
          showIcon
          type="info"
          message="Từ chối là một kết quả kiểm duyệt, không xóa địa điểm. Người đóng góp vẫn xem được địa điểm và lý do bên dưới."
        />
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

      <Modal
        title={hideTarget ? `Ẩn địa điểm "${hideTarget.name}"` : "Ẩn địa điểm"}
        open={Boolean(hideTarget)}
        okText="Xác nhận ẩn"
        cancelText="Hủy"
        okButtonProps={{
          danger: true,
          loading: moderatingId === hideTarget?.id,
        }}
        onOk={handleHideConfirm}
        onCancel={() => setHideTarget(null)}
      >
        <Alert
          className={styles.rejectExplanation}
          showIcon
          type="warning"
          message="Địa điểm sẽ ngừng xuất hiện công khai. Bookmark, đánh giá và tham chiếu trong lịch trình vẫn được giữ."
        />
        <Form form={hideForm} layout="vertical">
          <Form.Item
            name="reason"
            label="Lý do ẩn"
            rules={[
              { required: true, whitespace: true, message: "Vui lòng nhập lý do ẩn địa điểm." },
              { max: 1000, message: "Lý do không được vượt quá 1000 ký tự." },
            ]}
          >
            <Input.TextArea rows={4} placeholder="Mô tả vấn đề cần xác minh hoặc chỉnh sửa" />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title={deleteTarget ? `Xóa "${deleteTarget.name}" khỏi hệ thống` : "Xóa địa điểm"}
        open={Boolean(deleteTarget)}
        okText="Xóa khỏi hệ thống"
        cancelText="Hủy"
        okButtonProps={{ danger: true, loading: deletingId === deleteTarget?.id }}
        onOk={handleDeleteConfirm}
        onCancel={() => setDeleteTarget(null)}
      >
        <div className={styles.deleteConfirmContent}>
          <Alert
            showIcon
            type="error"
            message="Chỉ sử dụng khi địa điểm cần được loại khỏi dữ liệu vận hành. Hiện chưa có chức năng khôi phục trên giao diện."
          />
          <p>Bookmark liên quan sẽ bị xóa; đánh giá và tham chiếu lịch trình được giữ để truy vết.</p>
        </div>
        <Form form={deleteForm} layout="vertical">
          <Form.Item
            name="reason"
            label="Lý do xóa"
            rules={[
              { required: true, whitespace: true, message: "Vui lòng nhập lý do xóa địa điểm." },
              { max: 1000, message: "Lý do không được vượt quá 1000 ký tự." },
            ]}
          >
            <Input.TextArea rows={3} placeholder="Ví dụ: dữ liệu thử nghiệm hoặc bản ghi trùng lặp" />
          </Form.Item>
        </Form>
      </Modal>
    </main>
  );
}
