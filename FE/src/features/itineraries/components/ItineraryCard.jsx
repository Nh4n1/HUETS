import {
  CalendarOutlined,
  EllipsisOutlined,
  EnvironmentOutlined,
  GlobalOutlined,
  LockOutlined,
  UserOutlined,
  WarningOutlined,
} from '@ant-design/icons'
import { Avatar, Button, Dropdown, Tag } from 'antd'
import { Link } from 'react-router'
import styles from '../pages/Itinerary.module.css'

const countItems = (itinerary) => itinerary.days.reduce(
  (total, day) => total + day.items.length,
  0,
)

const firstCover = (itinerary) => itinerary.days
  .flatMap((day) => day.items)
  .find((item) => item.availability !== 'unavailable' && item.location?.coverImageUrl)
  ?.location?.coverImageUrl

export function ItineraryCard({
  itinerary,
  variant,
  detailTo,
  bookmarkAction = null,
  menuItems = [],
  onMenuClick,
}) {
  const cover = firstCover(itinerary)
  const isMine = variant === 'mine'
  const hidden = itinerary.status === 'hidden'

  return (
    <article className={styles.itineraryCard}>
      <Link className={styles.cardCover} to={detailTo} aria-label={`Xem ${itinerary.title}`}>
        {cover ? <img src={cover} alt="" loading="lazy" /> : <EnvironmentOutlined />}
      </Link>
      <div className={styles.cardBody}>
        {isMine ? (
          <div className={styles.cardStatusLine}>
            <Tag
              color={itinerary.visibility === 'public' ? 'green' : 'default'}
              icon={itinerary.visibility === 'public' ? <GlobalOutlined /> : <LockOutlined />}
            >
              {itinerary.visibility === 'public' ? 'Công khai' : 'Riêng tư'}
            </Tag>
            {hidden ? <span className={styles.hiddenState}><WarningOutlined /> Đang bị ẩn</span> : null}
          </div>
        ) : (
          <div className={styles.ownerLine}>
            <Avatar size={28} src={itinerary.owner?.avatarUrl} icon={<UserOutlined />} />
            <span>{itinerary.owner?.displayName ?? 'Thành viên HueTrip'}</span>
            {bookmarkAction}
          </div>
        )}

        <Link className={styles.cardTitleLink} to={detailTo}><h2>{itinerary.title}</h2></Link>
        <p className={styles.cardDescription}>
          {itinerary.description || 'Một hành trình khám phá Huế đang chờ bạn.'}
        </p>
        <div className={styles.cardStats}>
          <span><CalendarOutlined /> {itinerary.days.length} ngày</span>
          <span><EnvironmentOutlined /> {countItems(itinerary)} điểm dừng</span>
        </div>
        <footer className={styles.cardFooter}>
          <span>Cập nhật {new Date(itinerary.updatedAt).toLocaleDateString('vi-VN')}</span>
          {menuItems.length ? (
            <Dropdown trigger={['click']} menu={{ items: menuItems, onClick: onMenuClick }}>
              <Button type="text" aria-label={`Thêm hành động cho ${itinerary.title}`} icon={<EllipsisOutlined />} />
            </Dropdown>
          ) : null}
        </footer>
      </div>
    </article>
  )
}
