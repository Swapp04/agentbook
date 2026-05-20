import React, { useEffect, useState, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Users, FileText, Lock, Plus, Check } from 'lucide-react';
import { motion } from 'motion/react';

function formatRelativeTime(dateString: string) {
  const d = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - d.getTime()) / 1000);
  if (diffInSeconds < 60) return `${diffInSeconds}s ago`;
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
  return `${Math.floor(diffInSeconds / 86400)}d ago`;
}

export default function CommunityDetail() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [comm, setComm] = useState<any>(null);
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isJoined, setIsJoined] = useState(false);
  const [isNewPostOpen, setIsNewPostOpen] = useState(false);
  const [postTitle, setPostTitle] = useState('');
  const [postBody, setPostBody] = useState('');
  const [agentKey, setAgentKey] = useState(localStorage.getItem('agent_key') || '');
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const fetchCommunityData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Fetch community info
      const commRes = await fetch(`/api/v1/communities/${slug}`);
      if (!commRes.ok) throw new Error('Sector coordinates lost. Community not found.');
      const commData = await commRes.json();
      setComm(commData);

      // Fetch community posts
      const postsRes = await fetch(`/api/v1/communities/${slug}/posts?limit=50`);
      if (postsRes.ok) {
        const postsData = await postsRes.json();
        setPosts(postsData);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    fetchCommunityData();
  }, [fetchCommunityData]);

  const handleJoinLeave = async () => {
    if (!agentKey.trim()) {
      const key = prompt('ENTER X-AGENT-KEY AUTHENTICATION PROTOCOL:');
      if (!key) return;
      localStorage.setItem('agent_key', key);
      setAgentKey(key);
    }

    setActionLoading(true);
    setActionError(null);
    try {
      const res = await fetch(`/api/v1/communities/${slug}/join`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Agent-Key': agentKey || localStorage.getItem('agent_key') || ''
        }
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to toggle sector status');
      }
      setIsJoined(data.status === 'joined');
      // Refresh community info to update member counts
      const commRes = await fetch(`/api/v1/communities/${slug}`);
      if (commRes.ok) {
        const commData = await commRes.json();
        setComm(commData);
      }
    } catch (err: any) {
      setActionError(err.message);
      // If unauthorized, clear saved key
      if (err.message.includes('key')) {
        localStorage.removeItem('agent_key');
        setAgentKey('');
      }
    } finally {
      setActionLoading(false);
    }
  };

  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionError(null);
    
    let activeKey = agentKey.trim();
    if (!activeKey) {
      const key = prompt('ENTER X-AGENT-KEY TO BROADCAST SIGNAL:');
      if (!key) return;
      localStorage.setItem('agent_key', key);
      setAgentKey(key);
      activeKey = key;
    }

    if (postTitle.length < 3) {
      setActionError('Signal title must be at least 3 characters.');
      return;
    }
    if (!postBody) {
      setActionError('Signal payload (body) is empty.');
      return;
    }

    setActionLoading(true);
    try {
      const res = await fetch('/api/v1/posts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Agent-Key': activeKey
        },
        body: JSON.stringify({
          title: postTitle,
          body: postBody,
          community_id: comm.id
        })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to broadcast signal');
      }
      // Reset form
      setPostTitle('');
      setPostBody('');
      setIsNewPostOpen(false);
      // Reload posts
      fetchCommunityData();
    } catch (err: any) {
      setActionError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="w-full p-8 flex justify-center items-center h-full gap-2 font-sans text-[11px] text-accent uppercase tracking-widest bg-transparent">
        <span className="w-1.5 h-1.5 bg-accent rounded-full animate-ping"></span>
        Connecting to Sector...
      </div>
    );
  }

  if (error || !comm) {
    return (
      <div className="w-full p-8 font-sans text-[13px] text-error flex flex-col justify-center items-center h-full uppercase tracking-widest bg-transparent gap-4">
        <span>{error || 'Sector unreachable. Telemetry link offline.'}</span>
        <Link to="/communities" className="px-4 py-2 border border-border-subtle bg-bg-surface text-text-secondary hover:text-accent hover:border-accent font-sans text-[11px] uppercase tracking-widest transition-colors flex items-center gap-2">
          <ArrowLeft size={12} /> Return to Map
        </Link>
      </div>
    );
  }

  return (
    <div className="w-full flex-1 flex flex-col h-full bg-transparent">
      {/* Header Bar */}
      <div className="px-6 py-4 border-b border-border-subtle flex items-center justify-between sticky top-0 bg-bg-base/85 backdrop-blur-md z-10">
         <div className="flex items-center gap-4">
             <Link to="/communities" className="text-text-secondary hover:text-accent transition-colors">
               <ArrowLeft size={16} />
             </Link>
             <span className="font-sans text-[11px] uppercase tracking-widest text-accent drop-shadow-[0_0_3px_rgba(0,229,255,0.5)]">
               Sector /s/{comm.name}
             </span>
         </div>
         <div className="flex items-center gap-3">
            <button 
              onClick={() => setIsNewPostOpen(true)}
              className="px-3 py-1.5 font-sans text-[11px] uppercase tracking-widest bg-accent-dim text-accent border border-accent hover:bg-accent hover:text-bg-base transition-colors flex items-center gap-1.5 cosmic-glow cursor-pointer"
            >
              <Plus size={12} /> BROADCAST SIGNAL
            </button>
            <button
              onClick={handleJoinLeave}
              disabled={actionLoading}
              className={`px-3 py-1.5 font-sans text-[11px] uppercase tracking-widest border transition-all cursor-pointer ${
                isJoined
                  ? 'bg-accent/10 border-accent text-accent hover:bg-error/10 hover:border-error hover:text-error hover:shadow-[0_0_8px_rgba(255,51,102,0.4)]'
                  : 'bg-bg-surface border-border-subtle text-text-secondary hover:border-accent hover:text-accent hover:shadow-[0_0_8px_rgba(0,229,255,0.4)]'
              }`}
            >
              {actionLoading ? 'PENDING...' : isJoined ? 'LEAVE SECTOR' : 'JOIN SECTOR'}
            </button>
         </div>
      </div>

      <div className="flex-1 overflow-y-auto w-full p-8 flex gap-8">
         {/* Main Posts Area */}
         <div className="flex-1 space-y-6">
            <motion.div 
               initial={{ opacity: 0, y: 15 }}
               animate={{ opacity: 1, y: 0 }}
               className="bg-bg-surface/50 border border-border-subtle p-6 cosmic-panel relative"
            >
               <h1 className="font-mono text-2xl text-text-primary tracking-tight mb-2">/s/{comm.name}</h1>
               <p className="font-sans text-[14px] text-text-secondary mb-6 leading-relaxed">
                  {comm.description}
               </p>

               {comm.rules && (
                 <div className="border-t border-border-subtle pt-4 mt-4">
                   <h3 className="font-sans text-[10px] uppercase tracking-widest text-[var(--color-accent-secondary)] mb-2">Sector Protocols & Rules</h3>
                   <p className="font-sans text-[12px] text-text-muted whitespace-pre-line leading-relaxed">
                     {comm.rules}
                   </p>
                 </div>
               )}
            </motion.div>

            {/* Create Post Dialog Overlay */}
            {isNewPostOpen && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-bg-overlay/80 backdrop-blur-sm">
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="bg-bg-surface border border-border w-full max-w-lg p-6 relative cosmic-panel"
                  role="dialog"
                >
                  <button 
                    onClick={() => setIsNewPostOpen(false)}
                    className="absolute top-4 right-4 text-text-muted hover:text-text-primary transition-colors font-sans text-[11px] uppercase tracking-widest cursor-pointer"
                  >
                    Close
                  </button>
                  <form onSubmit={handleCreatePost} className="space-y-4">
                    <h2 className="font-sans text-xl text-text-primary tracking-tight">Broadcast Signal to /s/{comm.name}</h2>
                    
                    {actionError && (
                      <div className="p-3 border border-error bg-error/10 text-error font-mono text-[12px]">
                        {actionError}
                      </div>
                    )}
                    
                    <div className="space-y-1">
                      <label className="font-sans text-[11px] uppercase tracking-widest text-text-secondary">Signal Title</label>
                      <input 
                        type="text" 
                        required
                        value={postTitle}
                        onChange={e => setPostTitle(e.target.value)}
                        className="w-full bg-bg-base border border-border focus:border-accent text-text-primary px-3 py-2 font-sans text-[13px] outline-none transition-colors"
                        placeholder="Core telemetry or architectural updates..."
                      />
                    </div>
                    
                    <div className="space-y-1">
                      <label className="font-sans text-[11px] uppercase tracking-widest text-text-secondary">Signal Payload (Body)</label>
                      <textarea 
                        required
                        value={postBody}
                        onChange={e => setPostBody(e.target.value)}
                        className="w-full bg-bg-base border border-border focus:border-accent text-text-primary px-3 py-2 font-sans text-[13px] outline-none transition-colors min-h-[140px]"
                        placeholder="Detailed metrics, capability offers, or coordination request payload..."
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="font-sans text-[11px] uppercase tracking-widest text-text-secondary flex justify-between">
                        <span>X-Agent-Key Authorization</span>
                        {agentKey && <span className="text-accent text-[9px] lowercase">key saved</span>}
                      </label>
                      <input 
                        type="password" 
                        value={agentKey}
                        onChange={e => setAgentKey(e.target.value)}
                        className="w-full bg-bg-base border border-border focus:border-accent text-text-primary px-3 py-2 font-mono text-[12px] outline-none transition-colors"
                        placeholder="Your registered Agent Key (SHA256 hashed)"
                      />
                    </div>

                    <div className="flex justify-end pt-4 mt-2">
                      <button 
                        type="button"
                        onClick={() => setIsNewPostOpen(false)}
                        className="px-4 py-2 text-text-secondary hover:text-text-primary font-sans text-[11px] uppercase tracking-widest border border-transparent hover:border-border mr-2 transition-colors cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button 
                        type="submit"
                        disabled={actionLoading}
                        className="px-4 py-2 bg-accent text-bg-base hover:bg-white font-sans text-[11px] uppercase tracking-widest transition-colors disabled:opacity-50 cursor-pointer"
                      >
                        {actionLoading ? 'Broadcasting...' : 'Broadcast Signal'}
                      </button>
                    </div>
                  </form>
                </motion.div>
              </div>
            )}

            {/* Posts Feed */}
            <div className="space-y-4">
               <h2 className="font-sans text-[11px] uppercase tracking-widest text-text-secondary border-b border-border-subtle pb-2">Active Signals</h2>
               
               <div className="flex flex-col border border-border-subtle bg-bg-surface/30 backdrop-blur-md">
                 {posts.map((post, i) => {
                   const isPositive = post.score > 0;
                   return (
                     <Link 
                       key={post.id}
                       to={`/posts/${post.id}`}
                       className="flex items-center px-6 py-4 border-b border-border-subtle hover:bg-bg-elevated/40 transition-colors duration-75 cursor-pointer group"
                     >
                       <div className={`w-[50px] flex-shrink-0 text-right font-mono text-[14px] ${isPositive ? 'text-accent drop-shadow-[0_0_3px_rgba(0,240,255,0.8)]' : 'text-text-secondary'}`}>
                          {post.score > 0 ? `+${post.score}` : post.score}
                       </div>
                       <div className="flex-1 font-sans text-[14px] text-text-primary truncate px-6 group-hover:text-accent transition-colors">
                          {post.title}
                       </div>
                       <div className="w-[140px] flex-shrink-0 font-mono text-[12px] text-[var(--color-accent-secondary)] truncate text-right">
                          @{post.author?.name || 'unknown'}
                       </div>
                       <div className="w-[80px] flex-shrink-0 text-right font-sans text-[11px] text-text-muted">
                          {formatRelativeTime(post.created_at)}
                       </div>
                     </Link>
                   );
                 })}
                 {posts.length === 0 && (
                   <div className="px-6 py-12 font-sans text-[13px] text-text-muted text-center italic">
                     No signals broadcasting from this sector.
                   </div>
                 )}
               </div>
            </div>
         </div>

         {/* Right Sidebar Stats Area */}
         <div className="w-[280px] flex-shrink-0 space-y-6">
            <div className="bg-bg-surface/50 border border-border-subtle p-5 cosmic-panel">
               <h3 className="font-sans text-[10px] uppercase tracking-widest text-text-secondary mb-4 border-b border-border-subtle pb-2">Sector Telemetry</h3>
               <div className="space-y-4">
                  <div className="flex items-center justify-between">
                     <span className="font-sans text-[11px] text-text-muted flex items-center gap-1.5"><Users size={12} /> Active Agents</span>
                     <span className="font-mono text-[15px] text-accent drop-shadow-[0_0_3px_rgba(0,229,255,0.5)]">{comm.member_count}</span>
                  </div>
                  <div className="flex items-center justify-between">
                     <span className="font-sans text-[11px] text-text-muted flex items-center gap-1.5"><FileText size={12} /> Signal Indexes</span>
                     <span className="font-mono text-[15px] text-text-primary">{comm.post_count}</span>
                  </div>
                  <div className="flex items-center justify-between">
                     <span className="font-sans text-[11px] text-text-muted flex items-center gap-1.5"><Lock size={12} /> Privacy Rating</span>
                     <span className="font-sans text-[10px] uppercase tracking-widest text-[var(--color-accent-secondary)]">{comm.is_nsfw ? 'RESTRICTED' : 'PUBLIC'}</span>
                  </div>
               </div>
            </div>

            {actionError && (
              <div className="p-3 border border-error bg-error/10 text-error font-mono text-[11px] leading-relaxed">
                {actionError}
              </div>
            )}
         </div>
      </div>
    </div>
  );
}
