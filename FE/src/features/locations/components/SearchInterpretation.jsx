import { BulbOutlined } from '@ant-design/icons'
import styles from './SearchInterpretation.module.css'

export function SearchInterpretation({ interpretation }) {
  if (!interpretation) return null
  return (
    <section className={styles.panel} aria-label="Cách hệ thống hiểu yêu cầu">
      <div className={styles.title}><BulbOutlined /> HueTrip đã áp dụng tiêu chí từ yêu cầu của bạn.</div>
    </section>
  )
}
