import { CloseOutlined } from '@ant-design/icons'
import styles from './LocationActiveFilters.module.css'

export function LocationActiveFilters({ mode, filters, onRemove, onToggle, onClear }) {
  if (!filters.length) return null

  return (
    <div className={styles.filters} aria-label="Bộ lọc đang áp dụng">
      {filters.map((filter) => {
        const canToggle = mode === 'search' && ['required', 'preferred'].includes(filter.type)
        const stateLabel = filter.priority === 'required'
          ? 'Bắt buộc'
          : filter.priority === 'preferred' ? 'Ưu tiên' : ''

        return (
          <div className={styles.filterChip} key={`${filter.type}-${filter.code}`}>
            {canToggle ? (
              <button
                type="button"
                className={styles.chipMain}
                onClick={() => onToggle(filter)}
                aria-label={`Chuyển ${filter.label} sang ${filter.priority === 'required' ? 'ưu tiên' : 'bắt buộc'}`}
              >
                {filter.label}<span>{stateLabel}</span>
              </button>
            ) : <span className={styles.chipMain}>{filter.label}</span>}
            <button
              type="button"
              className={styles.chipRemove}
              onClick={() => onRemove(filter)}
              aria-label={`Bỏ ${filter.label}`}
            >
              <CloseOutlined />
            </button>
          </div>
        )
      })}
      <button type="button" className={styles.clear} onClick={onClear}>
        {mode === 'search' ? 'Xóa tìm kiếm' : 'Xóa tất cả'}
      </button>
    </div>
  )
}
