import { useState } from 'react'
import { useAuth } from '../../auth/context/useAuth'
import {
  readBookmarks,
  writeBookmarks,
} from '../utils/bookmarkStorage'
import { BookmarkContext } from './bookmarkContextValue'

export function BookmarkProvider({ children }) {
  const { user } = useAuth()

  const userKey =
    user?.id
    ?? user?._id
    ?? user?.email
    ?? 'guest'

  return (
    <BookmarkStore
      key={userKey}
      user={user}
    >
      {children}
    </BookmarkStore>
  )
}

function BookmarkStore({
  user,
  children,
}) {
  const [bookmarks, setBookmarks] =
    useState(() => readBookmarks(user))

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

  function addBookmark(bookmark) {
    setBookmarks((current) => {
      const alreadyExists = current.some(
        (item) =>
          item.targetType === bookmark.targetType
          && item.targetId === bookmark.targetId,
      )

      if (alreadyExists) {
        return current
      }

      const next = [
        ...current,
        {
          ...bookmark,
          savedAt: new Date().toISOString(),
        },
      ]

      writeBookmarks(user, next)

      return next
    })
  }

  function removeBookmark(
    targetType,
    targetId,
  ) {
    setBookmarks((current) => {
      const next = current.filter(
        (bookmark) =>
          !(
            bookmark.targetType === targetType
            && bookmark.targetId === targetId
          ),
      )

      writeBookmarks(user, next)

      return next
    })
  }

  function toggleBookmark(bookmark) {
    setBookmarks((current) => {
      const exists = current.some(
        (item) =>
          item.targetType === bookmark.targetType
          && item.targetId === bookmark.targetId,
      )

      const next = exists
        ? current.filter(
            (item) =>
              !(
                item.targetType === bookmark.targetType
                && item.targetId === bookmark.targetId
              ),
          )
        : [
            ...current,
            {
              ...bookmark,
              savedAt: new Date().toISOString(),
            },
          ]

      writeBookmarks(user, next)

      return next
    })
  }

  return (
    <BookmarkContext.Provider
      value={{
        bookmarks,
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