import { BulbOutlined } from '@ant-design/icons'
import { Tag } from 'antd'
import styles from './SearchInterpretation.module.css'

export function SearchInterpretation({ interpretation, onRemove }) {
  if (!interpretation) return null
  const chips = [
    ...(interpretation.category ? [{ type: 'category', ...interpretation.category, prefix: 'Danh mục' }] : []),
    ...(interpretation.ward ? [{ type: 'ward', ...interpretation.ward, prefix: 'Khu vực' }] : []),
    ...(interpretation.openCondition
      ? [{ type: 'opening', code: 'opening-hours', name: interpretation.openCondition.label, prefix: 'Giờ mở cửa' }]
      : []),
    ...interpretation.requiredTags.map((tag) => ({ type: 'required', ...tag, prefix: 'Bắt buộc' })),
    ...interpretation.preferredTags.map((tag) => ({ type: 'preferred', ...tag, prefix: 'Ưu tiên' })),
  ]
  if (!chips.length) return null

  return (
    <section className={styles.panel} aria-label="Cách hệ thống hiểu yêu cầu">
      <div className={styles.title}><BulbOutlined /> Hệ thống hiểu yêu cầu của bạn là</div>
      <div className={styles.chips}>
        {chips.map((chip) => (
          <Tag key={`${chip.type}-${chip.code}`} closable onClose={(event) => {
            event.preventDefault()
            onRemove(chip.type, chip.code)
          }}>
            <strong>{chip.prefix}:</strong> {chip.name}
          </Tag>
        ))}
      </div>
    </section>
  )
}
