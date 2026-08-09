import { beforeEach, describe, expect, it } from 'vitest'
import {
  clearAccessToken,
  getAccessToken,
  setAccessToken,
} from './httpClient'

describe('access token trong memory', () => {
  beforeEach(() => clearAccessToken())

  it('lưu access token sau khi đăng nhập', () => {
    setAccessToken('access-token')
    expect(getAccessToken()).toBe('access-token')
  })

  it('xóa access token khi đăng xuất', () => {
    setAccessToken('access-token')
    clearAccessToken()
    expect(getAccessToken()).toBeNull()
  })
})
