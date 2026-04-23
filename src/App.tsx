import { Routes, Route } from 'react-router'
import MobileLayout from '@/components/MobileLayout'
import Dashboard from './pages/Dashboard'
import Repos from './pages/Repos'
import Issues from './pages/Issues'
import Alerts from './pages/Alerts'
import Settings from './pages/Settings'
import Login from './pages/Login'
import NotFound from './pages/NotFound'

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route element={<MobileLayout />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/repos" element={<Repos />} />
        <Route path="/issues" element={<Issues />} />
        <Route path="/alerts" element={<Alerts />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  )
}
