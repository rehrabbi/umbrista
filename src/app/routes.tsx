import { lazy, Suspense } from 'react'
import { Route, Routes } from 'react-router'
import { Landing } from '../pages/Landing'

// Every page except the landing page is its own chunk, fetched when the visitor first goes there.
// The landing page ships with the first bundle; its 3D canvas (three and R3F) is a separate lazy chunk.
const Menu = lazy(() => import('../pages/Menu'))
const Brew = lazy(() => import('../pages/Brew'))
const Story = lazy(() => import('../pages/Story'))
const Visit = lazy(() => import('../pages/Visit'))
const Journal = lazy(() => import('../pages/Journal'))
const JournalPost = lazy(() => import('../pages/JournalPost'))
const Reserve = lazy(() => import('../pages/Reserve'))
const Order = lazy(() => import('../pages/Order'))
const Join = lazy(() => import('../pages/Join'))
const Privacy = lazy(() => import('../pages/Privacy'))
const Staff = lazy(() => import('../pages/Staff'))
const NotFound = lazy(() => import('../pages/NotFound'))

function LoadingLine() {
  return (
    <p role="status" className="route-loading">
      Lighting the lamps.
    </p>
  )
}

export function AppRoutes() {
  return (
    <Suspense fallback={<LoadingLine />}>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/menu" element={<Menu />} />
        <Route path="/brew" element={<Brew />} />
        <Route path="/story" element={<Story />} />
        <Route path="/visit" element={<Visit />} />
        <Route path="/journal" element={<Journal />} />
        <Route path="/journal/:slug" element={<JournalPost />} />
        <Route path="/reserve" element={<Reserve />} />
        <Route path="/order" element={<Order />} />
        <Route path="/join" element={<Join />} />
        <Route path="/privacy" element={<Privacy />} />
        <Route path="/staff" element={<Staff />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  )
}
