import { ClockCircleOutlined } from '@ant-design/icons'
import { Button, Modal } from 'antd'
import { useMemo, useState } from 'react'
import styles from './LocationOpeningHours.module.css'

const DAY_LABELS = { 1: 'Thứ Hai', 2: 'Thứ Ba', 3: 'Thứ Tư', 4: 'Thứ Năm', 5: 'Thứ Sáu', 6: 'Thứ Bảy', 7: 'Chủ Nhật' }

function rangeLabel(ranges = []) {
  return ranges.length ? ranges.map((range) => `${range.open}–${range.close}`).join(', ') : 'Đóng cửa'
}

function weeklyRows(openingHours) {
  const periods = new Map((openingHours?.periods ?? []).map((period) => [period.dayOfWeek, rangeLabel(period.ranges)]))
  return Array.from({ length: 7 }, (_, index) => ({ day: index + 1, label: DAY_LABELS[index + 1], hours: periods.get(index + 1) ?? 'Đóng cửa' }))
}

function groupedRows(rows) {
  return rows.reduce((groups, row) => {
    const previous = groups.at(-1)
    if (previous?.hours === row.hours && previous.endDay === row.day - 1) {
      previous.endDay = row.day
      previous.label = `${DAY_LABELS[previous.startDay]} – ${DAY_LABELS[row.day]}`
    } else groups.push({ ...row, startDay: row.day, endDay: row.day })
    return groups
  }, [])
}

export function LocationOpeningHours({ openingHours }) {
  const [open, setOpen] = useState(false)
  const rows = useMemo(() => weeklyRows(openingHours), [openingHours])
  const groups = useMemo(() => groupedRows(rows), [rows])
  const today = new Date().getDay() || 7
  const todayRow = rows.find((row) => row.day === today)
  const status = openingHours?.status ?? 'unknown'

  const summary = status === 'always_open'
    ? 'Mở cửa 24 giờ mỗi ngày'
    : status === 'scheduled'
      ? todayRow?.hours ?? 'Đóng cửa'
      : 'Chưa có thông tin giờ mở cửa'

  return (
    <section className={styles.section} aria-labelledby="opening-hours-heading">
      <span className={styles.eyebrow}>Thời gian ghé thăm</span>
      <h2 id="opening-hours-heading">Giờ hoạt động</h2>
      <div className={styles.summary}>
        <ClockCircleOutlined />
        <div><strong>Hôm nay</strong><span>{summary}</span></div>
        {status === 'scheduled' ? <Button type="link" onClick={() => setOpen(true)}>Xem lịch cả tuần</Button> : null}
      </div>
      <Modal title="Giờ mở cửa cả tuần" open={open} onCancel={() => setOpen(false)} footer={null} width={460}>
        <div className={styles.weeklyList}>
          {groups.map((row) => <div key={`${row.startDay}-${row.endDay}`}><strong>{row.label}</strong><span>{row.hours}</span></div>)}
        </div>
      </Modal>
    </section>
  )
}
