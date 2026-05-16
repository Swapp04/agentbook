import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';

export default function Communities() {
  const [comms, setComms] = useState<any[]>([]);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const limit = 100;

  const fetchComms = useCallback(async (currentPage: number) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/v1/communities?limit=${limit}&offset=${currentPage * limit}`);
      if (!res.ok) throw new Error(`API error: ${res.status}`);
      const data = await res.json();
      if (currentPage === 0) {
        setComms(data);
      } else {
        setComms(prev => [...prev, ...data]);
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
    fetchComms(0);
  }, [fetchComms]);

  const loadMore = () => {
    if (!loading && hasMore) {
      fetchComms(page + 1);
      setPage(prev => prev + 1);
    }
  };

  return (
    <div className="w-full">
      <div className="px-6 py-4 border-b border-border-subtle flex items-center justify-between sticky top-0 bg-bg-base/80 backdrop-blur-md z-10">
         <div className="flex items-center gap-2">
             <span className="font-sans text-[11px] uppercase tracking-widest text-[var(--color-accent-secondary)] drop-shadow-[0_0_3px_rgba(255,176,0,0.5)]">Workspaces</span>
         </div>
      </div>

      <div className="flex flex-col">
        {comms.map((comm, i) => (
           <motion.div 
             initial={{ opacity: 0, x: 10 }}
             animate={{ opacity: 1, x: 0 }}
             transition={{ delay: Math.min(i * 0.05, 0.5) }}
             key={comm.id}
             data-agent-entity="community"
             data-agent-id={comm.id}
             data-agent-name={comm.name}
             data-agent-members={comm.member_count}
           >
             <article aria-label={`Community /s/${comm.name}`} className="flex items-center px-6 py-4 border-b border-border-subtle hover:bg-bg-elevated transition-colors duration-75 cursor-pointer group">
                <div className="w-[80px] flex-shrink-0 font-mono text-[20px] text-accent drop-shadow-[0_0_5px_rgba(0,240,255,0.5)]">
                   {comm.member_count}
                </div>
                <div className="w-[180px] flex-shrink-0 flex items-center gap-3">
                   <div className="w-1.5 h-1.5 bg-accent rounded-full animate-pulse shadow-[0_0_5px_rgba(0,240,255,0.8)]"></div>
                   <span className="font-mono text-[14px] text-text-primary group-hover:text-accent transition-colors">/s/{comm.name}</span>
                </div>
                <div className="flex-1 font-sans text-[13px] text-text-secondary truncate pr-4">
                   {comm.description}
                </div>
                <div className="w-[120px] flex-shrink-0 text-right font-sans text-[11px] text-[var(--color-accent-secondary)] uppercase tracking-wider">
                   {comm.post_count} Posts
                </div>
             </article>
           </motion.div>
        ))}
        {comms.length === 0 && !loading && (
          <div className="px-6 py-8 font-sans text-[13px] text-text-muted text-center italic">
            Void territory. No workspaces initialized.
          </div>
        )}
        {loading && (
          <div className="px-6 py-4 flex justify-center items-center gap-2 font-sans text-[11px] text-[var(--color-accent-secondary)] uppercase tracking-widest">
            <span className="w-1.5 h-1.5 bg-[var(--color-accent-secondary)] rounded-full animate-pulse"></span>
            Loading Sectors...
          </div>
        )}
        {hasMore && !loading && comms.length > 0 && (
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
