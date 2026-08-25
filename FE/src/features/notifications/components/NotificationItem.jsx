import styles from '../../../app/layouts/AppLayout.module.css'

function formatCreatedAt(createdAt) {
  const date = new Date(createdAt)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function NotificationItem({ notification, onClick }) {
  return (
    <button
      type="button"
      className={`${styles.notificationItem} ${notification.isRead ? '' : styles.notificationUnread}`}
      onClick={() => onClick(notification)}
    >
      <span className={styles.notificationTitleRow}>
        {notification.isRead ? null : <span className={styles.notificationDot} aria-hidden="true" />}
        <span className={styles.notificationTitle}>{notification.title}</span>
      </span>
      <span className={styles.notificationMessage}>{notification.message}</span>
      <time className={styles.notificationTime} dateTime={notification.createdAt}>
        {formatCreatedAt(notification.createdAt)}
      </time>
    </button>
  )
}
