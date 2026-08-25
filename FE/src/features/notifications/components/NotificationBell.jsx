import { BellOutlined } from '@ant-design/icons'
import { Badge, Button, Empty, Popover, Spin } from 'antd'
import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router'
import {
  getMyNotificationsApi,
  markAllNotificationsReadApi,
  markNotificationReadApi,
} from '../api/notificationApi'
import { NotificationItem } from './NotificationItem'
import {
  markNotificationReadLocally,
  resolveNotificationTarget,
} from '../notificationPresentation'
import styles from '../../../app/layouts/AppLayout.module.css'

export function NotificationBell() {
  const navigate = useNavigate()
  const [notifications, setNotifications] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [markingAll, setMarkingAll] = useState(false)
  const [error, setError] = useState('')
  const [open, setOpen] = useState(false)

  const loadNotifications = useCallback(async () => {
    try {
      setLoading(true)
      setError('')
      const result = await getMyNotificationsApi()
      setNotifications(result.data)
      setUnreadCount(result.unreadCount)
    } catch {
      setError('Không thể tải thông báo.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    let active = true
    getMyNotificationsApi()
      .then((result) => {
        if (!active) return
        setNotifications(result.data)
        setUnreadCount(result.unreadCount)
        setError('')
      })
      .catch(() => {
        if (active) setError('Không thể tải thông báo.')
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [])

  function handleOpenChange(nextOpen) {
    setOpen(nextOpen)
    if (nextOpen) void loadNotifications()
  }

  function handleNotificationClick(notification) {
    if (!notification.isRead) {
      setNotifications((current) => markNotificationReadLocally(
        current,
        0,
        notification.id,
      ).notifications)
      setUnreadCount((current) => Math.max(current - 1, 0))
      void markNotificationReadApi(notification.id).catch(() => {})
    }

    setOpen(false)
    navigate(resolveNotificationTarget(notification))
  }

  async function handleMarkAllRead() {
    try {
      setMarkingAll(true)
      setError('')
      await markAllNotificationsReadApi()
      setNotifications((current) => current.map((item) => ({ ...item, isRead: true })))
      setUnreadCount(0)
    } catch {
      setError('Không thể đánh dấu tất cả thông báo đã đọc.')
    } finally {
      setMarkingAll(false)
    }
  }

  const content = (
    <section className={styles.notificationPopover} aria-label="Danh sách thông báo">
      <header className={styles.notificationHeader}>
        <strong>Thông báo</strong>
        <Button
          type="link"
          size="small"
          loading={markingAll}
          disabled={unreadCount === 0}
          onClick={handleMarkAllRead}
        >
          Đánh dấu tất cả đã đọc
        </Button>
      </header>

      {loading ? (
        <div className={styles.notificationState}><Spin size="small" /></div>
      ) : (
        <>
          {error ? (
            <div className={styles.notificationError}>
              <span>{error}</span>
              {notifications.length === 0 ? (
                <Button size="small" onClick={loadNotifications}>Thử lại</Button>
              ) : null}
            </div>
          ) : null}
          {notifications.length === 0 && !error ? (
            <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Chưa có thông báo nào." />
          ) : null}
          {notifications.length > 0 ? (
            <div className={styles.notificationList}>
              {notifications.map((notification) => (
                <NotificationItem
                  key={notification.id}
                  notification={notification}
                  onClick={handleNotificationClick}
                />
              ))}
            </div>
          ) : null}
        </>
      )}
    </section>
  )

  return (
    <Popover
      content={content}
      open={open}
      onOpenChange={handleOpenChange}
      placement="bottomRight"
      trigger="click"
    >
      <Badge count={unreadCount} overflowCount={99} size="small">
        <Button
          className={styles.notificationBell}
          type="text"
          aria-label={unreadCount > 0 ? `Thông báo, ${unreadCount} chưa đọc` : 'Thông báo'}
          icon={<BellOutlined />}
        />
      </Badge>
    </Popover>
  )
}
