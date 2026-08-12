import {
  BookFilled,
  BookOutlined,
} from '@ant-design/icons'
import {
  App,
  Button,
} from 'antd'
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

  const { message } = App.useApp()

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

    toggleBookmark(bookmark)

    message.success(
      saved
        ? 'Đã bỏ khỏi nội dung đã lưu.'
        : 'Đã lưu vào nội dung của bạn.',
    )
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