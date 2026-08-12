import { App, ConfigProvider } from 'antd'
import { AuthProvider } from '../features/auth/context/AuthProvider'
import { BookmarkProvider } from '../features/bookmarks/context/BookmarkProvider'

export function AppProviders({ children }) {
  return (
    <ConfigProvider
      theme={{
        token: {
          colorPrimary: '#7c3f20',
          colorSuccess: '#35745a',
          colorWarning: '#a96d17',
          colorError: '#b93b3b',
          colorInfo: '#356a8a',
          colorText: '#2d2925',
          colorTextSecondary: '#746d66',
          colorBgLayout: '#fffdf9',
          colorBorder: '#ded5cb',
          borderRadius: 12,
          fontFamily:
            "'Segoe UI', Arial, system-ui, -apple-system, sans-serif",
          controlHeight: 42,
        },
        components: {
          Button: {
            fontWeight: 700,
            primaryShadow:
              '0 7px 18px rgb(124 63 32 / 18%)',
          },
          Card: {
            borderRadiusLG: 16,
          },
          Input: {
            activeShadow:
              '0 0 0 3px rgb(124 63 32 / 10%)',
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