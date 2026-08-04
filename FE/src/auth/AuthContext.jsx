import { useEffect, useReducer } from 'react'
import { getMeApi, loginApi, logoutApi } from '../api/authApi'
import {
  clearAccessToken,
  configureSessionExpiredHandler,
  refreshAccessToken,
} from '../api/httpClient'
import { AuthContext } from './authContextValue'
import { authReducer, initialAuthState } from './authReducer'

// React StrictMode chạy effect hai lần ở môi trường development.
// Promise dùng chung giúp việc khôi phục phiên chỉ gọi API một lần.
let restoreSessionPromise = null

function restoreSession() {
  if (!restoreSessionPromise) {
    restoreSessionPromise = refreshAccessToken().then(getMeApi)
  }

  return restoreSessionPromise
}

export function AuthProvider({ children }) {
  const [state, dispatch] = useReducer(authReducer, initialAuthState)

  async function login(credentials) {
    dispatch({ type: 'LOGIN_START' })

    try {
      const loggedInUser = await loginApi(credentials)
      dispatch({ type: 'LOGIN_SUCCESS', payload: loggedInUser })
    } catch (error) {
      dispatch({
        type: 'LOGIN_FAILURE',
        payload:
          error.response?.data?.message ?? 'Đăng nhập không thành công.',
      })
    }
  }

  async function logout() {
    try {
      await logoutApi()
    } finally {
      dispatch({ type: 'LOGOUT' })
    }
  }

  function clearError() {
    dispatch({ type: 'CLEAR_ERROR' })
  }

  useEffect(() => {
    configureSessionExpiredHandler(() => dispatch({ type: 'LOGOUT' }))
    return () => configureSessionExpiredHandler(() => {})
  }, [])

  useEffect(() => {
    let active = true

    restoreSession()
      .then((currentUser) => {
        if (active) {
          dispatch({ type: 'RESTORE_SESSION', payload: currentUser })
        }
      })
      .catch(() => {
        clearAccessToken()
        if (active) {
          dispatch({ type: 'RESTORE_SESSION', payload: null })
        }
      })

    return () => {
      active = false
    }
  }, [])

  return (
    <AuthContext.Provider
      value={{
        ...state,
        isAuthenticated: Boolean(state.user),
        login,
        logout,
        clearError,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}
