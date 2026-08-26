import {
  ArrowDownOutlined,
  ArrowUpOutlined,
  CaretDownOutlined,
  CaretUpOutlined,
  DeleteOutlined,
  EditOutlined,
  EllipsisOutlined,
  EnvironmentOutlined,
  SwapOutlined,
} from '@ant-design/icons'
import { Button, Dropdown, Input, InputNumber, Select, Tag, TimePicker } from 'antd'
import dayjs from 'dayjs'
import { PlanningIssues } from './PlanningIssues'
import styles from '../pages/Itinerary.module.css'

const categoryName = (item) => item.location?.category?.name ?? item.location?.category?.code ?? 'Địa điểm'

export function ItineraryStopCard({
  item,
  dayIndex,
  itemIndex,
  days,
  expanded,
  issues,
  errors,
  mustVisit,
  onToggle,
  onUpdate,
  onMove,
  onMoveDay,
  onReplace,
  onDelete,
}) {
  const unavailable = item.location?.status && item.location.status !== 'approved'
  const start = item.startTime || '—'
  const end = item.endTime || '—'
  const duration = Number(item.durationMinutes) > 0 ? `${item.durationMinutes} phút` : 'Chưa đặt thời lượng'
  const menuItems = [
    { key: 'up', icon: <ArrowUpOutlined />, label: 'Di chuyển lên', disabled: itemIndex === 0 },
    { key: 'down', icon: <ArrowDownOutlined />, label: 'Di chuyển xuống', disabled: itemIndex === days[dayIndex].items.length - 1 },
    {
      key: 'move-day',
      icon: <SwapOutlined />,
      label: 'Chuyển sang ngày',
      disabled: days.length === 1,
      children: days.map((_, index) => ({
        key: `day-${index}`,
        label: `Ngày ${index + 1}`,
        disabled: index === dayIndex || days[index].items.length >= 20,
      })),
    },
    { key: 'replace', icon: <EditOutlined />, label: 'Đổi địa điểm' },
    { type: 'divider' },
    {
      key: 'delete',
      danger: true,
      icon: <DeleteOutlined />,
      label: mustVisit ? 'Không thể xóa Must Visit' : 'Xóa khỏi lịch trình',
      disabled: days[dayIndex].items.length === 1 || mustVisit,
    },
  ]

  function handleMenu({ key }) {
    if (key === 'up') onMove(-1)
    else if (key === 'down') onMove(1)
    else if (key === 'replace') onReplace()
    else if (key === 'delete') onDelete()
    else if (key.startsWith('day-')) onMoveDay(Number(key.slice(4)))
  }

  return (
    <article className={`${styles.stopCard} ${expanded ? styles.expandedStopCard : ''}`} id={`stop-${dayIndex}-${itemIndex}`}>
      <div className={styles.stopTimeColumn}>
        <strong>{start}</strong>
        <span>{end !== '—' ? `đến ${end}` : 'chưa có giờ kết thúc'}</span>
      </div>
      <span className={styles.stopTimelineDot}>{itemIndex + 1}</span>
      <div className={styles.stopSurface}>
        <div className={styles.stopOverview}>
          {item.location?.coverImageUrl
            ? <img src={item.location.coverImageUrl} alt="" />
            : <span className={styles.stopImageFallback}><EnvironmentOutlined /></span>}
          <div className={styles.stopIdentity}>
            <div className={styles.stopBadges}>
              {mustVisit ? <Tag color="gold">Must Visit</Tag> : null}
              {unavailable ? <Tag color="red">Không khả dụng</Tag> : null}
              {item.note ? <Tag>Đã có ghi chú</Tag> : null}
            </div>
            <strong>{item.location?.name ?? 'Chưa chọn địa điểm'}</strong>
            <span>{categoryName(item)} · {item.location?.formattedAddress || 'Huế'}</span>
            <small>{start}–{end} · {duration}</small>
          </div>
          <div className={styles.stopActions}>
            <Button
              type="text"
              aria-label={expanded ? 'Thu gọn điểm dừng' : 'Chỉnh chi tiết điểm dừng'}
              title={expanded ? 'Thu gọn' : 'Chỉnh chi tiết'}
              icon={expanded ? <CaretUpOutlined /> : <CaretDownOutlined />}
              onClick={onToggle}
            />
            <Dropdown trigger={['click']} menu={{ items: menuItems, onClick: handleMenu }}>
              <Button type="text" aria-label={`Thao tác với ${item.location?.name ?? 'điểm dừng'}`} icon={<EllipsisOutlined />} />
            </Dropdown>
          </div>
        </div>

        {errors?.locationId ? <p className={styles.fieldError}>{errors.locationId}</p> : null}
        <PlanningIssues issues={issues} compact />

        {expanded ? (
          <div className={styles.stopDetails}>
            <div>
              <label className={styles.fieldLabel}>Bắt đầu</label>
              <TimePicker
                format="HH:mm"
                value={item.startTime ? dayjs(item.startTime, 'HH:mm') : null}
                onChange={(value) => onUpdate('startTime', value ? value.format('HH:mm') : '')}
              />
            </div>
            <div>
              <label className={styles.fieldLabel}>Thời lượng</label>
              <InputNumber
                min={1}
                max={1440}
                addonAfter="phút"
                status={errors?.durationMinutes ? 'error' : undefined}
                value={item.durationMinutes === '' ? null : Number(item.durationMinutes)}
                onChange={(value) => onUpdate('durationMinutes', value ?? '')}
              />
            </div>
            <div className={styles.endTimeField}>
              <span>Kết thúc</span>
              <strong>{end}</strong>
              <small>Tự động tính</small>
            </div>
            <div>
              <label className={styles.fieldLabel}>Chuyển sang ngày</label>
              <Select
                value={dayIndex}
                onChange={onMoveDay}
                options={days.map((day, index) => ({
                  value: index,
                  label: `Ngày ${index + 1}`,
                  disabled: index === dayIndex || day.items.length >= 20,
                }))}
              />
            </div>
            <div className={styles.stopNoteField}>
              <label className={styles.fieldLabel}>Ghi chú</label>
              <Input.TextArea rows={2} maxLength={1000} placeholder="Ăn sáng, tham quan, chụp ảnh..." value={item.note} onChange={(event) => onUpdate('note', event.target.value)} />
            </div>
            <Button className={styles.replaceLocationButton} icon={<EditOutlined />} onClick={onReplace}>Đổi địa điểm</Button>
            {errors?.durationMinutes ? <p className={`${styles.fieldError} ${styles.stopFieldError}`}>{errors.durationMinutes}</p> : null}
          </div>
        ) : null}
      </div>
    </article>
  )
}
