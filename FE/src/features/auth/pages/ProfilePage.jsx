import {
  BookOutlined,
  CheckCircleOutlined,
  EditOutlined,
  EnvironmentOutlined,
  IdcardOutlined,
  MailOutlined,
  SafetyCertificateOutlined,
  UserOutlined,
} from '@ant-design/icons'
import { Alert, App, Avatar, Button, Card, Form, Input, Tag, Typography } from 'antd'
import { useState } from 'react'
import { Link } from 'react-router'
import { updateProfileApi } from '../api/authApi'
import { useAuth } from '../context/useAuth'
import styles from './ProfilePage.module.css'

const ROLE_LABELS = {
  user: 'Thành viên',
  admin: 'Quản trị viên',
}

const STATUS_LABELS = {
  active: 'Đang hoạt động',
  locked: 'Đã khóa',
}

export function ProfilePage() {
  const { user } = useAuth()
  const { message } = App.useApp()
  const [form] = Form.useForm()
  const [profile, setProfile] = useState(user)
  const [isEditing, setIsEditing] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  if (!profile) return null

  function startEditing() {
    form.setFieldsValue({
      displayName: profile.displayName,
      bio: profile.bio ?? '',
    })
    setErrorMessage('')
    setIsEditing(true)
  }

  function cancelEditing() {
    form.resetFields()
    setErrorMessage('')
    setIsEditing(false)
  }

  async function handleUpdate(values) {
    try {
      setSubmitting(true)
      setErrorMessage('')
      const updatedProfile = await updateProfileApi(values)
      setProfile(updatedProfile)
      setIsEditing(false)
      message.success('Cập nhật hồ sơ thành công.')
    } catch (error) {
      setErrorMessage(
        error.response?.data?.message ?? 'Không thể cập nhật hồ sơ.',
      )
    } finally {
      setSubmitting(false)
    }
  }

  const roleLabel =
    ROLE_LABELS[profile.role] ?? profile.role

  const statusLabel =
    STATUS_LABELS[profile.status] ?? profile.status

  const isActive =
    profile.status === 'active'

  const hasBio =
    Boolean(profile.bio?.trim())

  return (
    <main className={styles.page}>
      <section
        className={styles.hero}
        aria-labelledby="profile-title"
      >
        <div className={styles.heroContent}>
          <span className={styles.eyebrow}>
            Tài khoản HueTrip
          </span>

          <Typography.Title
            id="profile-title"
            level={1}
            className={styles.title}
          >
            Hồ sơ của tôi
          </Typography.Title>

          <p className={styles.lead}>
            Thông tin đang được sử dụng cho tài khoản
            và các hoạt động của bạn trên HueTrip.
          </p>
        </div>
      </section>

      <div className={styles.content}>
        {/* =========================
            THÔNG TIN CHÍNH
        ========================== */}
        <Card
          className={styles.identityCard}
          bordered={false}
        >
          <div className={styles.identity}>
            <Avatar
              className={styles.avatar}
              size={104}
              src={profile.avatarUrl}
              icon={<UserOutlined />}
              alt={`Ảnh đại diện của ${profile.displayName}`}
            />

            <div className={styles.identityText}>
              <Typography.Title
                level={2}
                className={styles.displayName}
              >
                {profile.displayName}
              </Typography.Title>

              <div className={styles.emailLine}>
                <MailOutlined aria-hidden="true" />
                <span>{profile.email}</span>
              </div>

              <div
                className={styles.badges}
                aria-label="Thông tin tài khoản"
              >
                <Tag
                  className={styles.roleTag}
                  icon={
                    <SafetyCertificateOutlined />
                  }
                >
                  {roleLabel}
                </Tag>

                <Tag
                  className={
                    isActive
                      ? styles.activeTag
                      : styles.lockedTag
                  }
                  icon={
                    <CheckCircleOutlined />
                  }
                >
                  {statusLabel}
                </Tag>
              </div>
            </div>

            <Button
              className={styles.editButton}
              icon={<EditOutlined />}
              onClick={startEditing}
              disabled={isEditing}
            >
              Chỉnh sửa hồ sơ
            </Button>
          </div>
        </Card>

        {isEditing ? (
          <Card className={styles.editCard} bordered={false}>
            <Typography.Title level={3}>Cập nhật hồ sơ</Typography.Title>

            {errorMessage ? (
              <Alert
                className={styles.formAlert}
                showIcon
                type="error"
                message={errorMessage}
              />
            ) : null}

            <Form
              form={form}
              layout="vertical"
              onFinish={handleUpdate}
              disabled={submitting}
            >
              <Form.Item
                name="displayName"
                label="Tên hiển thị"
                rules={[
                  { required: true, whitespace: true, message: 'Vui lòng nhập tên hiển thị.' },
                  {
                    min: 2,
                    transform: (value) => value?.trim(),
                    message: 'Tên hiển thị phải có ít nhất 2 ký tự.',
                  },
                  {
                    max: 80,
                    transform: (value) => value?.trim(),
                    message: 'Tên hiển thị không được vượt quá 80 ký tự.',
                  },
                ]}
              >
                <Input maxLength={80} showCount autoComplete="name" />
              </Form.Item>

              <Form.Item
                name="bio"
                label="Giới thiệu"
                rules={[
                  { max: 500, message: 'Giới thiệu không được vượt quá 500 ký tự.' },
                ]}
              >
                <Input.TextArea
                  rows={5}
                  maxLength={500}
                  showCount
                  placeholder="Chia sẻ đôi nét về bạn..."
                />
              </Form.Item>

              <div className={styles.formActions}>
                <Button onClick={cancelEditing}>Hủy</Button>
                <Button type="primary" htmlType="submit" loading={submitting}>
                  Lưu thay đổi
                </Button>
              </div>
            </Form>
          </Card>
        ) : null}

        {/* =========================
            GIỚI THIỆU + TÀI KHOẢN
        ========================== */}
        <div className={styles.detailsGrid}>
          <Card
            className={styles.detailCard}
            bordered={false}
          >
            <div className={styles.cardHeading}>
              <span
                className={styles.headingIcon}
                aria-hidden="true"
              >
                <UserOutlined />
              </span>

              <div>
                <Typography.Title level={3}>
                  Giới thiệu
                </Typography.Title>

                <p>
                  Thông tin ngắn hiển thị trong hồ sơ
                  của bạn.
                </p>
              </div>
            </div>

            {hasBio ? (
              <p className={styles.bio}>
                {profile.bio}
              </p>
            ) : (
              <div className={styles.emptyBio}>
                Chưa có phần giới thiệu.
              </div>
            )}
          </Card>

          <Card
            className={styles.detailCard}
            bordered={false}
          >
            <div className={styles.cardHeading}>
              <span
                className={styles.headingIcon}
                aria-hidden="true"
              >
                <IdcardOutlined />
              </span>

              <div>
                <Typography.Title level={3}>
                  Thông tin tài khoản
                </Typography.Title>

                <p>
                  Các thông tin cơ bản gắn với tài
                  khoản HueTrip.
                </p>
              </div>
            </div>

            <dl className={styles.accountList}>
              <div className={styles.accountRow}>
                <dt>Email</dt>
                <dd>{profile.email}</dd>
              </div>

              <div className={styles.accountRow}>
                <dt>Vai trò</dt>
                <dd>{roleLabel}</dd>
              </div>

              <div className={styles.accountRow}>
                <dt>Trạng thái</dt>

                <dd
                  className={
                    isActive
                      ? styles.statusActive
                      : styles.statusLocked
                  }
                >
                  <span
                    className={styles.statusDot}
                    aria-hidden="true"
                  />

                  {statusLabel}
                </dd>
              </div>
            </dl>
          </Card>
        </div>

        {/* =========================
            FE-02 - BOOKMARK
        ========================== */}
        <Card
          className={styles.personalCard}
          bordered={false}
        >
          <div className={styles.personalHeader}>
            <div>
              <Typography.Title level={3}>
                Khu vực cá nhân
              </Typography.Title>

              <p>
                Truy cập nhanh các nội dung thuộc
                tài khoản của bạn.
              </p>
            </div>
          </div>

          <Link
            to="/saved"
            className={styles.personalItem}
          >
            <span
              className={styles.personalIcon}
              aria-hidden="true"
            >
              <BookOutlined />
            </span>

            <span
              className={styles.personalContent}
            >
              <strong>
                Nội dung đã lưu
              </strong>

              <small>
                Xem các địa điểm và lịch trình
                bạn đã bookmark.
              </small>
            </span>

            <span
              className={styles.personalArrow}
              aria-hidden="true"
            >
              →
            </span>
          </Link>

          <Link
            to="/locations/mine"
            className={styles.personalItem}
          >
            <span
              className={styles.personalIcon}
              aria-hidden="true"
            >
              <EnvironmentOutlined />
            </span>

            <span
              className={styles.personalContent}
            >
              <strong>
                Địa điểm tôi đã đóng góp
              </strong>

              <small>
                Theo dõi trạng thái kiểm duyệt các địa
                điểm bạn đã gửi.
              </small>
            </span>

            <span
              className={styles.personalArrow}
              aria-hidden="true"
            >
              →
            </span>
          </Link>
        </Card>
      </div>
    </main>
  )
}
