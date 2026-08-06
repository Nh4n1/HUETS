// app/router.jsx
import { createBrowserRouter } from 'react-router'
import { ProtectedRoute } from '../features/auth/components/ProtectedRoute'
import { LoginPage } from '../features/auth/pages/LoginPage'
import { ProfilePage } from '../features/auth/pages/ProfilePage'
import { RegisterPage } from '../features/auth/pages/RegisterPage'
import { AdminRoute } from '../features/admin/components/AdminRoute'
import { AdminCreateLocationPage } from '../features/admin/pages/location/AdminCreateLocationPage'
import { AdminLocationDetailPage } from '../features/admin/pages/location/AdminLocationDetailPage'
import { AdminLocationModerationPage } from '../features/admin/pages/location/AdminLocationModerationPage'
import { AdminLocationsPage } from '../features/admin/pages/location/AdminLocationsPage'
import { AdminOverviewPage } from '../features/admin/pages/overview/AdminOverviewPage'
import { HomePage } from '../pages/HomePage'
import { AdminLayout } from './layouts/AdminLayout'
import { AppLayout } from './layouts/AppLayout'

export const router = createBrowserRouter([
  {
    path: '/',
    Component: AppLayout,
    children: [
      {
        index: true,
        Component: HomePage,
      },
      {
        path: 'login',
        Component: LoginPage,
      },
      {
        path: 'register',
        Component: RegisterPage,
      },
      {
        Component: ProtectedRoute,
        children: [
          {
            path: 'profile',
            Component: ProfilePage,
          },
        ],
      },
    ],
  },
  {
    path: 'admin',
    Component: AdminRoute,
    children: [
      {
        Component: AdminLayout,
        children: [
          {
            index: true,
            Component: AdminOverviewPage,
          },
          {
            path: 'locations',
            Component: AdminLocationsPage,
          },
          {
            path: 'locations/new',
            Component: AdminCreateLocationPage,
          },
          {
            path: 'locations/pending',
            Component: AdminLocationModerationPage,
          },
          {
            path: 'locations/:locationId',
            Component: AdminLocationDetailPage,
          },
        ],
      },
    ],
  },
])
