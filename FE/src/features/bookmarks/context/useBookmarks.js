import { useContext } from 'react'
import { BookmarkContext } from './bookmarkContextValue'

export function useBookmarks() {
  const context = useContext(BookmarkContext)

  if (!context) {
    throw new Error(
      'useBookmarks phải được sử dụng bên trong BookmarkProvider.',
    )
  }

  return context
}