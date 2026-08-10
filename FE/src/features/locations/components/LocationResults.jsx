import { EnvironmentOutlined, FilterOutlined } from '@ant-design/icons'
import { Alert, Button, Empty, Pagination, Skeleton } from 'antd'
import { LocationResultCard } from './LocationResultCard'
import styles from './LocationResults.module.css'

export function LocationResults({
  query,
  locations,
  meta,
  page,
  pageSize,
  loading,
  errorMessage,
  activeFilterCount,
  hasCriteria,
  onOpenFilters,
  onRetry,
  onResetCriteria,
  onPageChange,
}) {
  return (
    <section className={styles.results} aria-labelledby="location-results-heading">
      <div className={styles.heading}>
        <div>
          <span className={styles.eyebrow}>Kết quả khám phá</span>
          <h2 id="location-results-heading">
            {query ? `Kết quả cho “${query}”` : 'Địa điểm dành cho bạn'}
          </h2>
          {!loading && !errorMessage ? <p>{meta.total} địa điểm phù hợp</p> : null}
        </div>

        <Button
          className={styles.mobileFilterButton}
          icon={<FilterOutlined />}
          onClick={onOpenFilters}
        >
          Bộ lọc{activeFilterCount ? ` (${activeFilterCount})` : ''}
        </Button>
      </div>

      {errorMessage ? (
        <Alert
          type="error"
          showIcon
          message={errorMessage}
          description="Vui lòng kiểm tra kết nối và thử lại."
          action={<Button size="small" onClick={onRetry}>Thử lại</Button>}
        />
      ) : null}

      {loading ? (
        <div className={styles.list} aria-label="Đang tải địa điểm" aria-busy="true">
          {Array.from({ length: 4 }, (_, index) => (
            <div className={styles.skeletonCard} key={index}>
              <Skeleton active avatar={{ shape: 'square', size: 128 }} paragraph={{ rows: 3 }} />
            </div>
          ))}
        </div>
      ) : null}

      {!loading && !errorMessage && locations.length > 0 ? (
        <>
          <div className={styles.list}>
            {locations.map((location) => (
              <LocationResultCard key={location.id} location={location} />
            ))}
          </div>

          {meta.total > pageSize ? (
            <Pagination
              className={styles.pagination}
              current={page}
              pageSize={pageSize}
              total={meta.total}
              showSizeChanger={false}
              onChange={onPageChange}
            />
          ) : null}
        </>
      ) : null}

      {!loading && !errorMessage && locations.length === 0 ? (
        <div className={styles.emptyState}>
          <Empty
            image={<EnvironmentOutlined className={styles.emptyIcon} />}
            description={(
              <span>
                <strong>Chưa tìm thấy địa điểm phù hợp.</strong>
                Hãy thử từ khóa rộng hơn hoặc bỏ bớt tiêu chí lọc.
              </span>
            )}
          >
            {hasCriteria ? <Button onClick={onResetCriteria}>Xóa tiêu chí tìm kiếm</Button> : null}
          </Empty>
        </div>
      ) : null}
    </section>
  )
}
