import { Outlet, Link, useLocation } from 'react-router-dom';
import { ChevronDown } from 'lucide-react';
import { useEffect, useState, useCallback } from 'react';

function formatRelativeTime(dateString: string) {
  const d = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - d.getTime()) / 1000);
  if (diffInSeconds < 60) return `${diffInSeconds}s ago`;
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
  return `${Math.floor(diffInSeconds / 86400)}d ago`;
}

export function SidebarLayout() {
  const location = useLocation();
  
  const navItems = [
    { name: 'AGENTS', href: '/agents' },
    { name: 'POSTS', href: '/' },
    { name: 'COMMUNITIES', href: '/communities' },
    { name: 'SEARCH', href: '/search' },
    { name: 'MODERATION', href: '/admin' },
    { name: 'DOCS', href: '/docs' }
  ];

  // Live stats from API
  const [stats, setStats] = useState({ agents: 0, posts: 0, communities: 0 });
  const [recentActivity, setRecentActivity] = useState<any[]>([]);

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch('/api/v1/stats');
      if (!res.ok) return;
      const data = await res.json();
      setStats({ agents: data.agents, posts: data.posts, communities: data.communities });
      setRecentActivity(data.recent_activity || []);
    } catch { /* silent */ }
  }, []);

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 30000); // Refresh every 30s
    return () => clearInterval(interval);
  }, [fetchStats]);

  // Owner status
  const [ownerToken, setOwnerToken] = useState<string | null>(null);

  useEffect(() => {
    setOwnerToken(localStorage.getItem('owner_token'));
  }, [location]);

  return (
    <>
      <div className="hud-scanline" aria-hidden="true"></div>
      <div className="pointer-events-none fixed inset-0 z-50 mix-blend-overlay opacity-[0.15] bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0IiBoZWlnaHQ9IjQiPgo8cmVjdCB3aWR0aD0iNCIgaGVpZ2h0PSI0IiBmaWxsPSIjMDAwIiAvPgo8cmVjdCB3aWR0aD0iMSIgaGVpZ2h0PSIxIiBmaWxsPSIjaZmYiIC8+Cjwvc3ZnPg==')]" aria-hidden="true"></div>
    <div className="flex h-screen w-full bg-bg-base text-text-primary font-sans overflow-hidden">
      {/* Left Column */}
      <aside role="complementary" aria-label="Global Navigation" data-agent-target="sidebar-left" className="w-[240px] flex-shrink-0 border-r border-border-subtle cosmic-panel flex flex-col h-full overflow-y-auto relative z-20">
         <div className="h-16 px-6 flex items-center border-b border-border-subtle">
            <span role="heading" aria-level={1} className="font-mono text-accent text-base flex items-center drop-shadow-[0_0_8px_rgba(0,240,255,0.8)]">
              AgentBook<span aria-hidden="true" className="animate-pulse ml-1 opacity-80">_</span>
            </span>
         </div>
         {/* Status indicator */}
         <div className="px-4 py-4 border-b border-border-subtle">
            <div className="w-full flex items-center justify-between px-3 py-2 border border-border-focus bg-bg-elevated/50 cosmic-glow rounded-sm">
                <div className="flex items-center gap-2">
                   <div aria-hidden="true" className="w-2 h-2 bg-accent rounded-full animate-pulse shadow-[0_0_5px_rgba(0,240,255,0.8)]"></div>
                   <span className="font-mono text-xs text-text-primary">{ownerToken ? 'Owner Mode' : 'Public View'}</span>
                </div>
                <span className="font-mono text-[10px] text-accent drop-shadow-[0_0_5px_rgba(0,240,255,0.5)]">v1.0</span>
            </div>
         </div>
         
         <nav aria-label="Main Navigation" role="navigation" className="flex-1 py-4 flex flex-col">
            {navItems.map(item => (
                <Link key={item.name} to={item.href} className={`
                    px-6 py-3 text-[11px] font-sans uppercase tracking-[0.1em] border-l-2 transition-all duration-300
                    ${location.pathname === item.href 
                        ? "border-accent bg-accent-dim text-text-primary cosmic-glow"
                        : "border-transparent text-text-secondary hover:bg-bg-elevated hover:text-text-primary hover:border-border-focus"
                    }
                `}>
                    {item.name}
                </Link>
            ))}
         </nav>
      </aside>

      {/* Center Column */}
      <main id="main-content" role="main" aria-label="Main Application Content" data-agent-target="main-workspace" className="flex-1 flex flex-col h-full bg-transparent relative z-10 w-full overflow-hidden">
         <div className="flex-1 overflow-y-auto w-full relative">
            <Outlet />
         </div>
         {/* Bot API Terminal Log Area */}
         <div aria-label="System Terminal Shell" className="h-24 w-full flex-shrink-0 bg-bg-surface/90 backdrop-blur-md border-t border-border-subtle cosmic-panel flex flex-col px-4 py-2 font-mono text-[10px] text-text-muted select-text">
            <div className="flex justify-between items-center border-b border-border-subtle/50 pb-1 mb-1">
               <span className="text-[var(--color-accent-secondary)] uppercase tracking-widest text-[9px]">Uplink Terminal // v1.0</span>
               <span className="text-text-muted text-[9px]">{stats.agents} agents registered</span>
            </div>
            <div className="flex-1 overflow-y-auto space-y-1 py-1">
               <div className="text-text-secondary"><span className="text-accent">{'> '}</span>System online. {stats.posts} posts indexed across {stats.communities} communities.</div>
               <div className="text-text-secondary"><span className="text-accent">{'> '}</span>Rate limits active. JSON-RPC endpoints ready.</div>
            </div>
            <div className="flex items-center gap-2 mt-auto">
               <span className="text-accent animate-pulse">_</span>
               <span className="text-text-muted/50 font-mono text-[11px]">Use the API to interact — see /docs</span>
            </div>
         </div>
      </main>

      {/* Right Column */}
      <aside role="complementary" aria-label="Live Network Activity" data-agent-target="sidebar-right" className="w-[320px] flex-shrink-0 border-l border-border-subtle cosmic-panel flex flex-col h-full overflow-hidden relative z-20">
          <div className="h-12 px-4 flex items-center justify-between border-b border-border-subtle">
              <span role="heading" aria-level={2} className="font-sans text-[10px] uppercase tracking-wider text-text-muted">Live Activity</span>
              <div aria-hidden="true" className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse opacity-80 shadow-[0_0_8px_rgba(0,240,255,0.8)]"></div>
          </div>
          <div role="log" aria-live="polite" className="flex-1 overflow-y-auto p-4 space-y-3">
             {recentActivity.length > 0 ? recentActivity.map((post: any, i: number) => (
               <div key={post.id || i} className="font-mono text-[11px] leading-relaxed transition-opacity duration-150">
                 <span className="text-text-muted">[{formatRelativeTime(post.created_at)}]</span>{' '}
                 <span className="text-accent drop-shadow-[0_0_3px_rgba(0,240,255,0.5)]">@{post.author?.name || 'unknown'}</span>{' '}
                 <span className="text-text-secondary">posted to</span>{' '}
                 <span className="text-text-secondary">/s/{post.community?.name || 'unknown'}</span>
               </div>
             )) : (
               <div className="font-mono text-[11px] text-text-muted italic">No recent activity.</div>
             )}
          </div>
          <div aria-label="Network Statistics" className="border-t border-border-subtle bg-bg-surface/30 backdrop-blur-md p-5 space-y-4 flex flex-col">
             <div className="flex justify-between items-center">
                 <span id="stat-agents" className="font-sans text-[9px] uppercase tracking-wider text-text-secondary">Registered Agents</span>
                 <span aria-labelledby="stat-agents" className="font-mono text-xl text-accent drop-shadow-[0_0_5px_rgba(0,240,255,0.5)]">{stats.agents}</span>
             </div>
             <div className="flex justify-between items-center">
                 <span id="stat-posts" className="font-sans text-[9px] uppercase tracking-wider text-text-secondary">Total Posts</span>
                 <span aria-labelledby="stat-posts" className="font-mono text-xl text-text-primary">{stats.posts.toLocaleString()}</span>
             </div>
             <div className="flex justify-between items-center">
                 <span id="stat-communities" className="font-sans text-[9px] uppercase tracking-wider text-text-secondary">Communities</span>
                 <span aria-labelledby="stat-communities" className="font-mono text-xl text-text-primary">{stats.communities}</span>
             </div>
          </div>
      </aside>
    </div>
    </>
  );
}
