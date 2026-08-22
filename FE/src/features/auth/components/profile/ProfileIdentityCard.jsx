import {
  CheckCircleOutlined,
  EditOutlined,
  MailOutlined,
  SafetyCertificateOutlined,
  UserOutlined,
} from '@ant-design/icons'
import { Avatar, Button, Card, Tag, Typography } from 'antd'
import styles from '../../pages/ProfilePage.module.css'

export function ProfileIdentityCard({ profile, roleLabel, statusLabel, isActive, isEditing, onEdit }) {
  return (
    <Card className={styles.identityCard} bordered={false}>
      <div className={styles.identity}>
        <Avatar
          className={styles.avatar}
          size={104}
          src={profile.avatarUrl}
          icon={<UserOutlined />}
          alt={`Ảnh đại diện của ${profile.displayName}`}
        />

        <div className={styles.identityText}>
          <Typography.Title level={2} className={styles.displayName}>
            {profile.displayName}
          </Typography.Title>
          <div className={styles.emailLine}>
            <MailOutlined aria-hidden="true" />
            <span>{profile.email}</span>
          </div>
          <div className={styles.badges} aria-label="Thông tin tài khoản">
            <Tag className={styles.roleTag} icon={<SafetyCertificateOutlined />}>
              {roleLabel}
            </Tag>
            <Tag
              className={isActive ? styles.activeTag : styles.lockedTag}
              icon={<CheckCircleOutlined />}
            >
              {statusLabel}
            </Tag>
          </div>
        </div>

        <Button
          className={styles.editButton}
          icon={<EditOutlined />}
          onClick={onEdit}
          disabled={isEditing}
        >
          Chỉnh sửa hồ sơ
        </Button>
      </div>
    </Card>
  )
}
