import {
  BookFilled,
  BookOutlined,
} from '@ant-design/icons'
import { Button } from 'antd'
import {
  useLocation,
  useNavigate,
} from 'react-router'
import { useAuth } from '../../auth/context/useAuth'
import { useBookmarks } from '../context/useBookmarks'
import styles from './BookmarkButton.module.css'

export function BookmarkButton({
  bookmark,
  className = '',
  showLabel = false,
}) {
  const navigate = useNavigate()
  const location = useLocation()

  const {
    isAuthenticated,
  } = useAuth()

  const {
    isBookmarked,
    toggleBookmark,
  } = useBookmarks()

  const saved = isBookmarked(
    bookmark.targetType,
    bookmark.targetId,
  )

  function handleClick(event) {
    event.preventDefault()
    event.stopPropagation()

    if (!isAuthenticated) {
      navigate('/login', {
        state: {
          from: location,
        },
      })

      return
    }

    // toggleBookmark tự đồng bộ với BE và tự hiển thị thông báo
    // thành công/thất bại tương ứng với kết quả gọi API thật.
    toggleBookmark(bookmark)
  }

  return (
    <Button
      type={saved ? 'primary' : 'default'}
      shape={showLabel ? 'default' : 'circle'}
      className={`${styles.button} ${className}`}
      icon={
        saved
          ? <BookFilled />
          : <BookOutlined />
      }
      aria-label={
        saved
          ? 'Bỏ lưu'
          : 'Lưu nội dung'
      }
      aria-pressed={saved}
      onClick={handleClick}
    >
      {showLabel
        ? saved
          ? 'Đã lưu'
          : 'Lưu'
        : null}
    </Button>
  )
}