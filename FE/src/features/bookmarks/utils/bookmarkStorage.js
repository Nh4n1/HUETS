const STORAGE_PREFIX = 'huetrip:bookmarks'

function getUserStorageKey(user) {
  const userKey =
    user?.id
    ?? user?._id
    ?? user?.email

  if (!userKey) {
    return null
  }

  return `${STORAGE_PREFIX}:${userKey}`
}

export function readBookmarks(user) {
  const storageKey = getUserStorageKey(user)

  if (!storageKey) {
    return []
  }

  try {
    const raw = localStorage.getItem(storageKey)

    if (!raw) {
      return []
    }

    const parsed = JSON.parse(raw)

    return Array.isArray(parsed)
      ? parsed
      : []
  } catch {
    return []
  }
}

export function writeBookmarks(user, bookmarks) {
  const storageKey = getUserStorageKey(user)

  if (!storageKey) {
    return
  }

  localStorage.setItem(
    storageKey,
    JSON.stringify(bookmarks),
  )
}