import { lazy, Suspense, useEffect } from 'react'
import { BrowserRouter, Route, Routes, useLocation } from 'react-router-dom'
import { AppStoreProvider } from './store/AppStore'
import { AuthProvider } from './auth/AuthProvider'
import { Header } from './components/Header'
import { Footer } from './components/Footer'
import { CartDrawer } from './components/CartDrawer'
import { Home } from './pages/Home'
import { Shop } from './pages/Shop'
import { ProductDetail } from './pages/ProductDetail'
import { Landing } from './pages/Landing'
import { TossPaymentFail, TossPaymentSuccess } from './pages/TossPaymentResult'

const Account = lazy(() => import('./pages/Account').then(module => ({ default: module.Account })))
const Admin = lazy(() => import('./pages/Admin').then(module => ({ default: module.Admin })))
const AdminGate = lazy(() => import('./components/AdminGate').then(module => ({ default: module.AdminGate })))
const Community = lazy(() => import('./pages/Community').then(module => ({ default: module.Community })))
const Find = lazy(() => import('./pages/Find').then(module => ({ default: module.Find })))
const About = lazy(() => import('./pages/About').then(module => ({ default: module.About })))
const Mending = lazy(() => import('./pages/Mending').then(module => ({ default: module.Mending })))
const Checkout = lazy(() => import('./pages/Checkout').then(module => ({ default: module.Checkout })))
const PrivacyPolicy = lazy(() => import('./pages/LegalPolicy').then(module => ({ default: module.PrivacyPolicy })))
const RefundPolicy = lazy(() => import('./pages/LegalPolicy').then(module => ({ default: module.RefundPolicy })))

function ScrollReset() {
  const { pathname } = useLocation()
  useEffect(() => { window.scrollTo({ top: 0, behavior: 'instant' }) }, [pathname])
  return null
}

function StoreLayout() {
  return <><Header /><Routes><Route path="/home" element={<Home />} /><Route path="/shop" element={<Shop />} /><Route path="/shop/:slug" element={<ProductDetail />} /><Route path="/the-edit" element={<Find />} /><Route path="/find" element={<Find />} /><Route path="/about" element={<About />} /><Route path="/mending" element={<Mending />} /><Route path="/checkout" element={<Checkout />} /><Route path="/checkout/toss/success" element={<TossPaymentSuccess />} /><Route path="/checkout/toss/fail" element={<TossPaymentFail />} /><Route path="/account" element={<Account />} /><Route path="/community" element={<Community />} /><Route path="/privacy-policy" element={<PrivacyPolicy />} /><Route path="/privacy" element={<PrivacyPolicy />} /><Route path="/refund-policy" element={<RefundPolicy />} /><Route path="/returns" element={<RefundPolicy />} /></Routes><Footer /><CartDrawer /></>
}

export default function App() {
  return <BrowserRouter><AuthProvider><AppStoreProvider><ScrollReset /><Suspense fallback={<main className="route-loading">φ</main>}><Routes><Route path="/" element={<Landing />} /><Route path="/admin" element={<AdminGate><Admin /></AdminGate>} /><Route path="/*" element={<StoreLayout />} /></Routes></Suspense></AppStoreProvider></AuthProvider></BrowserRouter>
}
