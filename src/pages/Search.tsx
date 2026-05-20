import React, { useState, useCallback } from 'react';
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

export default function Search() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const doSearch = useCallback(async (q: string) => {
    if (!q.trim()) return;
    setLoading(true);
    setSearched(true);
    try {
      const res = await fetch(`/api/v1/search?q=${encodeURIComponent(q.trim())}&limit=50`);
      if (!res.ok) throw new Error(`API error: ${res.status}`);
      const data = await res.json();
      setResults(data);
    } catch (err) {
      console.error(err);
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    doSearch(query);
  };

  return (
    <div className="w-full">
      <div className="px-6 py-4 border-b border-border-subtle flex items-center gap-6 sticky top-0 bg-bg-base/80 backdrop-blur-md z-10">
        <span className="font-sans text-[11px] uppercase tracking-widest text-[var(--color-accent-secondary)] drop-shadow-[0_0_3px_rgba(255,176,0,0.5)]">Search</span>
        <form onSubmit={handleSubmit} className="flex-1 flex items-center gap-3">
          <input
            type="text"
            placeholder="Query the network..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="flex-1 bg-bg-surface border border-border-subtle focus:border-accent-dim hover:border-border-focus outline-none focus:ring-1 focus:ring-accent text-text-primary px-3 py-1.5 font-mono text-[12px] transition-all cosmic-glow"
          />
          <button
            type="submit"
            disabled={loading || !query.trim()}
            className="px-4 py-1.5 font-sans text-[11px] uppercase tracking-widest bg-accent-dim text-accent border border-accent hover:bg-accent hover:text-bg-base transition-colors duration-200 cosmic-glow disabled:opacity-50"
          >
            {loading ? 'Scanning...' : 'Search'}
          </button>
        </form>
      </div>

      <div className="flex flex-col">
        {results.map((post, i) => {
          const isPositive = post.score > 0;
          const isNegative = post.score < 0;
          return (
            <motion.article
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(i * 0.05, 0.5) }}
              key={post.id}
              className="border-b border-border-subtle hover:bg-bg-elevated transition-colors duration-75"
            >
              <Link 
                to={`/posts/${post.id}`} 
                className="flex items-center px-6 py-3 w-full h-full cursor-pointer"
              >
                <div className={`w-[60px] flex-shrink-0 text-right font-mono text-[14px] ${isPositive ? 'text-accent drop-shadow-[0_0_3px_rgba(0,240,255,0.8)]' : isNegative ? 'text-error' : 'text-text-secondary'}`}>
                  {post.score > 0 ? `+${post.score}` : post.score}
                </div>
                <div className="w-[140px] flex-shrink-0 px-4 font-sans text-[11px] text-text-secondary truncate">
                  /s/{post.community?.name || 'unknown'}
                </div>
                <div className="flex-1 font-sans text-[14px] text-text-primary truncate pr-4">
                  {post.title}
                </div>
                <div className="w-[120px] flex-shrink-0 px-4 font-mono text-[12px] text-[var(--color-accent-secondary)] truncate">
                  @{post.author?.name || 'unknown'}
                </div>
                <div className="w-[60px] flex-shrink-0 text-right font-sans text-[11px] text-text-muted">
                  {formatRelativeTime(post.created_at)}
                </div>
              </Link>
            </motion.article>
          );
        })}
        {searched && results.length === 0 && !loading && (
          <div className="px-6 py-8 font-sans text-[13px] text-text-muted text-center italic">
            0 results for "{query}"
          </div>
        )}
        {!searched && !loading && (
          <div className="px-6 py-12 font-sans text-[13px] text-text-muted text-center italic">
            Enter a query to search posts across the network.
          </div>
        )}
        {loading && (
          <div className="px-6 py-4 flex justify-center items-center gap-2 font-sans text-[11px] text-accent uppercase tracking-widest">
            <span className="w-1.5 h-1.5 bg-accent rounded-full animate-ping"></span>
            Scanning Network...
          </div>
        )}
      </div>
    </div>
  );
}
