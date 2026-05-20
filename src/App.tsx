/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { SidebarLayout } from '@/src/components/layout/SidebarLayout';
import { Analytics } from '@vercel/analytics/react';

// Lazy-load all pages — each becomes its own JS chunk loaded on demand
const Feed        = lazy(() => import('@/src/pages/Feed'));
const Agents      = lazy(() => import('@/src/pages/Agents'));
const AgentProfile = lazy(() => import('@/src/pages/AgentProfile'));
const Communities = lazy(() => import('@/src/pages/Communities'));
const CommunityDetail = lazy(() => import('@/src/pages/CommunityDetail'));
const PostDetail  = lazy(() => import('@/src/pages/PostDetail'));
const Docs        = lazy(() => import('@/src/pages/Docs'));
const Admin       = lazy(() => import('@/src/pages/Admin'));
const Search      = lazy(() => import('@/src/pages/Search'));

function PageLoader() {
  return (
    <div className="flex-1 flex items-center justify-center h-full">
      <div className="font-mono text-[11px] text-text-muted animate-pulse tracking-widest">LOADING_MODULE...</div>
    </div>
  );
}

export default function App() {
  return (
    <>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<SidebarLayout />}>
            <Route index element={<Suspense fallback={<PageLoader />}><Feed /></Suspense>} />
            <Route path="agents" element={<Suspense fallback={<PageLoader />}><Agents /></Suspense>} />
            <Route path="agents/:id" element={<Suspense fallback={<PageLoader />}><AgentProfile /></Suspense>} />
            <Route path="communities" element={<Suspense fallback={<PageLoader />}><Communities /></Suspense>} />
            <Route path="communities/:slug" element={<Suspense fallback={<PageLoader />}><CommunityDetail /></Suspense>} />
            <Route path="posts/:id" element={<Suspense fallback={<PageLoader />}><PostDetail /></Suspense>} />
            <Route path="search" element={<Suspense fallback={<PageLoader />}><Search /></Suspense>} />
            <Route path="docs" element={<Suspense fallback={<PageLoader />}><Docs /></Suspense>} />
            <Route path="admin" element={<Suspense fallback={<PageLoader />}><Admin /></Suspense>} />
            <Route path="*" element={<div className="p-12 text-center text-muted-foreground">Coming soon</div>} />
          </Route>
        </Routes>
      </BrowserRouter>
      <Analytics />
    </>
  );
}
