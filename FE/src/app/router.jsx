// app/router.jsx
import { createBrowserRouter } from 'react-router'
import { ProtectedRoute } from '../features/auth/components/ProtectedRoute'
import { LoginPage } from '../features/auth/pages/LoginPage'
import { ProfilePage } from '../features/auth/pages/ProfilePage'
import { RegisterPage } from '../features/auth/pages/RegisterPage'

import { SavedContentPage } from '../features/bookmarks/pages/SavedContentPage'

import { AdminRoute } from '../features/admin/components/AdminRoute'
import { AdminCreateLocationPage } from '../features/admin/pages/location/AdminCreateLocationPage'
import { AdminLocationDetailPage } from '../features/admin/pages/location/AdminLocationDetailPage'
import { AdminEditLocationPage } from '../features/admin/pages/location/AdminEditLocationPage'
import { AdminLocationModerationPage } from '../features/admin/pages/location/AdminLocationModerationPage'
import { AdminLocationsPage } from '../features/admin/pages/location/AdminLocationsPage'
import { AdminItinerariesPage } from '../features/admin/pages/itinerary/AdminItinerariesPage'
import { AdminOverviewPage } from '../features/admin/pages/overview/AdminOverviewPage'
import { AdminUsersPage } from '../features/admin/pages/user/AdminUsersPage'
import { AdminReviewsPage } from '../features/admin/pages/review/AdminReviewsPage'

import { HomePage } from '../pages/HomePage'

import { LocationDetailPage } from '../features/locations/pages/LocationDetailPage'
import { LocationsPage } from '../features/locations/pages/LocationsPage'
import { ContributeLocationPage } from '../features/locations/pages/ContributeLocationPage'
import { MyContributionsPage } from '../features/locations/pages/MyContributionsPage'

import { ItinerariesPage } from '../features/itineraries/pages/ItinerariesPage'
import { ItineraryDetailPage } from '../features/itineraries/pages/ItineraryDetailPage'
import { ItineraryEditorPage } from '../features/itineraries/pages/ItineraryEditorPage'
import { CommunityItinerariesPage } from '../features/itineraries/pages/CommunityItinerariesPage'
import { CommunityItineraryDetailPage } from '../features/itineraries/pages/ItineraryDetailPage'

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
        path: 'locations',
        Component: LocationsPage,
      },

      {
        path: 'locations/:locationId',
        Component: LocationDetailPage,
      },

      {
        path: 'explore',
        Component: LocationsPage,
      },

      {
        path: 'itineraries',
        Component: CommunityItinerariesPage,
      },

      {
        path: 'itineraries/:itineraryId',
        Component: CommunityItineraryDetailPage,
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

          // FE-02 Bookmark
          {
            path: 'saved',
            Component: SavedContentPage,
          },

          {
            path: 'locations/contribute',
            Component: ContributeLocationPage,
          },

          {
            path: 'locations/mine',
            Component: MyContributionsPage,
          },

          {
            path: 'itineraries/mine',
            Component: ItinerariesPage,
          },

          {
            path: 'itineraries/new',
            Component: ItineraryEditorPage,
          },

          {
            path: 'itineraries/mine/:itineraryId',
            Component: ItineraryDetailPage,
          },

          {
            path: 'itineraries/mine/:itineraryId/edit',
            Component: ItineraryEditorPage,
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

          {
            path: 'locations/:locationId/edit',
            Component: AdminEditLocationPage,
          },

          {
            path: 'itineraries',
            Component: AdminItinerariesPage,
          },

          {
            path: 'users',
            Component: AdminUsersPage,
          },

          {
            path: 'reviews',
            Component: AdminReviewsPage,
          },
        ],
      },
    ],
  },
])
