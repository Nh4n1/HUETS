import { App, Form } from 'antd'
import { useState } from 'react'
import { updateProfileApi } from '../api/authApi'
import { ProfileDetails } from '../components/profile/ProfileDetails'
import { ProfileEditForm } from '../components/profile/ProfileEditForm'
import { ProfileHero } from '../components/profile/ProfileHero'
import { ProfileIdentityCard } from '../components/profile/ProfileIdentityCard'
import { ProfilePersonalLinks } from '../components/profile/ProfilePersonalLinks'
import { ProfileReviews } from '../components/profile/ProfileReviews'
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
    form.setFieldsValue({ displayName: profile.displayName, bio: profile.bio ?? '' })
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
      setErrorMessage(error.response?.data?.message ?? 'Không thể cập nhật hồ sơ.')
    } finally {
      setSubmitting(false)
    }
  }

  const roleLabel = ROLE_LABELS[profile.role] ?? profile.role
  const statusLabel = STATUS_LABELS[profile.status] ?? profile.status
  const isActive = profile.status === 'active'

  return (
    <main className={styles.page}>
      <ProfileHero />
      <div className={styles.content}>
        <ProfileIdentityCard
          profile={profile}
          roleLabel={roleLabel}
          statusLabel={statusLabel}
          isActive={isActive}
          isEditing={isEditing}
          onEdit={startEditing}
        />
        {isEditing ? (
          <ProfileEditForm
            form={form}
            submitting={submitting}
            errorMessage={errorMessage}
            onCancel={cancelEditing}
            onSubmit={handleUpdate}
          />
        ) : null}
        <ProfileDetails
          profile={profile}
          roleLabel={roleLabel}
          statusLabel={statusLabel}
          isActive={isActive}
        />
        <ProfileReviews />
        <ProfilePersonalLinks />
      </div>
    </main>
  )
}
