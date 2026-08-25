import { App, ConfigProvider } from 'antd'
import { AuthProvider } from '../features/auth/context/AuthProvider'
import { BookmarkProvider } from '../features/bookmarks/context/BookmarkProvider'

export function AppProviders({ children }) {
  return (
    <ConfigProvider
      theme={{
        token: {
          colorPrimary: '#8b5e34',
          colorSuccess: '#35745a',
          colorWarning: '#a96d17',
          colorError: '#b93b3b',
          colorInfo: '#356a8a',
          colorText: '#27231f',
          colorTextSecondary: '#6f6a62',
          colorBgLayout: '#fbfaf7',
          colorBorder: '#e6dfd4',
          borderRadius: 12,
          fontFamily:
            "Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
          controlHeight: 42,
        },
        components: {
          Button: {
            fontWeight: 700,
            primaryShadow:
              '0 7px 18px rgb(139 94 52 / 18%)',
          },
          Card: {
            borderRadiusLG: 16,
          },
          Input: {
            activeShadow:
              '0 0 0 3px rgb(139 94 52 / 10%)',
          },
        },
      }}
    >
      <App>
        <AuthProvider>
          <BookmarkProvider>
            {children}
          </BookmarkProvider>
        </AuthProvider>
      </App>
    </ConfigProvider>
  )
}
