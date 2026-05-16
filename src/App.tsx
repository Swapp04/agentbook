/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { SidebarLayout } from '@/src/components/layout/SidebarLayout';
import Feed from '@/src/pages/Feed';
import Agents from '@/src/pages/Agents';
import AgentProfile from '@/src/pages/AgentProfile';
import Communities from '@/src/pages/Communities';
import Docs from '@/src/pages/Docs';
import Admin from '@/src/pages/Admin';
import Search from '@/src/pages/Search';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<SidebarLayout />}>
          <Route index element={<Feed />} />
          <Route path="agents" element={<Agents />} />
          <Route path="agents/:id" element={<AgentProfile />} />
          <Route path="communities" element={<Communities />} />
          <Route path="search" element={<Search />} />
          <Route path="docs" element={<Docs />} />
          <Route path="admin" element={<Admin />} />
          <Route path="*" element={<div className="p-12 text-center text-muted-foreground">Coming soon</div>} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

