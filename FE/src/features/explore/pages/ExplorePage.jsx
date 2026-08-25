import { ArrowDownOutlined, ArrowRightOutlined, CompassOutlined, SearchOutlined } from '@ant-design/icons'
import { Alert, Button, Empty, Input, Modal, Skeleton } from 'antd'
import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router'
import { getCategoriesApi } from '../../../shared/api/referenceApi'
import { CategoryIcon } from '../../../shared/config/categoryPresentation'
import { getActiveCategories } from '../../../shared/config/categoryUtils'
import { getPublicLocationsApi } from '../../locations/api/locationApi'
import { LocationDiscoveryCard } from '../../locations/components/LocationDiscoveryCard'
import styles from './ExplorePage.module.css'

function LocationCollection({ id, eyebrow, title, description, showAllTo, locations, loading, error }) {
  return (
    <section className={styles.collection} id={id}>
      <div className={styles.sectionHeading}>
        <div><span>{eyebrow}</span><h2>{title}</h2></div>
        <p>{description}</p>
        <Link className={styles.sectionLink} to={showAllTo}>Xem tất cả <ArrowRightOutlined /></Link>
      </div>
      {error ? <Alert type="warning" showIcon title={error} /> : null}
      {loading ? (
        <div className={styles.locationGrid}>{[0, 1, 2, 3].map((item) => <Skeleton.Node key={item} active className={styles.cardSkeleton} />)}</div>
      ) : null}
      {!loading && !error && locations.length ? (
        <div className={styles.locationGrid}>{locations.map((location) => <LocationDiscoveryCard key={location.id} location={location} />)}</div>
      ) : null}
      {!loading && !error && !locations.length ? <Empty description="Chưa có địa điểm để giới thiệu trong bộ sưu tập này." /> : null}
    </section>
  )
}

export function ExplorePage() {
  const navigate = useNavigate()
  const routerLocation = useLocation()
  const [categories, setCategories] = useState([])
  const [highRated, setHighRated] = useState([])
  const [newest, setNewest] = useState([])
  const [loading, setLoading] = useState(true)
  const [errors, setErrors] = useState({})
  const [modalOpen, setModalOpen] = useState(false)
  const [categoryQuery, setCategoryQuery] = useState('')

  useEffect(() => {
    let active = true
    Promise.allSettled([
      getCategoriesApi(),
      getPublicLocationsApi({ page: 1, pageSize: 6, sortBy: 'rating_desc' }),
      getPublicLocationsApi({ page: 1, pageSize: 6, sortBy: 'newest' }),
    ]).then(([categoryResult, ratingResult, newestResult]) => {
      if (!active) return
      if (categoryResult.status === 'fulfilled') setCategories(getActiveCategories(categoryResult.value))
      if (ratingResult.status === 'fulfilled') setHighRated(ratingResult.value.data ?? [])
      if (newestResult.status === 'fulfilled') setNewest(newestResult.value.data ?? [])
      setErrors({
        categories: categoryResult.status === 'rejected' ? 'Không thể tải danh sách chủ đề.' : '',
        rating: ratingResult.status === 'rejected' ? 'Không thể tải các địa điểm được đánh giá cao.' : '',
        newest: newestResult.status === 'rejected' ? 'Không thể tải các địa điểm mới.' : '',
      })
      setLoading(false)
    })
    return () => { active = false }
  }, [])

  useEffect(() => {
    if (routerLocation.hash !== '#categories') return
    window.requestAnimationFrame(() => {
      document.getElementById('categories')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    })
  }, [routerLocation.hash])

  const filteredCategories = useMemo(() => {
    const normalize = (value) => value.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLocaleLowerCase('vi').trim()
    const normalized = normalize(categoryQuery)
    return normalized ? categories.filter((category) => normalize(category.name).includes(normalized)) : categories
  }, [categories, categoryQuery])

  const openCategory = (code) => {
    setModalOpen(false)
    navigate(`/locations?categoryCode=${encodeURIComponent(code)}`)
  }

  return (
    <main className={styles.page}>
      <header className={styles.hero}>
        <span className={styles.eyebrow}>Discovery</span>
        <h1>Khám phá Huế</h1>
        <p>Tìm cảm hứng từ các chủ đề đặc trưng, những địa điểm được cộng đồng đánh giá cao và các nơi vừa xuất hiện trên HueTrip.</p>
        <div className={styles.heroActions}>
          <a href="#categories">Khám phá theo chủ đề <ArrowDownOutlined /></a>
          <Link to="/locations">Đã biết mình muốn tìm gì? Tìm trong tất cả địa điểm <ArrowRightOutlined /></Link>
        </div>
      </header>

      <section className={styles.categories} id="categories">
        <div className={styles.sectionHeading}>
          <div><span>Chủ đề</span><h2>Khám phá theo sở thích</h2></div>
          <p>Một số chủ đề được ưu tiên theo thứ tự hiển thị. Danh sách đầy đủ được mở riêng để trang luôn gọn.</p>
        </div>
        {errors.categories ? <Alert type="warning" showIcon title={errors.categories} /> : null}
        {loading ? <div className={styles.categoryGrid}>{Array.from({ length: 8 }, (_, item) => <Skeleton.Node active key={item} />)}</div> : null}
        {!loading ? (
          <div className={styles.categoryGrid}>
            {categories.slice(0, 8).map((category) => (
              <button type="button" key={category.code} onClick={() => openCategory(category.code)}>
                <CategoryIcon code={category.code} />
                <span><strong>{category.name}</strong>{category.description ? <small>{category.description}</small> : null}</span>
                <ArrowRightOutlined />
              </button>
            ))}
          </div>
        ) : null}
        {!loading && categories.length > 0 ? (
          <Button className={styles.allCategoriesButton} onClick={() => setModalOpen(true)}>Xem tất cả chủ đề</Button>
        ) : null}
      </section>

      <LocationCollection id="high-rated" eyebrow="Cộng đồng yêu thích" title="Được đánh giá cao"
        description="Những địa điểm có điểm đánh giá tốt từ cộng đồng HueTrip." showAllTo="/locations?sortBy=rating_desc"
        locations={highRated} loading={loading} error={errors.rating} />
      <LocationCollection id="newest" eyebrow="Vừa được chia sẻ" title="Mới trên HueTrip"
        description="Các địa điểm công khai gần đây nhất trong danh mục." showAllTo="/locations?sortBy=newest"
        locations={newest} loading={loading} error={errors.newest} />

      <section className={styles.catalogCta}>
        <CompassOutlined /><div><h2>Sẵn sàng thu hẹp lựa chọn?</h2><p>Tìm kiếm, lọc và sắp xếp trong toàn bộ danh mục địa điểm.</p></div>
        <Link to="/locations">Xem tất cả địa điểm <ArrowRightOutlined /></Link>
      </section>

      <Modal title="Tất cả chủ đề" open={modalOpen} onCancel={() => setModalOpen(false)} footer={null} width={720}
        afterClose={() => setCategoryQuery('')}>
        <Input className={styles.modalSearch} value={categoryQuery} onChange={(event) => setCategoryQuery(event.target.value)}
          prefix={<SearchOutlined />} allowClear placeholder="Tìm theo tên chủ đề" aria-label="Tìm chủ đề" />
        <div className={styles.modalCategoryList}>
          {filteredCategories.map((category) => (
            <button type="button" key={category.code} onClick={() => openCategory(category.code)}>
              <CategoryIcon code={category.code} /><span>{category.name}</span><ArrowRightOutlined />
            </button>
          ))}
          {!filteredCategories.length ? <Empty description="Không tìm thấy chủ đề phù hợp." /> : null}
        </div>
      </Modal>
    </main>
  )
}
