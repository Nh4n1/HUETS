import {
  CalendarOutlined,
  CheckCircleOutlined,
  EnvironmentOutlined,
  ExclamationCircleOutlined,
  GlobalOutlined,
  LockOutlined,
  SaveOutlined,
  WarningOutlined,
} from '@ant-design/icons'
import { Button, Input } from 'antd'
import styles from '../pages/Itinerary.module.css'

export function TripSummarySidebar({
  form,
  errorCount,
  warningCount,
  saving,
  savingDraft,
  editing,
  aiMode,
  onStartDateChange,
  onVisibilityChange,
  onSaveDraft,
}) {
  const stopsCount = form.days.reduce((total, day) => total + day.items.length, 0)
  return (
    <aside className={styles.editorSidebar}>
      <div className={styles.summarySidebarCard}>
        <span className={styles.eyebrow}>Thông tin chuyến đi</span>
        <label className={styles.fieldLabel} htmlFor="start-date"><CalendarOutlined /> Ngày bắt đầu</label>
        <Input id="start-date" type="date" disabled={aiMode} value={form.startDate} onChange={onStartDateChange} />
        <fieldset className={styles.visibilityBlock}>
          <legend>Ai có thể xem?</legend>
          <div className={styles.visibilityChoice}>
            <button disabled={form.status === 'hidden'} className={form.visibility === 'private' ? styles.selectedVisibility : ''} type="button" aria-pressed={form.visibility === 'private'} onClick={() => onVisibilityChange('private')}><LockOutlined /> Riêng tư</button>
            <button disabled={form.status === 'hidden'} className={form.visibility === 'public' ? styles.selectedVisibility : ''} type="button" aria-pressed={form.visibility === 'public'} onClick={() => onVisibilityChange('public')}><GlobalOutlined /> Công khai</button>
          </div>
          <small>{form.status === 'hidden' ? 'Quyền riêng tư bị khóa đến khi lịch trình được hiện lại.' : form.visibility === 'private' ? 'Chỉ bạn có thể xem.' : 'Mọi người có thể xem và sao chép lịch trình.'}</small>
        </fieldset>
        <div className={styles.tripNumbers}>
          <span><CalendarOutlined /><strong>{form.days.length}</strong> ngày</span>
          <span><EnvironmentOutlined /><strong>{stopsCount}</strong> điểm dừng</span>
        </div>
        <div className={`${styles.validationSummary} ${errorCount ? styles.validationError : warningCount ? styles.validationWarning : styles.validationSuccess}`}>
          {errorCount ? <ExclamationCircleOutlined /> : warningCount ? <WarningOutlined /> : <CheckCircleOutlined />}
          <div>
            <strong>{errorCount ? `${errorCount} vấn đề cần sửa` : warningCount ? `${warningCount} cảnh báo` : 'Lịch trình hợp lệ'}</strong>
            <span>{errorCount ? 'Sửa các lỗi được đánh dấu trước khi lưu.' : warningCount ? 'Bạn vẫn có thể lưu lịch trình.' : 'Sẵn sàng để lưu.'}</span>
          </div>
        </div>
        {aiMode ? <Button block onClick={onSaveDraft} loading={savingDraft}>Lưu bản nháp</Button> : null}
        <Button block size="large" type="primary" htmlType="submit" icon={<SaveOutlined />} loading={saving} disabled={errorCount > 0}>
          {saving ? 'Đang lưu...' : editing ? 'Lưu thay đổi' : aiMode ? 'Lưu thành lịch trình' : 'Tạo lịch trình'}
        </Button>
      </div>
    </aside>
  )
}
