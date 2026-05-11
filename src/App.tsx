import React from 'react'
import { Routes, Route } from 'react-router-dom'
import { Header } from '@/components/layout/Header'
import HomePage from '@/pages/HomePage'
import ConventionPage from '@/pages/ConventionPage'
import ConventionDetailPage from '@/pages/ConventionDetailPage'
import CosPage from '@/pages/CosPage'
import CosCommentsPage from '@/pages/CosCommentsPage'
import ServicePage from '@/pages/ServicePage'
import TradingPage from '@/pages/TradingPage'
import PostDetailPage from '@/pages/PostDetailPage'
import AuthPage from '@/pages/AuthPage'
import ProfilePage from '@/pages/ProfilePage'
import AuditPage from '@/pages/AuditPage'

export default function App() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/convention" element={<ConventionPage />} />
          <Route path="/convention/:id" element={<ConventionDetailPage />} />
          <Route path="/cos" element={<CosPage />} />
          <Route path="/cos/:id" element={<PostDetailPage />} />
          <Route path="/cos/comments" element={<CosCommentsPage />} />
          <Route path="/service" element={<ServicePage />} />
          <Route path="/service/:id" element={<PostDetailPage />} />
          <Route path="/trading" element={<TradingPage />} />
          <Route path="/trading/:id" element={<PostDetailPage />} />
          <Route path="/post/:id" element={<PostDetailPage />} />
          <Route path="/auth" element={<AuthPage />} />
          <Route path="/profile/:username" element={<ProfilePage />} />
          <Route path="/audit" element={<AuditPage />} />
        </Routes>
      </main>
    </div>
  )
}
