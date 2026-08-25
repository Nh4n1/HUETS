import { EnvironmentOutlined, FilterOutlined } from '@ant-design/icons'
import { Alert, Button, Empty, Pagination, Select, Skeleton } from 'antd'
import { LocationResultCard } from './LocationResultCard'
import styles from './LocationResults.module.css'

export function LocationResults({ query, locations, meta, page, pageSize, loading, errorMessage,
  activeFilterCount, hasCriteria, sortBy, criteriaAdjusted, searchMode, onSortChange, onOpenFilters, onRetry, onResetCriteria, onPageChange }) {
  return (
    <section className={styles.results} aria-labelledby="location-results-heading">
      <div className={styles.heading}>
        <div><span className={styles.eyebrow}>{query || criteriaAdjusted ? 'Kết quả tìm kiếm' : 'Danh mục địa điểm'}</span>
          <h2 id="location-results-heading">
            {criteriaAdjusted
              ? activeFilterCount > 0 ? 'Kết quả theo bộ lọc' : 'Kết quả đã điều chỉnh'
              : query ? `Kết quả cho “${query}”` : 'Tất cả địa điểm tại Huế'}
          </h2>
          {!loading && !errorMessage ? <p>{meta.total} địa điểm phù hợp</p> : null}</div>
        <div className={styles.actions}>
          <Select aria-label="Sắp xếp" value={sortBy} onChange={onSortChange} options={searchMode ? [
            { value: 'relevance', label: 'Phù hợp nhất' }, { value: 'rating_desc', label: 'Đánh giá cao' },
          ] : [
            { value: 'recommended', label: 'Đề xuất' }, { value: 'rating_desc', label: 'Đánh giá cao' }, { value: 'newest', label: 'Mới nhất' },
          ]} />
          <Button className={styles.mobileFilterButton} icon={<FilterOutlined />} onClick={onOpenFilters}>
            Bộ lọc{activeFilterCount ? ` (${activeFilterCount})` : ''}</Button>
        </div>
      </div>
      {errorMessage ? <Alert type="error" showIcon message={errorMessage} description="Vui lòng kiểm tra kết nối và thử lại."
        action={<Button size="small" onClick={onRetry}>Thử lại</Button>} /> : null}
      {loading ? <div className={styles.list} aria-label="Đang tải địa điểm" aria-busy="true">
        {Array.from({ length: 4 }, (_, index) => <div className={styles.skeletonCard} key={index}>
          <Skeleton active avatar={{ shape: 'square', size: 128 }} paragraph={{ rows: 3 }} /></div>)}</div> : null}
      {!loading && !errorMessage && locations.length > 0 ? <>
        <div className={styles.list}>{locations.map((location) => <LocationResultCard key={location.id} location={location} />)}</div>
        {meta.total > pageSize ? <Pagination className={styles.pagination} current={page} pageSize={pageSize}
          total={meta.total} showSizeChanger={false} onChange={onPageChange} /> : null}</> : null}
      {!loading && !errorMessage && locations.length === 0 ? <div className={styles.emptyState}>
        <Empty image={<EnvironmentOutlined className={styles.emptyIcon} />} description={<span>
          <strong>Chưa tìm thấy địa điểm phù hợp.</strong> Hãy bỏ bớt tiêu chí bắt buộc hoặc thử từ khóa rộng hơn.</span>}>
          {hasCriteria ? <Button onClick={onResetCriteria}>Xóa tiêu chí tìm kiếm</Button> : null}</Empty></div> : null}
    </section>
  )
}
