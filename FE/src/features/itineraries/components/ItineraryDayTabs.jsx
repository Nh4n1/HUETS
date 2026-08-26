import { PlusOutlined } from '@ant-design/icons'
import { Button } from 'antd'
import styles from '../pages/Itinerary.module.css'

export function ItineraryDayTabs({ days, activeIndex, onChange, onAddDay, canAddDay }) {
  return (
    <div className={styles.editorDayTabs} role="tablist" aria-label="Các ngày trong lịch trình">
      {days.map((day, index) => (
        <button
          key={`day-tab-${index + 1}`}
          type="button"
          role="tab"
          aria-selected={activeIndex === index}
          className={activeIndex === index ? styles.activeDayTab : ''}
          onClick={() => onChange(index)}
        >
          Ngày {index + 1} <span>· {day.items.length} điểm</span>
        </button>
      ))}
      <Button type="text" icon={<PlusOutlined />} disabled={!canAddDay} onClick={onAddDay}>
        Thêm ngày
      </Button>
    </div>
  )
}
