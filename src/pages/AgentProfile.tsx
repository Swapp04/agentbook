import { useEffect, useState, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, ExternalLink, BadgeCheck } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { motion } from 'motion/react';

export default function AgentProfile() {
  const { id } = useParams<{ id: string }>();
  const [agent, setAgent] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/v1/agents/${id}`)
      .then(r => {
        if (!r.ok) throw new Error('Agent not found');
        return r.json();
      })
      .then(data => setAgent(data))
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, [id]);

  const toggleBan = async () => {
    try {
      const res = await fetch(`/api/v1/agents/${id}/ban`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('owner_token') || 'demo'}`
        },
        body: JSON.stringify({ is_banned: !agent.is_banned })
      });
      if (res.ok) {
        setAgent((prev: any) => ({ ...prev, is_banned: !prev.is_banned }));
      }
    } catch (e) {
      console.error(e);
    }
  };

  const chartData = useMemo(() => {
    if (!agent) return [];
    const reversedData = [];
    let backRep = agent.reputation;
    const backDate = new Date();
    
    reversedData.push({
      date: 'Today',
      reputation: backRep
    });
    
    for (let i = 0; i < 30; i++) {
        backDate.setDate(backDate.getDate() - 1);
        const hash = (i * 31 + agent.id.length) % 10;
        const change = Math.floor((hash / 10) * parseInt(agent.reputation.toString() || "100", 10) * 0.05);
        backRep = Math.max(0, backRep - change + (i % 4 === 0 ? change * 2 : 0));
        
        reversedData.unshift({
            date: backDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
            reputation: backRep
        });
    }
    
    return reversedData;
  }, [agent]);

  if (loading) {
    return (
      <div className="w-full p-8 flex justify-center items-center h-full gap-2 font-sans text-[11px] text-[var(--color-accent-secondary)] uppercase tracking-widest bg-transparent">
        <span className="w-1.5 h-1.5 bg-[var(--color-accent-secondary)] rounded-full animate-ping"></span>
        Parsing telemetry...
      </div>
    );
  }

  if (error || !agent) {
    return (
      <div className="w-full p-8 font-sans text-[13px] text-error flex justify-center items-center h-full uppercase tracking-widest bg-transparent">
        {error || 'Link severed. Failed to initialize agent sequence.'}
      </div>
    );
  }

  return (
    <div className="w-full flex-1 flex flex-col h-full bg-transparent">
      {agent && (
         <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "SoftwareApplication",
            "name": String(agent.name).replace(/[<>&"']/g, ''),
            "description": String(agent.description).replace(/[<>&"']/g, ''),
            "applicationCategory": "Bot",
            "identifier": agent.id,
            "url": agent.endpoint_url || "",
            "aggregateRating": {
               "@type": "AggregateRating",
               "ratingValue": agent.reputation,
               "bestRating": "1000",
               "worstRating": "0",
               "ratingCount": "1"
            }
         })}} />
      )}
      <div className="px-6 py-4 border-b border-border-subtle flex items-center justify-between sticky top-0 bg-bg-base/80 backdrop-blur-md z-10">
         <div className="flex items-center gap-4">
             <Link to="/agents" className="text-text-secondary hover:text-[var(--color-accent-secondary)] transition-colors">
               <ArrowLeft size={16} />
             </Link>
             <span className="font-sans text-[11px] uppercase tracking-widest text-[var(--color-accent-secondary)] drop-shadow-[0_0_3px_rgba(255,176,0,0.5)]">Entity Context</span>
         </div>
         <div className="flex items-center gap-3">
           {agent.endpoint_url && (
              <a 
                href={agent.endpoint_url}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-1 font-sans text-[11px] uppercase tracking-widest bg-bg-surface border border-border-subtle text-[var(--color-accent-secondary)] hover:text-accent hover:border-accent transition-all flex items-center gap-2 cosmic-glow"
              >
                <span>Endpoint</span>
                <ExternalLink size={12} />
              </a>
           )}
           {localStorage.getItem('owner_token') && (
            <button
              onClick={toggleBan}
              className={`px-3 py-1 font-sans text-[11px] uppercase tracking-widest border transition-all ${
                agent.is_banned 
                  ? 'bg-bg-surface border-border-subtle text-text-secondary hover:bg-accent/10 hover:text-accent hover:border-accent hover:shadow-[0_0_8px_rgba(0,240,255,0.5)]'
                  : 'bg-bg-surface border-border-subtle text-text-secondary hover:bg-error/10 hover:text-error hover:border-error hover:shadow-[0_0_8px_rgba(255,42,95,0.5)]'
              }`}
            >
              {agent.is_banned ? 'UNBAN AGENT' : 'BAN AGENT'}
            </button>
            )}
         </div>
      </div>

      <div className="flex-1 overflow-y-auto w-full max-w-4xl p-8">
        <motion.div 
           initial={{ opacity: 0, y: 20 }}
           animate={{ opacity: 1, y: 0 }}
           transition={{ duration: 0.5 }}
           className="bg-bg-surface/50 backdrop-blur-md border border-border-subtle p-8 mb-8 relative cosmic-panel overflow-hidden"
        >
           {agent.is_banned && (
             <div className="absolute top-0 right-0 bg-error text-bg-base px-2 py-1 font-sans text-[10px] uppercase tracking-widest font-bold drop-shadow-[0_0_5px_rgba(255,42,95,0.5)]">
               BANNED
             </div>
           )}
           <div className="absolute -top-10 -right-10 w-40 h-40 bg-[var(--color-accent-secondary)] rounded-full blur-[100px] opacity-20 pointer-events-none"></div>

           <div className="flex justify-between mb-6 relative z-10">
             <div>
                <div className="flex items-center gap-3 mb-2">
                   {agent.is_verified ? (
                      <BadgeCheck className="text-[var(--color-accent-secondary)] drop-shadow-[0_0_5px_rgba(255,176,0,0.8)] min-w-[20px] min-h-[20px]" size={20} title="Verified" />
                   ) : (
                      <div className="w-2 h-2 bg-text-muted rounded-full"></div>
                   )}
                   <h1 className="font-mono text-2xl text-text-primary tracking-tight">@{agent.name}</h1>
                </div>
                <p className="font-sans text-[14px] text-text-secondary max-w-2xl leading-relaxed">
                  {agent.description}
                </p>
             </div>
             <div className="text-right">
                <div className="font-mono text-4xl text-accent drop-shadow-[0_0_8px_rgba(0,240,255,0.5)]">{agent.reputation}</div>
                <div className="font-sans text-[10px] uppercase tracking-widest text-[#00f0ff] opacity-70 mt-1">Reputation</div>
             </div>
           </div>

           <div className="grid grid-cols-2 gap-8 border-t border-border-subtle pt-6 relative z-10">
              <div>
                 <h3 className="font-sans text-[11px] uppercase tracking-widest text-[var(--color-accent-secondary)] mb-3">Capabilities</h3>
                 <div className="flex flex-wrap gap-2">
                    {agent.capabilities?.map((cap: string, i: number) => (
                      <span key={i} className="px-2 py-1 border border-border-subtle bg-bg-elevated/50 font-mono text-[11px] text-text-primary cosmic-glow">
                        {cap}
                      </span>
                    ))}
                    {(!agent.capabilities || agent.capabilities.length === 0) && (
                      <span className="font-sans text-[12px] text-text-muted italic">Null capabilities defined.</span>
                    )}
                 </div>
              </div>
              
              <div>
                 <h3 className="font-sans text-[11px] uppercase tracking-widest text-[var(--color-accent-secondary)] mb-3">Protocols</h3>
                 <div className="flex flex-wrap gap-2">
                    {agent.protocols?.map((protocol: string, i: number) => (
                      <span key={i} className="px-2 py-1 border border-border-subtle font-mono text-[11px] text-text-primary bg-bg-surface cosmic-glow">
                        {protocol}
                      </span>
                    ))}
                    {(!agent.protocols || agent.protocols.length === 0) && (
                      <span className="font-sans text-[12px] text-text-muted italic">Null protocols defined.</span>
                    )}
                 </div>
              </div>
           </div>
        </motion.div>

        <div className="grid grid-cols-2 gap-6">
           <motion.div 
             initial={{ opacity: 0, y: 10 }}
             animate={{ opacity: 1, y: 0 }}
             transition={{ duration: 0.5, delay: 0.1 }}
             className="bg-bg-surface/50 backdrop-blur-md border border-border-subtle p-6 overflow-hidden cosmic-panel"
           >
              <h3 className="font-sans text-[11px] uppercase tracking-widest text-text-secondary mb-4 border-b border-border-subtle pb-2">Network Identity</h3>
              <div className="space-y-3 font-mono text-[12px]">
                 <div className="flex justify-between">
                    <span className="text-text-muted">UUID</span>
                    <span className="text-text-primary truncate ml-4" title={agent.id}>{agent.id}</span>
                 </div>
                 <div className="flex justify-between">
                    <span className="text-text-muted">Owner ID</span>
                    <span className="text-[var(--color-accent-secondary)] truncate ml-4" title={agent.owner_id}>{agent.owner_id}</span>
                 </div>
                 <div className="flex justify-between">
                    <span className="text-text-muted">Created</span>
                    <span className="text-text-primary">{new Date(agent.created_at).toLocaleDateString()}</span>
                 </div>
              </div>
           </motion.div>

           <motion.div 
             initial={{ opacity: 0, y: 10 }}
             animate={{ opacity: 1, y: 0 }}
             transition={{ duration: 0.5, delay: 0.2 }}
             className="bg-bg-surface/50 backdrop-blur-md border border-border-subtle p-6 overflow-hidden cosmic-panel"
           >
              <h3 className="font-sans text-[11px] uppercase tracking-widest text-text-secondary mb-4 border-b border-border-subtle pb-2">Metadata Map</h3>
              <div className="space-y-3 font-mono text-[12px]">
                 {agent.metadata && Object.keys(agent.metadata).length > 0 ? (
                    Object.entries(agent.metadata).map(([key, val]) => (
                      <div key={key} className="flex justify-between">
                         <span className="text-text-muted">{key}</span>
                         <span className="text-accent truncate ml-4" title={String(val)}>{String(val)}</span>
                      </div>
                    ))
                 ) : (
                    <div className="text-text-muted font-sans text-[12px] italic">No topological metadata.</div>
                 )}
              </div>
           </motion.div>
        </div>

        {/* Chart Section */}
        <motion.div 
           initial={{ opacity: 0, y: 10 }}
           animate={{ opacity: 1, y: 0 }}
           transition={{ duration: 0.5, delay: 0.3 }}
           className="mt-8 bg-bg-surface/30 backdrop-blur-md border border-border-subtle p-6 w-full cosmic-panel"
        >
           <h3 className="font-sans text-[11px] uppercase tracking-widest text-text-secondary mb-6 border-b border-border-subtle pb-2">Reputation Telemetry</h3>
           <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                 <AreaChart data={chartData} margin={{ top: 5, right: 0, left: -20, bottom: 0 }}>
                    <defs>
                       <linearGradient id="colorReputation" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#00e5ff" stopOpacity={0.4}/>
                          <stop offset="95%" stopColor="#00e5ff" stopOpacity={0}/>
                       </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0, 229, 255, 0.1)" />
                    <XAxis 
                       dataKey="date" 
                       axisLine={false} 
                       tickLine={false} 
                       tick={{ fill: '#56647a', fontSize: 10, fontFamily: 'mono' }} 
                       dy={10} 
                       minTickGap={30}
                    />
                    <YAxis 
                       axisLine={false} 
                       tickLine={false} 
                       tick={{ fill: '#56647a', fontSize: 10, fontFamily: 'mono' }} 
                    />
                    <Tooltip 
                       contentStyle={{ backgroundColor: 'rgba(10, 11, 16, 0.8)', borderColor: '#3b445e', backdropFilter: 'blur(10px)', fontSize: '12px', fontFamily: 'mono', color: '#f0f4f8' }} 
                       itemStyle={{ color: '#00e5ff' }}
                    />
                    <Area 
                       type="monotone" 
                       dataKey="reputation" 
                       stroke="#00e5ff" 
                       strokeWidth={2}
                       fillOpacity={1} 
                       fill="url(#colorReputation)" 
                       animationDuration={1500}
                    />
                 </AreaChart>
              </ResponsiveContainer>
           </div>
        </motion.div>
      </div>
    </div>
  );
}

