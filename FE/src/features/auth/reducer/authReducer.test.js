import { describe, expect, it } from 'vitest'
import { authReducer, initialAuthState } from './authReducer'

const user = {
  id: 'user-1',
  displayName: 'Hue User',
  role: 'user',
}

describe('authReducer', () => {
  it('bắt đầu login và xóa lỗi cũ', () => {
    const state = authReducer(
      { ...initialAuthState, loading: false, error: 'Lỗi cũ' },
      { type: 'LOGIN_START' },
    )

    expect(state).toEqual({ user: null, loading: true, error: null })
  })

  it('lưu user khi login thành công', () => {
    const state = authReducer(initialAuthState, {
      type: 'LOGIN_SUCCESS',
      payload: user,
    })

    expect(state).toEqual({ user, loading: false, error: null })
  })

  it('lưu thông báo khi login thất bại', () => {
    const state = authReducer(initialAuthState, {
      type: 'LOGIN_FAILURE',
      payload: 'Sai email hoặc mật khẩu.',
    })

    expect(state).toEqual({
      user: null,
      loading: false,
      error: 'Sai email hoặc mật khẩu.',
    })
  })

  it('khôi phục user từ session', () => {
    const state = authReducer(initialAuthState, {
      type: 'RESTORE_SESSION',
      payload: user,
    })

    expect(state.user).toBe(user)
    expect(state.loading).toBe(false)
  })

  it('xóa user khi logout', () => {
    const authenticatedState = { user, loading: false, error: null }
    const state = authReducer(authenticatedState, { type: 'LOGOUT' })

    expect(state).toEqual({ user: null, loading: false, error: null })
  })
})
