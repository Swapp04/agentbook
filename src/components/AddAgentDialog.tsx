import React, { useState } from 'react';

interface AddAgentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAgentAdded: () => void;
}

export function AddAgentDialog({ open, onOpenChange, onAgentAdded }: AddAgentDialogProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [capabilities, setCapabilities] = useState('');
  const [protocols, setProtocols] = useState('');
  const [endpointUrl, setEndpointUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rawKey, setRawKey] = useState<string | null>(null);

  const resetForm = () => {
    setName(''); setDescription(''); setCapabilities(''); setProtocols('');
    setEndpointUrl(''); setError(null); setRawKey(null); setLoading(false);
  };

  const handleClose = () => {
    resetForm();
    onOpenChange(false);
  };

  if (!open) return null;

  const validateTags = (tagsStr: string) => {
    if (!tagsStr.trim()) return true;
    const tags = tagsStr.split(',').map(s => s.trim()).filter(Boolean);
    return tags.every(t => /^[a-zA-Z0-9\-]+$/.test(t));
  };

  const isValidUrl = (urlString: string) => {
    if (!urlString.trim()) return true; // Optional field
    try {
      new URL(urlString);
      return true;
    } catch (e) {
      return false;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (name.length < 3) {
      setError('Name must be at least 3 characters.');
      return;
    }
    if (!description) {
      setError('Description is required.');
      return;
    }
    if (endpointUrl && !isValidUrl(endpointUrl)) {
      setError('Endpoint URL is invalid. Must be a full valid URL (e.g., https://api.example.com).');
      return;
    }
    if (!validateTags(capabilities)) {
      setError('Capabilities must only contain alphanumeric characters and dashes, separated by commas.');
      return;
    }
    if (!validateTags(protocols)) {
      setError('Protocols must only contain alphanumeric characters and dashes, separated by commas.');
      return;
    }
    
    setLoading(true);
    try {
      const capsArray = capabilities.split(',').map(s => s.trim()).filter(Boolean);
      const protosArray = protocols.split(',').map(s => s.trim()).filter(Boolean);

      const res = await fetch('/api/v1/agents', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('owner_token') || 'demo'}`
        },
        body: JSON.stringify({
          name,
          description,
          capabilities: capsArray.length > 0 ? capsArray : ['general'],
          protocols: protosArray.length > 0 ? protosArray : ['rest'],
          endpoint_url: endpointUrl.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error?.message || data.error || 'Failed to add agent');
      }

      setRawKey(data.api_key || 'Token generation failed');
      onAgentAdded();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-bg-overlay/80">
      <div className="bg-bg-surface border border-border w-full max-w-md p-6 relative" role="dialog" aria-modal="true">
        <button 
          onClick={handleClose}
          className="absolute top-4 right-4 text-text-muted hover:text-text-primary transition-colors font-sans text-[11px] uppercase tracking-widest"
          aria-label="Close"
        >
          Close
        </button>
        
        {rawKey ? (
          <div className="space-y-4">
            <h2 className="font-sans text-xl text-text-primary tracking-tight">Agent Registered</h2>
            <div className="p-4 bg-bg-elevated border border-border">
              <p className="font-sans text-[13px] text-text-secondary mb-2">
                Save this API key. It will not be shown again.
              </p>
              <pre className="font-mono text-[14px] text-accent mt-2 p-2 bg-bg-base border border-border-focus overflow-x-auto">
                {rawKey}
              </pre>
            </div>
            <div className="flex justify-end mt-6">
               <button                  onClick={handleClose}
                 className="px-4 py-2 bg-text-secondary text-bg-base hover:bg-text-primary font-sans text-[11px] uppercase tracking-widest transition-colors duration-75"
               >
                 Done
               </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <h2 className="font-sans text-xl text-text-primary tracking-tight">Register Agent</h2>
            
            {error && (
              <div className="p-3 border border-error bg-error/10 text-error font-mono text-[12px]">
                {error}
              </div>
            )}
            
            <div className="space-y-1">
              <label className="font-sans text-[11px] uppercase tracking-widest text-text-secondary">Name</label>
              <input 
                type="text" 
                value={name}
                onChange={e => setName(e.target.value)}
                className="w-full bg-bg-base border border-border focus:border-accent text-text-primary px-3 py-2 font-mono text-[13px] outline-none transition-colors"
                placeholder="e.g. tradebot_x"
              />
            </div>
            
            <div className="space-y-1">
              <label className="font-sans text-[11px] uppercase tracking-widest text-text-secondary">Description</label>
              <textarea 
                value={description}
                onChange={e => setDescription(e.target.value)}
                className="w-full bg-bg-base border border-border focus:border-accent text-text-primary px-3 py-2 font-sans text-[13px] outline-none transition-colors min-h-[80px]"
                placeholder="Operational purpose of this agent..."
              />
            </div>

            <div className="space-y-1">
              <label className="font-sans text-[11px] uppercase tracking-widest text-text-secondary">Capabilities (comma separated)</label>
              <input 
                type="text" 
                value={capabilities}
                onChange={e => setCapabilities(e.target.value)}
                className="w-full bg-bg-base border border-border focus:border-accent text-text-primary px-3 py-2 font-mono text-[13px] outline-none transition-colors"
                placeholder="market-making, arbitrage, scouting"
              />
            </div>

            <div className="space-y-1">
              <label className="font-sans text-[11px] uppercase tracking-widest text-text-secondary">Protocols (comma separated)</label>
              <input 
                type="text" 
                value={protocols}
                onChange={e => setProtocols(e.target.value)}
                className="w-full bg-bg-base border border-border focus:border-accent text-text-primary px-3 py-2 font-mono text-[13px] outline-none transition-colors"
                placeholder="rest, websockets, amqp"
              />
            </div>

            <div className="space-y-1">
              <label className="font-sans text-[11px] uppercase tracking-widest text-text-secondary">Endpoint URL (Optional)</label>
              <input 
                type="text" 
                value={endpointUrl}
                onChange={e => setEndpointUrl(e.target.value)}
                className="w-full bg-bg-base border border-border focus:border-accent text-text-primary px-3 py-2 font-mono text-[13px] outline-none transition-colors"
                placeholder="https://api.myagent.bot/webhook"
              />
            </div>

            <div className="flex justify-end pt-4 mt-2">
              <button 
                type="button"
                onClick={handleClose}
                className="px-4 py-2 text-text-secondary hover:text-text-primary font-sans text-[11px] uppercase tracking-widest border border-transparent hover:border-border mr-2 transition-colors duration-75"
              >
                Cancel
              </button>
              <button 
                type="submit"
                disabled={loading}
                className="px-4 py-2 bg-accent text-bg-base hover:bg-white font-sans text-[11px] uppercase tracking-widest transition-colors duration-75 disabled:opacity-50"
              >
                {loading ? 'Registering...' : 'Register Agent'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
