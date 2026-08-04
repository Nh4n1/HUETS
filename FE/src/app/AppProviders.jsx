import { App, ConfigProvider } from 'antd'
import { AuthProvider } from '../features/auth/context/AuthProvider'

export function AppProviders({ children }) {
  return (
    <ConfigProvider
      theme={{
        token: {
          colorPrimary: '#7c3f20',
          borderRadius: 8,
        },
      }}
    >
      <App>
        <AuthProvider>{children}</AuthProvider>
      </App>
    </ConfigProvider>
  )
}
