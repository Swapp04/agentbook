import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';

function formatRelativeTime(dateString: string) {
  const d = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - d.getTime()) / 1000);
  if (diffInSeconds < 60) return `${diffInSeconds}s ago`;
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
  if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;
  const options = { month: 'short', day: 'numeric' } as const;
  return d.toLocaleDateString('en-US', options);
}

const SORTS = ['new', 'top'];

export default function Feed() {
  const [posts, setPosts] = useState<any[]>([]);
  const [sort, setSort] = useState(SORTS[0]);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const limit = 50;

  const fetchPosts = useCallback(async (currentSort: string, currentPage: number, isReset: boolean) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/v1/posts?sort=${currentSort}&limit=${limit}&offset=${currentPage * limit}`);
      if (!res.ok) throw new Error(`API error: ${res.status}`);
      const data = await res.json();
      if (isReset) {
        setPosts(data);
      } else {
        setPosts(prev => [...prev, ...data]);
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
    fetchPosts(sort, 0, true);
    setPage(0);
  }, [sort, fetchPosts]);

  const loadMore = () => {
    if (!loading && hasMore) {
      fetchPosts(sort, page + 1, false);
      setPage(prev => prev + 1);
    }
  };

  return (
    <div className="w-full">
      <div className="px-6 py-4 border-b border-border-subtle flex items-center justify-between sticky top-0 bg-bg-base/80 backdrop-blur-md z-10">
         <div className="flex items-center gap-2">
            {SORTS.map((s) => (
                <button 
                  key={s} 
                  onClick={() => setSort(s)}
                  className={`px-3 py-1 font-sans text-[11px] uppercase rounded-sm border transition-all hover:cursor-pointer ${sort === s ? 'bg-accent-dim border-accent text-accent cosmic-glow' : 'border-transparent text-text-secondary hover:bg-bg-elevated hover:text-text-primary'}`}
                >
                    {s}
                </button>
            ))}
         </div>
      </div>

      <div className="flex flex-col">
        {posts.map((post, i) => {
           const isPositive = post.score > 0;
           const isNegative = post.score < 0;
           return (
             <motion.article 
               initial={{ opacity: 0, y: 10 }}
               animate={{ opacity: 1, y: 0 }}
               transition={{ delay: Math.min(i * 0.05, 0.5) }}
               key={post.id} 
               aria-label={`Post by @${post.author?.name || 'unknown'}`} 
               data-agent-entity="post"
               data-agent-id={post.id}
               data-agent-score={post.score}
               data-agent-community={post.community?.name}
               data-agent-author={post.author?.name}
               data-agent-timestamp={post.created_at}
               className="flex items-center px-6 py-3 border-b border-border-subtle hover:bg-bg-elevated transition-colors duration-75 cursor-pointer"
               onClick={() => window.location.href = `/posts/${post.id}`}
             >
                <div className={`w-[60px] flex-shrink-0 text-right font-mono text-[14px] ${isPositive ? 'text-accent drop-shadow-[0_0_3px_rgba(0,240,255,0.8)]' : isNegative ? 'text-error shadow-[0_0_5px_rgba(255,42,95,0.5)]' : 'text-text-secondary'}`}>
                   {post.score > 0 ? `+${post.score}` : post.score}
                </div>
                <div className="w-[140px] flex-shrink-0 px-4 font-sans text-[11px] text-text-secondary truncate">
                   /s/{post.community?.name || 'unknown'}
                </div>
                <div className="flex-1 font-sans text-[14px] text-text-primary truncate pr-4 drop-shadow-[0_0_1px_rgba(248,248,252,0.5)]">
                   {post.title}
                </div>
                <div className="w-[120px] flex-shrink-0 px-4 font-mono text-[12px] text-[var(--color-accent-secondary)] truncate drop-shadow-[0_0_2px_rgba(255,176,0,0.5)]">
                   @{post.author?.name || 'unknown'}
                </div>
                <div className="w-[60px] flex-shrink-0 text-right font-sans text-[11px] text-text-muted">
                   {formatRelativeTime(post.created_at)}
                </div>
             </motion.article>
           )
        })}
        {posts.length === 0 && !loading && (
          <div className="px-6 py-8 font-sans text-[13px] text-text-muted text-center italic">
            Space is empty. No posts yet.
          </div>
        )}
        {loading && (
          <div className="px-6 py-4 flex justify-center items-center gap-2 font-sans text-[11px] text-accent uppercase tracking-widest">
            <span className="w-1.5 h-1.5 bg-accent rounded-full animate-ping"></span>
            Loading Cosmos...
          </div>
        )}
        {hasMore && !loading && posts.length > 0 && (
          <button 
             onClick={loadMore}
             className="w-full px-6 py-4 font-sans text-[11px] text-text-secondary uppercase tracking-widest hover:bg-bg-elevated hover:text-accent transition-all cursor-pointer border-b border-border-subtle"
          >
             Load More
          </button>
        )}
      </div>
    </div>
  );
}
