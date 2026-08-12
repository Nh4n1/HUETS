import {
  BookOutlined,
  EnvironmentOutlined,
  StarFilled,
} from '@ant-design/icons'
import {
  Button,
  Card,
  Empty,
  Input,
  Select,
  Tabs,
  Typography,
} from 'antd'
import { useMemo, useState } from 'react'
import { Link } from 'react-router'
import { useBookmarks } from '../context/useBookmarks'
import styles from './SavedContentPage.module.css'

const { Title, Text } = Typography

export function SavedContentPage() {
  const { bookmarks, removeBookmark } = useBookmarks()

  const [activeTab, setActiveTab] =
    useState('location')

  const [query, setQuery] =
    useState('')

  const [filter, setFilter] =
    useState('')

  const locationBookmarks = useMemo(
    () =>
      bookmarks.filter(
        (bookmark) =>
          bookmark.targetType === 'location',
      ),
    [bookmarks],
  )

  const itineraryBookmarks = useMemo(
    () =>
      bookmarks.filter(
        (bookmark) =>
          bookmark.targetType === 'itinerary',
      ),
    [bookmarks],
  )

  const categoryOptions = useMemo(() => {
    const categories = new Map()

    locationBookmarks.forEach((bookmark) => {
      const category =
        bookmark.snapshot?.category

      if (!category) {
        return
      }

      const value =
        category.code
        ?? category.id
        ?? category.name

      const label =
        category.name
        ?? category.code
        ?? 'Khác'

      if (value) {
        categories.set(value, label)
      }
    })

    return [
      {
        value: '',
        label: 'Tất cả danh mục',
      },
      ...Array.from(
        categories.entries(),
      ).map(([value, label]) => ({
        value,
        label,
      })),
    ]
  }, [locationBookmarks])

  const filteredLocations = useMemo(() => {
    const normalizedQuery =
      query.trim().toLowerCase()

    return locationBookmarks.filter(
      (bookmark) => {
        const snapshot =
          bookmark.snapshot ?? {}

        const name =
          snapshot.name ?? ''

        const address =
          snapshot.formattedAddress ?? ''

        const category =
          snapshot.category

        const categoryValue =
          category?.code
          ?? category?.id
          ?? category?.name
          ?? ''

        const matchesQuery =
          !normalizedQuery
          || name
            .toLowerCase()
            .includes(normalizedQuery)
          || address
            .toLowerCase()
            .includes(normalizedQuery)

        const matchesFilter =
          !filter
          || categoryValue === filter

        return (
          matchesQuery
          && matchesFilter
        )
      },
    )
  }, [
    locationBookmarks,
    query,
    filter,
  ])

  const filteredItineraries =
    useMemo(() => {
      const normalizedQuery =
        query.trim().toLowerCase()

      return itineraryBookmarks.filter(
        (bookmark) => {
          const snapshot =
            bookmark.snapshot ?? {}

          const title =
            snapshot.title ?? ''

          const owner =
            snapshot.owner?.displayName
            ?? ''

          return (
            !normalizedQuery
            || title
              .toLowerCase()
              .includes(normalizedQuery)
            || owner
              .toLowerCase()
              .includes(normalizedQuery)
          )
        },
      )
    }, [
      itineraryBookmarks,
      query,
    ])

  function handleTabChange(key) {
    setActiveTab(key)
    setQuery('')
    setFilter('')
  }

  return (
    <main className={styles.page}>
      <section className={styles.hero}>
        <div className={styles.heroInner}>
          <span className={styles.eyebrow}>
            Nội dung cá nhân
          </span>

          <Title className={styles.title}>
            Nội dung đã lưu
          </Title>

          <Text className={styles.lead}>
            Xem và quản lý những địa điểm,
            lịch trình bạn đã bookmark.
          </Text>
        </div>
      </section>

      <section className={styles.content}>
        <Card
          className={styles.panel}
          variant="borderless"
        >
          <Tabs
            activeKey={activeTab}
            onChange={handleTabChange}
            items={[
              {
                key: 'location',
                label: `Địa điểm (${locationBookmarks.length})`,
              },
              {
                key: 'itinerary',
                label: `Lịch trình (${itineraryBookmarks.length})`,
              },
            ]}
          />

          <div className={styles.toolbar}>
            <Input.Search
              allowClear
              value={query}
              placeholder={
                activeTab === 'location'
                  ? 'Tìm theo tên địa điểm...'
                  : 'Tìm theo tiêu đề hoặc tác giả...'
              }
              onChange={(event) =>
                setQuery(
                  event.target.value,
                )
              }
            />

            {activeTab ===
            'location' ? (
              <Select
                value={filter}
                options={categoryOptions}
                onChange={setFilter}
              />
            ) : null}
          </div>

          {activeTab === 'location' ? (
            <LocationBookmarks
              bookmarks={
                filteredLocations
              }
              onRemove={
                removeBookmark
              }
            />
          ) : (
            <ItineraryBookmarks
              bookmarks={
                filteredItineraries
              }
              onRemove={
                removeBookmark
              }
            />
          )}
        </Card>
      </section>
    </main>
  )
}

function LocationBookmarks({
  bookmarks,
  onRemove,
}) {
  if (!bookmarks.length) {
    return (
      <Empty
        className={styles.empty}
        image={
          Empty.PRESENTED_IMAGE_SIMPLE
        }
        description="Chưa có địa điểm đã lưu."
      />
    )
  }

  return (
    <div className={styles.grid}>
      {bookmarks.map((bookmark) => {
        const snapshot =
          bookmark.snapshot ?? {}

        const categoryName =
          snapshot.category?.name
          ?? snapshot.category?.code
          ?? 'Địa điểm'

        return (
          <Card
            key={`${bookmark.targetType}:${bookmark.targetId}`}
            className={styles.savedCard}
            variant="borderless"
          >
            <div
              className={
                styles.imagePlaceholder
              }
            >
              <EnvironmentOutlined />
            </div>

            <div className={styles.cardBody}>
              <span
                className={
                  styles.category
                }
              >
                {categoryName}
              </span>

              <Title
                level={4}
                className={
                  styles.cardTitle
                }
              >
                {snapshot.name}
              </Title>

              <div className={styles.rating}>
                <StarFilled />

                <span>
                  {snapshot.averageRating
                    ?? 0}
                </span>

                <span>
                  (
                  {snapshot.reviewCount
                    ?? 0}
                  )
                </span>
              </div>

              <p className={styles.address}>
                <EnvironmentOutlined />

                <span>
                  {
                    snapshot.formattedAddress
                  }
                </span>
              </p>
            </div>

            <div
              className={
                styles.cardActions
              }
            >
              <Link
                to={`/locations/${bookmark.targetId}`}
              >
                <Button type="primary">
                  Xem
                </Button>
              </Link>

              <Button
                danger
                onClick={() =>
                  onRemove(
                    'location',
                    bookmark.targetId,
                  )
                }
              >
                Bỏ lưu
              </Button>
            </div>
          </Card>
        )
      })}
    </div>
  )
}

function ItineraryBookmarks({
  bookmarks,
  onRemove,
}) {
  if (!bookmarks.length) {
    return (
      <Empty
        className={styles.empty}
        image={
          Empty.PRESENTED_IMAGE_SIMPLE
        }
        description="Chưa có lịch trình đã lưu."
      />
    )
  }

  return (
    <div className={styles.grid}>
      {bookmarks.map((bookmark) => {
        const snapshot =
          bookmark.snapshot ?? {}

        return (
          <Card
            key={`${bookmark.targetType}:${bookmark.targetId}`}
            className={styles.savedCard}
            variant="borderless"
          >
            <div
              className={
                styles.itineraryCover
              }
            >
              <BookOutlined />
            </div>

            <div className={styles.cardBody}>
              <span
                className={
                  styles.category
                }
              >
                Lịch trình
              </span>

              <Title
                level={4}
                className={
                  styles.cardTitle
                }
              >
                {snapshot.title}
              </Title>

              <p className={styles.owner}>
                Tác giả:{' '}
                {snapshot.owner
                  ?.displayName
                  ?? 'Thành viên HueTrip'}
              </p>

              <div className={styles.facts}>
                <div>
                  <strong>
                    {snapshot.dayCount
                      ?? 0}
                  </strong>

                  <small>Ngày</small>
                </div>

                <div>
                  <strong>
                    {snapshot.itemCount
                      ?? 0}
                  </strong>

                  <small>
                    Địa điểm
                  </small>
                </div>
              </div>
            </div>

            <div
              className={
                styles.cardActions
              }
            >
              <Link
                to={`/itineraries/${bookmark.targetId}`}
              >
                <Button type="primary">
                  Xem
                </Button>
              </Link>

              <Button disabled>
                Sao chép
              </Button>

              <Button
                danger
                onClick={() =>
                  onRemove(
                    'itinerary',
                    bookmark.targetId,
                  )
                }
              >
                Bỏ lưu
              </Button>
            </div>
          </Card>
        )
      })}
    </div>
  )
}