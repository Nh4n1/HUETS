import { ArrowRightOutlined } from '@ant-design/icons'
import { Link } from 'react-router'
import { CategoryIcon } from '../../../shared/config/categoryPresentation'
import styles from '../../../pages/HomePage.module.css'

export function DiscoverSection({ categories, onCategorySelect }) {
  return (
    <section className={styles.discoverSection} id="discover">
      <div className={styles.sectionHeading}>
        <div>
          <span className={styles.sectionEyebrow}>Đi nhanh</span>
          <h2>Khám phá nhanh</h2>
          <p>5 chủ đề đầu theo thứ tự hiển thị của hệ thống. Chọn một chủ đề để đi thẳng tới danh sách địa điểm.</p>
        </div>
        <Link className={styles.categorySectionLink} to="/explore#categories">
          Khám phá tất cả chủ đề <ArrowRightOutlined />
        </Link>
      </div>
      <div className={styles.categoryList} aria-label="Khám phá địa điểm theo chủ đề">
        {categories.map((category) => (
          <button type="button" key={category.code} onClick={() => onCategorySelect(category.code)}>
            <CategoryIcon code={category.code} />
            <span>{category.name}</span>
          </button>
        ))}
        <Link className={styles.moreCategories} to="/explore#categories">
          Xem thêm <ArrowRightOutlined />
        </Link>
      </div>
    </section>
  )
}
