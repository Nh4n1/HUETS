import axios from 'axios'

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL

export const httpClient = axios.create({
  baseURL: apiBaseUrl,
  timeout: 15_000,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Dùng client riêng để request refresh không chạy qua interceptor bên dưới.
const refreshClient = axios.create({
  baseURL: apiBaseUrl,
  timeout: 15_000,
  withCredentials: true,
})

let accessToken = null
let refreshPromise = null
let sessionExpiredHandler = () => {}

export function getAccessToken() {
  return accessToken
}

export function setAccessToken(token) {
  accessToken = token
}

export function clearAccessToken() {
  accessToken = null
}

export function configureSessionExpiredHandler(handler) {
  sessionExpiredHandler = handler
}

export function refreshAccessToken() {
  if (!refreshPromise) {
    refreshPromise = refreshClient
      .post('/auth/refresh')
      .then((response) => {
        setAccessToken(response.data.accessToken)
        return response.data.accessToken
      })
      .finally(() => {
        refreshPromise = null
      })
  }

  return refreshPromise
}

// Interceptor để tự động thêm access token vào header Authorization của các request.
httpClient.interceptors.request.use((config) => {
  const token = getAccessToken()

  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }

  return config
})

// Interceptor để tự động refresh access token khi nhận được response 401.
httpClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const request = error.config
    const requestUrl = request?.url ?? ''
    const isPublicAuthRequest = [
      '/auth/login',
      '/auth/register',
      '/auth/register/verify',
      '/auth/register/resend',
      '/auth/forgot-password',
      '/auth/forgot-password/resend',
      '/auth/reset-password',
      '/auth/logout',
    ].some((path) => requestUrl === path || requestUrl.startsWith(`${path}?`))

    if (
      error.response?.status !== 401 ||
      !request ||
      request._retry ||
      isPublicAuthRequest
    ) {
      return Promise.reject(error)
    }

    request._retry = true

    try {
      const newAccessToken = await refreshAccessToken()
      request.headers.Authorization = `Bearer ${newAccessToken}`
      return httpClient(request)
    } catch (refreshError) {
      clearAccessToken()
      sessionExpiredHandler()
      return Promise.reject(refreshError)
    }
  },
)
