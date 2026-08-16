import { App } from 'antd'
import { useEffect, useState } from 'react'
import { useAuth } from '../../auth/context/useAuth'
import {
  createBookmarkApi,
  deleteBookmarkApi,
  getMyBookmarksApi,
} from '../api/bookmarkApi'
import {
  readBookmarks,
  writeBookmarks,
} from '../utils/bookmarkStorage'
import { BookmarkContext } from './bookmarkContextValue'

export function BookmarkProvider({ children }) {
  const { user, isAuthenticated } = useAuth()

  const userKey =
    user?.id
    ?? user?._id
    ?? user?.email
    ?? 'guest'

  return (
    <BookmarkStore
      key={userKey}
      user={user}
      isAuthenticated={isAuthenticated}
    >
      {children}
    </BookmarkStore>
  )
}

function BookmarkStore({
  user,
  isAuthenticated,
  children,
}) {
  const { message } = App.useApp()

  const [bookmarks, setBookmarks] =
    useState(() => readBookmarks(user))

  const [syncing, setSyncing] =
    useState(isAuthenticated)

  // Sau khi xác thực xong, kéo danh sách bookmark thật từ BE
  // (nguồn dữ liệu chuẩn), rồi làm giàu lại bằng snapshot đã cache
  // cục bộ (tên, ảnh, địa chỉ...) để hiển thị mà không cần gọi thêm API.
  useEffect(() => {
    if (!isAuthenticated) {
      return undefined
    }

    let active = true

    getMyBookmarksApi()
      .then(({ location, itinerary }) => {
        if (!active) return

        const serverEntries = [...location, ...itinerary]
        const localCache = readBookmarks(user)

        const merged = serverEntries.map((serverItem) => {
          const cached = localCache.find(
            (item) =>
              item.targetType === serverItem.targetType
              && item.targetId === serverItem.targetId,
          )

          return (
            cached
            ?? {
              targetType: serverItem.targetType,
              targetId: serverItem.targetId,
              snapshot: {},
              savedAt: serverItem.createdAt,
            }
          )
        })

        setBookmarks(merged)
        writeBookmarks(user, merged)
      })
      .catch(() => {
        // Không tải được từ BE (mất mạng, server lỗi...): giữ tạm cache cục bộ,
        // các thao tác thêm/bỏ lưu tiếp theo vẫn được đồng bộ bình thường.
      })
      .finally(() => {
        if (active) setSyncing(false)
      })

    return () => {
      active = false
    }
  }, [isAuthenticated, user])

  function isBookmarked(
    targetType,
    targetId,
  ) {
    return bookmarks.some(
      (bookmark) =>
        bookmark.targetType === targetType
        && bookmark.targetId === targetId,
    )
  }

  // Cập nhật lạc quan (optimistic) trên UI trước, gọi API đồng bộ với BE
  // ngay sau đó; nếu BE báo lỗi thì rollback lại trạng thái cũ.
  async function toggleBookmark(bookmark) {
    const alreadySaved = isBookmarked(
      bookmark.targetType,
      bookmark.targetId,
    )

    const previous = bookmarks

    const next = alreadySaved
      ? bookmarks.filter(
          (item) =>
            !(
              item.targetType === bookmark.targetType
              && item.targetId === bookmark.targetId
            ),
        )
      : [
          ...bookmarks,
          {
            ...bookmark,
            savedAt: new Date().toISOString(),
          },
        ]

    setBookmarks(next)
    writeBookmarks(user, next)

    try {
      if (alreadySaved) {
        await deleteBookmarkApi(bookmark)
      } else {
        await createBookmarkApi(bookmark)
      }

      message.success(
        alreadySaved
          ? 'Đã bỏ khỏi nội dung đã lưu.'
          : 'Đã lưu vào nội dung của bạn.',
      )
    } catch (error) {
      setBookmarks(previous)
      writeBookmarks(user, previous)

      message.error(
        error.response?.data?.message
        ?? 'Không thể cập nhật bookmark. Vui lòng thử lại.',
      )
    }
  }

  function addBookmark(bookmark) {
    if (isBookmarked(bookmark.targetType, bookmark.targetId)) {
      return
    }

    toggleBookmark(bookmark)
  }

  function removeBookmark(
    targetType,
    targetId,
  ) {
    if (!isBookmarked(targetType, targetId)) {
      return
    }

    toggleBookmark({ targetType, targetId })
  }

  return (
    <BookmarkContext.Provider
      value={{
        bookmarks,
        syncing,
        isBookmarked,
        addBookmark,
        removeBookmark,
        toggleBookmark,
      }}
    >
      {children}
    </BookmarkContext.Provider>
  )
}