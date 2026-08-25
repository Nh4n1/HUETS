import { CloseOutlined } from '@ant-design/icons'
import styles from './BrowseActiveFilters.module.css'

export function BrowseActiveFilters({ filters, onRemove, onClear }) {
  if (!filters.length) return null
  return (
    <div className={styles.filters} aria-label="Bộ lọc đang áp dụng">
      {filters.map((filter) => (
        <button type="button" key={`${filter.type}-${filter.code}`} onClick={() => onRemove(filter)}>
          {filter.label} <CloseOutlined />
        </button>
      ))}
      <button type="button" className={styles.clear} onClick={onClear}>Xóa tất cả</button>
    </div>
  )
}
