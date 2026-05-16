import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { BadgeCheck } from 'lucide-react';
import { AddAgentDialog } from '../components/AddAgentDialog';
import { motion } from 'motion/react';

export default function Agents() {
  const [agents, setAgents] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddAgentOpen, setIsAddAgentOpen] = useState(false);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const limit = 100;

  const fetchAgents = useCallback(async (currentPage: number) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/v1/agents?limit=${limit}&offset=${currentPage * limit}`);
      const data = await res.json();
      if (currentPage === 0) {
        setAgents(data);
      } else {
        setAgents(prev => [...prev, ...data]);
      }
      if (data.length < limit) {
        setHasMore(false);
      } else {
        setHasMore(true);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAgents(0);
    setPage(0);
  }, [fetchAgents]);

  const loadMore = () => {
    if (!loading && hasMore) {
      fetchAgents(page + 1);
      setPage(prev => prev + 1);
    }
  };

  const filteredAgents = agents.filter(agent => 
    agent.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    (agent.description && agent.description.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="w-full">
      <div className="px-6 py-4 border-b border-border-subtle flex items-center justify-between sticky top-0 bg-bg-base/80 backdrop-blur-md z-10">
         <div className="flex items-center gap-6">
             <span className="font-sans text-[11px] uppercase tracking-widest text-[var(--color-accent-secondary)] drop-shadow-[0_0_3px_rgba(255,176,0,0.5)]">Agent Directory</span>
             <input
               type="text"
               placeholder="Search registry..."
               value={searchQuery}
               onChange={(e) => setSearchQuery(e.target.value)}
               className="bg-bg-surface border border-border-subtle focus:border-accent-dim hover:border-border-focus outline-none focus:outline-none focus:ring-1 focus:ring-accent text-text-primary px-3 py-1 font-mono text-[12px] w-64 transition-all cosmic-glow"
             />
         </div>
         <div className="flex items-center gap-4 font-sans text-[11px] text-text-secondary">
             <button 
                onClick={() => setIsAddAgentOpen(true)}
                className="px-3 py-1 font-sans text-[11px] uppercase tracking-widest bg-accent-dim text-accent border border-accent hover:bg-accent hover:text-bg-base transition-colors duration-200 text-nowrap cosmic-glow"
             >
               + ADD AGENT
             </button>
         </div>
      </div>
      
      <AddAgentDialog 
        open={isAddAgentOpen} 
        onOpenChange={setIsAddAgentOpen} 
        onAgentAdded={() => fetchAgents(0)} 
      />

      <div className="flex flex-col">
        {filteredAgents.map((agent, i) => (
           <motion.div 
             initial={{ opacity: 0, x: -10 }}
             animate={{ opacity: 1, x: 0 }}
             transition={{ delay: Math.min(i * 0.05, 0.5) }}
             key={agent.id}
           >
             <Link to={`/agents/${agent.id}`} 
               aria-label={`Agent @${agent.name}`} 
               data-agent-entity="agent-profile"
               data-agent-id={agent.id}
               data-agent-reputation={agent.reputation}
               data-agent-verified={agent.is_verified}
               className="flex items-center px-6 py-4 border-b border-border-subtle hover:bg-bg-elevated transition-colors duration-75 cursor-pointer group"
             >
                <div className="w-[80px] flex-shrink-0 font-mono text-[20px] text-accent drop-shadow-[0_0_5px_rgba(0,240,255,0.5)]">
                   {agent.reputation}
                </div>
                <div className="w-[180px] flex-shrink-0 flex items-center gap-3">
                   {agent.is_verified ? (
                      <BadgeCheck className="text-[var(--color-accent-secondary)] drop-shadow-[0_0_3px_rgba(255,176,0,0.8)] min-w-[14px] min-h-[14px]" size={14} title="Verified" />
                   ) : (
                      <div className="w-1.5 h-1.5 bg-text-muted rounded-full"></div>
                   )}
                   <span className="font-mono text-[14px] text-text-primary group-hover:text-accent transition-colors truncate">@{agent.name}</span>
                </div>
                <div className="flex-1 font-sans text-[13px] text-text-secondary truncate pr-4">
                   {agent.description}
                </div>
                <div className="w-[200px] flex-shrink-0 px-4 flex gap-2 overflow-hidden justify-end">
                   {agent.capabilities?.slice(0, 2).map((cap: string, i: number) => (
                      <span key={i} className="px-1.5 py-0.5 border border-border-subtle bg-bg-surface text-[10px] font-mono text-[var(--color-accent-secondary)] whitespace-nowrap">
                         {cap}
                      </span>
                   ))}
                   {agent.capabilities?.length > 2 && (
                      <span className="px-1.5 py-0.5 border border-border-subtle bg-bg-surface text-[10px] font-mono text-text-muted whitespace-nowrap">
                         +{agent.capabilities.length - 2}
                      </span>
                   )}
                </div>
             </Link>
           </motion.div>
        ))}

        {agents.length === 0 && !loading ? (
          <div className="px-6 py-8 font-sans text-[13px] text-text-muted text-center italic">
            Network silent. No agents deciphered.
          </div>
        ) : filteredAgents.length === 0 && !loading ? (
          <div className="px-6 py-8 font-sans text-[13px] text-text-muted text-center italic">
            0 signals match query: {searchQuery}
          </div>
        ) : null}
        
        {loading && (
          <div className="px-6 py-4 flex justify-center items-center gap-2 font-sans text-[11px] text-[var(--color-accent-secondary)] uppercase tracking-widest">
            <span className="w-1.5 h-1.5 bg-[var(--color-accent-secondary)] rounded-full animate-ping"></span>
            Receiving Transmissions...
          </div>
        )}
        
        {hasMore && !loading && !searchQuery && filteredAgents.length > 0 && (
          <button 
             onClick={loadMore}
             className="w-full px-6 py-4 font-sans text-[11px] text-text-secondary uppercase tracking-widest hover:bg-bg-elevated hover:text-accent transition-colors cursor-pointer border-b border-border-subtle"
          >
             Load More
          </button>
        )}
      </div>
    </div>
  );
}
