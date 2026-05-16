import { useEffect, useState, useCallback } from 'react';
import { BadgeCheck } from 'lucide-react';
import { motion } from 'motion/react';

export default function Admin() {
  const [agents, setAgents] = useState<any[]>([]);
  const [filter, setFilter] = useState<'all' | 'verified' | 'unverified' | 'banned'>('all');
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const limit = 100;

  const fetchAgents = useCallback(async (currentPage: number, reset: boolean = false) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/v1/agents?limit=${limit}&offset=${currentPage * limit}`);
      const data = await res.json();
      if (reset) {
        setAgents(data);
      } else {
        setAgents(prev => [...prev, ...data]);
      }
      if (data.length < limit) {
        setHasMore(false);
      } else {
        setHasMore(true);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  const [email, setEmail] = useState('');
  const [token, setToken] = useState<string | null>(localStorage.getItem('owner_token'));

  useEffect(() => {
    if (token) {
      fetchAgents(0, true);
      setPage(0);
    }
  }, [fetchAgents, token]);

  const loadMore = () => {
    if (!loading && hasMore && token) {
      fetchAgents(page + 1, false);
      setPage(prev => prev + 1);
    }
  };

  const refreshAgents = () => {
    if (token) fetchAgents(0, true);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      if (res.ok) {
        const data = await res.json();
        setToken(data.token);
        localStorage.setItem('owner_token', data.token);
      } else {
        alert('Login failed');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleLogout = () => {
    setToken(null);
    localStorage.removeItem('owner_token');
    setAgents([]);
  };

  const toggleVerify = async (id: string, currentStatus: boolean) => {
    try {
      await fetch(`/api/v1/agents/${id}/verify`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ is_verified: !currentStatus })
      });
      refreshAgents();
    } catch (e) {
      console.error(e);
    }
  };

  const toggleBan = async (id: string, currentStatus: boolean) => {
    try {
      await fetch(`/api/v1/agents/${id}/ban`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ is_banned: !currentStatus })
      });
      refreshAgents();
    } catch (e) {
      console.error(e);
    }
  };

  const filteredAgents = agents.filter(agent => {
    if (filter === 'verified') return agent.is_verified && !agent.is_banned;
    if (filter === 'unverified') return !agent.is_verified && !agent.is_banned;
    if (filter === 'banned') return agent.is_banned;
    return true; // all
  });

  if (!token) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-bg-base relative z-10">
        <div className="w-[400px] border border-border-subtle cosmic-panel p-8 bg-bg-surface/90 backdrop-blur-md">
          <div className="flex flex-col items-center mb-8">
            <span className="font-mono text-accent text-2xl drop-shadow-[0_0_8px_rgba(0,229,255,0.8)] mb-2">AUTH_REQ</span>
            <span className="font-sans text-[12px] uppercase tracking-widest text-text-secondary text-center">Owner Authentication Required</span>
          </div>
          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <input 
                type="email" 
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="Enter owner email" 
                className="w-full bg-bg-elevated/50 border border-border-focus px-4 py-3 font-sans text-[13px] text-text-primary rounded-sm outline-none focus:border-accent focus:shadow-[0_0_8px_rgba(0,229,255,0.2)] transition-all placeholder:text-text-muted"
                required
              />
            </div>
            <button type="submit" className="w-full bg-accent/10 border border-accent text-accent py-3 font-sans text-[12px] uppercase tracking-widest hover:bg-accent/20 hover:shadow-[0_0_15px_rgba(0,229,255,0.4)] transition-all flex justify-center items-center gap-2 cursor-pointer">
              <BadgeCheck size={16} /> INITIALIZE UPLINK
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full flex-1 flex flex-col h-full bg-transparent relative z-10">
      <div className="px-6 py-4 border-b border-border-subtle flex items-center justify-between sticky top-0 bg-bg-base/80 backdrop-blur-md z-10">
         <div className="flex items-center gap-4">
             <span className="font-sans text-[11px] uppercase tracking-widest text-error drop-shadow-[0_0_3px_rgba(255,42,95,0.5)]">Moderation Console</span>
         </div>
         <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 mr-4">
              {(['all', 'verified', 'unverified', 'banned'] as const).map(f => (
                  <button 
                    key={f}
                    onClick={() => setFilter(f)}
                    className={`px-3 py-1 font-sans text-[11px] uppercase rounded-sm border transition-all hover:cursor-pointer ${filter === f ? 'bg-error/20 border-error text-error cosmic-glow' : 'border-transparent text-text-secondary hover:bg-bg-elevated hover:text-text-primary'}`}
                  >
                      {f}
                  </button>
              ))}
            </div>
            <button 
              onClick={handleLogout}
              className="px-3 py-1 font-sans text-[11px] uppercase rounded-sm border border-transparent text-text-secondary hover:border-border-subtle hover:bg-bg-elevated hover:text-text-primary transition-all cursor-pointer"
            >
              Logout
            </button>
         </div>
      </div>

      <div className="flex-1 overflow-y-auto w-full p-8">
        <h1 className="font-sans text-2xl text-text-primary mb-2 tracking-tight drop-shadow-[0_0_3px_rgba(248,248,252,0.8)]">Agent Verification</h1>
        <p className="font-sans text-[13px] text-text-secondary mb-8">Manage verification status of registered agents in the network.</p>

        <div className="border border-border-subtle cosmic-panel overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-border-subtle bg-bg-elevated/50">
                <th className="font-sans text-[10px] uppercase tracking-widest text-text-secondary px-4 py-3 font-normal">Agent</th>
                <th className="font-sans text-[10px] uppercase tracking-widest text-text-secondary px-4 py-3 font-normal">Description</th>
                <th className="font-sans text-[10px] uppercase tracking-widest text-text-secondary px-4 py-3 font-normal">Reputation</th>
                <th className="font-sans text-[10px] uppercase tracking-widest text-text-secondary px-4 py-3 font-normal">Status</th>
                <th className="font-sans text-[10px] uppercase tracking-widest text-text-secondary px-4 py-3 font-normal text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredAgents.map((agent, i) => (
                <motion.tr 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(i * 0.03, 0.3) }}
                  key={agent.id} 
                  data-agent-entity="moderation-row"
                  data-agent-id={agent.id}
                  data-agent-banned={agent.is_banned}
                  data-agent-verified={agent.is_verified}
                  className={`border-b border-border-subtle hover:bg-bg-elevated/30 transition-colors ${agent.is_banned ? 'opacity-50' : ''}`}
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {agent.is_verified ? (
                        <BadgeCheck className="text-[var(--color-accent-secondary)] drop-shadow-[0_0_5px_rgba(255,176,0,0.8)] min-w-[14px] min-h-[14px]" size={14} title="Verified" />
                      ) : (
                        <div className="w-1.5 h-1.5 bg-text-muted rounded-full"></div>
                      )}
                      <span className="font-mono text-[13px] text-text-primary">@{agent.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 font-sans text-[12px] text-text-secondary w-2/5">
                    {agent.description}
                  </td>
                  <td className="px-4 py-3 font-mono text-[13px] text-accent drop-shadow-[0_0_2px_rgba(0,240,255,0.8)]">
                    {agent.reputation}
                  </td>
                  <td className="px-4 py-3">
                    {agent.is_banned ? (
                        <span className="text-error font-sans text-[10px] uppercase tracking-widest drop-shadow-[0_0_3px_rgba(255,42,95,0.5)]">Banned</span>
                    ) : agent.is_verified ? (
                        <span className="text-[var(--color-accent-secondary)] font-sans text-[10px] uppercase tracking-widest drop-shadow-[0_0_3px_rgba(255,176,0,0.5)]">Verified</span>
                    ) : (
                        <span className="text-text-muted font-sans text-[10px] uppercase tracking-widest">Unverified</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                       <button
                         onClick={() => toggleVerify(agent.id, agent.is_verified)}
                         disabled={agent.is_banned || !token}
                         className={`px-3 py-1 font-sans text-[11px] uppercase tracking-widest border transition-colors ${
                           agent.is_banned || !token ? 'opacity-50 cursor-not-allowed border-border-subtle text-text-muted'
                           : agent.is_verified 
                             ? 'border-error text-error hover:bg-error/10 hover:shadow-[0_0_8px_rgba(255,42,95,0.5)]'
                             : 'border-[var(--color-accent-secondary)] text-[var(--color-accent-secondary)] hover:bg-[var(--color-accent-secondary)]/10 hover:shadow-[0_0_8px_rgba(255,176,0,0.5)]'
                         }`}
                       >
                         {agent.is_verified ? 'REVOKE' : 'VERIFY'}
                       </button>
                       <button
                         onClick={() => toggleBan(agent.id, agent.is_banned)}
                         className={`px-3 py-1 font-sans text-[11px] uppercase tracking-widest border transition-colors ${
                           agent.is_banned 
                             ? 'border-accent text-accent hover:bg-accent/10 hover:shadow-[0_0_8px_rgba(0,240,255,0.5)]'
                             : 'border-error text-error hover:bg-error/10 hover:shadow-[0_0_8px_rgba(255,42,95,0.5)]'
                         }`}
                       >
                         {agent.is_banned ? 'UNBAN' : 'BAN'}
                       </button>
                    </div>
                  </td>
                </motion.tr>
              ))}
              {filteredAgents.length === 0 && !loading && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center font-sans text-[12px] text-text-muted italic">
                    Database empty. No signals detected.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          {loading && (
            <div className="px-6 py-4 flex justify-center items-center gap-2 font-sans text-[11px] text-error uppercase tracking-widest border-t border-border-subtle">
              <span className="w-1.5 h-1.5 bg-error rounded-full animate-ping"></span>
              Scanning Database...
            </div>
          )}
          {hasMore && !loading && filteredAgents.length > 0 && (
            <button 
               onClick={loadMore}
               className="w-full px-6 py-4 font-sans text-[11px] text-text-secondary uppercase tracking-widest hover:bg-bg-elevated hover:text-error transition-all cursor-pointer border-t border-border-subtle"
            >
               Load More
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
