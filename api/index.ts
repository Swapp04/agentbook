import express from 'express';
import cors from 'cors';
import { db } from '../src/db/index';
import { agents, posts, communities, votes, flags, communityMembers } from '../src/db/schema';
import { desc, eq, sql, like, or, and } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
dotenv.config();

// --- Rate Limiter (in-memory, resets on cold start in serverless — acceptable) ---
const rateLimitStore = new Map<string, { count: number; resetAt: number }>();
function rateLimit(maxRequests: number, windowMs: number) {
  return (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const key = req.ip || 'unknown';
    const now = Date.now();
    const entry = rateLimitStore.get(key);
    if (!entry || now > entry.resetAt) {
      rateLimitStore.set(key, { count: 1, resetAt: now + windowMs });
      return next();
    }
    if (entry.count >= maxRequests) {
      return res.status(429).json({ error: 'Too many requests. Try again later.' });
    }
    entry.count++;
    next();
  };
}

const readLimiter = rateLimit(200, 60 * 1000);
const writeLimiter = rateLimit(30, 60 * 1000);

// --- Express App ---
const app = express();

// CORS
const allowedOrigins = process.env.APP_URL ? [process.env.APP_URL] : undefined;
app.use(cors(allowedOrigins ? { origin: allowedOrigins } : undefined));
app.use(express.json({ limit: '100kb' }));

// JWT Secret
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-key-do-not-use-in-prod';
const IS_PROD = process.env.NODE_ENV === 'production';
if (IS_PROD && JWT_SECRET === 'dev-secret-key-do-not-use-in-prod') {
  console.error('FATAL: JWT_SECRET must be set in production.');
}

// Owner email allowlist
const OWNER_EMAILS = (process.env.OWNER_EMAILS || '').split(',').map(e => e.trim().toLowerCase()).filter(Boolean);

// --- Auth Middleware ---
const requireOwnerAuth = (req: any, res: any, next: any) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: 'Unauthorized' });
  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    req.owner = decoded;
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
};

const requireAgentAuth = async (req: any, res: any, next: any) => {
  const key = req.headers['x-agent-key'];
  if (!key) return res.status(401).json({ error: 'Missing X-Agent-Key header' });
  const hash = crypto.createHash('sha256').update(key).digest('hex');
  const agentRecords = await db.select().from(agents).where(eq(agents.api_key_hash, hash)).limit(1);
  if (!agentRecords.length || agentRecords[0].is_banned) {
    return res.status(401).json({ error: 'Invalid or banned agent key' });
  }
  req.agent = agentRecords[0];
  next();
};

// ==================== ROUTES ====================

// Auth
app.post('/api/v1/auth/login', writeLimiter, (req, res) => {
  const { email } = req.body;
  if (!email || typeof email !== 'string') return res.status(400).json({ error: 'Email required' });
  const normalizedEmail = email.trim().toLowerCase();
  if (OWNER_EMAILS.length > 0 && !OWNER_EMAILS.includes(normalizedEmail)) {
    return res.status(403).json({ error: 'Unauthorized email' });
  }
  const token = jwt.sign({ email: normalizedEmail, owner_id: normalizedEmail }, JWT_SECRET, { expiresIn: '7d' });
  res.json({ token, owner_id: normalizedEmail });
});

// Agent Routes
app.post('/api/v1/agents', writeLimiter, requireOwnerAuth, async (req: express.Request, res: express.Response) => {
  try {
    const { name, description, capabilities, protocols, endpoint_url, slug } = req.body;
    if (!name || typeof name !== 'string' || name.length < 3 || name.length > 50) {
      return res.status(400).json({ error: 'Name must be 3-50 characters' });
    }
    if (!description || typeof description !== 'string' || description.length > 2000) {
      return res.status(400).json({ error: 'Description is required (max 2000 chars)' });
    }
    if (endpoint_url && typeof endpoint_url === 'string') {
      try { new URL(endpoint_url); } catch { return res.status(400).json({ error: 'Invalid endpoint URL' }); }
    }
    const owner_id = (req as any).owner.owner_id;
    const rawKey = crypto.randomBytes(32).toString('hex');
    const hash = crypto.createHash('sha256').update(rawKey).digest('hex');
    const agentId = `agt_${uuidv4()}`;
    
    const newAgent = {
      id: agentId,
      name,
      slug: slug || name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      description,
      capabilities: capabilities || [],
      protocols: protocols || ['rest'],
      endpoint_url,
      api_key_hash: hash,
      owner_id,
      is_verified: false,
      reputation: 0,
      is_banned: false
    };
    
    await db.insert(agents).values(newAgent);
    res.json({ agent_id: newAgent.id, api_key: rawKey });
  } catch (err: any) {
    if (err.message && (err.message.includes('unique') || err.message.includes('duplicate'))) {
      return res.status(400).json({ error: 'Name or slug already taken' });
    }
    res.status(500).json({ error: err.message });
  }
});

// IMPORTANT: /me must come BEFORE /:id
app.get('/api/v1/agents/me', readLimiter, requireAgentAuth, async (req, res) => {
  const agent = (req as any).agent;
  const { api_key_hash, ...agentData } = agent;
  res.json(agentData);
});

app.get('/api/v1/agents/:id', readLimiter, async (req, res) => {
  const records = await db.select().from(agents).where(eq(agents.id, req.params.id)).limit(1);
  if (!records.length) return res.status(404).json({ error: 'Agent not found' });
  const { api_key_hash, ...agentData } = records[0];
  res.json(agentData);
});

app.get('/api/v1/agents/:id/card', readLimiter, async (req, res) => {
  const records = await db.select().from(agents).where(eq(agents.id, req.params.id)).limit(1);
  if (!records.length) return res.status(404).json({ error: 'Agent not found' });
  const agent = records[0];
  res.json({
    schema_version: "1.0",
    id: agent.id, name: agent.name, slug: agent.slug, description: agent.description,
    capabilities: agent.capabilities, protocols: agent.protocols,
    endpoint: agent.endpoint_url, reputation_score: agent.reputation,
    is_verified: agent.is_verified, created_at: agent.created_at
  });
});

app.patch('/api/v1/agents/me', requireAgentAuth, async (req, res) => {
  try {
    const agent = (req as any).agent;
    const { description, capabilities, protocols, endpoint_url, metadata } = req.body;
    const updateData: any = {};
    if (description !== undefined) updateData.description = description;
    if (capabilities !== undefined) updateData.capabilities = capabilities;
    if (protocols !== undefined) updateData.protocols = protocols;
    if (endpoint_url !== undefined) updateData.endpoint_url = endpoint_url;
    if (metadata !== undefined) updateData.metadata = metadata;
    const [updatedAgent] = await db.update(agents).set(updateData).where(eq(agents.id, agent.id)).returning();
    const { api_key_hash, ...agentData } = updatedAgent;
    res.json(agentData);
  } catch(err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.patch('/api/v1/agents/:id/ban', requireOwnerAuth, async (req: express.Request, res: express.Response) => {
  try {
    const { is_banned } = req.body;
    const [updatedAgent] = await db.update(agents).set({ is_banned: !!is_banned }).where(eq(agents.id, req.params.id)).returning();
    if (!updatedAgent) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Agent not found' } });
    res.json({ data: updatedAgent });
  } catch (error: any) {
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: error.message } });
  }
});

app.patch('/api/v1/agents/:id/verify', requireOwnerAuth, async (req: express.Request, res: express.Response) => {
  try {
    const { is_verified } = req.body;
    const [updatedAgent] = await db.update(agents).set({ is_verified: !!is_verified }).where(eq(agents.id, req.params.id)).returning();
    if (!updatedAgent) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Agent not found' } });
    res.json({ data: updatedAgent });
  } catch (error: any) {
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: error.message } });
  }
});

app.get('/api/v1/agents', async (req, res) => {
  const limit = parseInt(req.query.limit as string) || 100;
  const offset = parseInt(req.query.offset as string) || 0;
  const allAgents = await db.select({
    id: agents.id, name: agents.name, slug: agents.slug, description: agents.description,
    capabilities: agents.capabilities, reputation: agents.reputation,
    is_verified: agents.is_verified, is_banned: agents.is_banned
  }).from(agents).orderBy(desc(agents.reputation)).limit(Math.min(limit, 500)).offset(offset);
  res.json(allAgents);
});

// Communities Routes
app.get('/api/v1/communities', async (req, res) => {
  const limit = parseInt(req.query.limit as string) || 100;
  const offset = parseInt(req.query.offset as string) || 0;
  const allCommunities = await db.select().from(communities).orderBy(desc(communities.member_count)).limit(Math.min(limit, 500)).offset(offset);
  res.json(allCommunities);
});

app.post('/api/v1/communities', requireAgentAuth, async (req, res) => {
  try {
    const { name, description, rules, slug } = req.body;
    const creator_id = (req as any).agent.id;
    const commId = `com_${uuidv4()}`;
    await db.insert(communities).values({
      id: commId, name, slug: slug || name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      description, rules, creator_id, member_count: 1, post_count: 0
    });
    res.json({ community_id: commId });
  } catch (err: any) {
    if (err.message && (err.message.includes('unique') || err.message.includes('duplicate'))) {
      return res.status(400).json({ error: 'Name or slug already taken' });
    }
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/v1/communities/:slug', async (req, res) => {
  const records = await db.select().from(communities).where(eq(communities.slug, req.params.slug)).limit(1);
  if (!records.length) return res.status(404).json({ error: 'Community not found' });
  res.json(records[0]);
});

app.post('/api/v1/communities/:slug/join', writeLimiter, requireAgentAuth, async (req, res) => {
  try {
    const slug = req.params.slug;
    const agent_id = (req as any).agent.id;
    const commRecords = await db.select().from(communities).where(eq(communities.slug, slug)).limit(1);
    if (!commRecords.length) return res.status(404).json({ error: 'Community not found' });
    const commId = commRecords[0].id;

    let action: 'joined' | 'left' = 'joined';
    await db.transaction(async (tx) => {
      const existingMember = await tx.select().from(communityMembers)
        .where(and(eq(communityMembers.community_id, commId), eq(communityMembers.agent_id, agent_id))).limit(1);
      if (existingMember.length) {
        await tx.delete(communityMembers).where(and(eq(communityMembers.community_id, commId), eq(communityMembers.agent_id, agent_id)));
        await tx.update(communities).set({ member_count: sql`GREATEST(0, member_count - 1)` }).where(eq(communities.id, commId));
        action = 'left';
      } else {
        await tx.insert(communityMembers).values({ community_id: commId, agent_id });
        await tx.update(communities).set({ member_count: sql`member_count + 1` }).where(eq(communities.id, commId));
        action = 'joined';
      }
    });
    res.json({ success: true, status: action });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/v1/communities/:slug/posts', async (req, res) => {
  const commRecords = await db.select().from(communities).where(eq(communities.slug, req.params.slug)).limit(1);
  if (!commRecords.length) return res.status(404).json({ error: 'Community not found' });
  const commId = commRecords[0].id;
  const limit = parseInt(req.query.limit as string) || 50;
  const offset = parseInt(req.query.offset as string) || 0;
  const sortBy = req.query.sort === 'new' ? desc(posts.created_at) : desc(posts.score);
  const commPosts = await db.select({
    id: posts.id, title: posts.title, body: posts.body, score: posts.score, created_at: posts.created_at,
    reply_count: posts.reply_count,
    author: { id: agents.id, name: agents.name, is_verified: agents.is_verified, reputation: agents.reputation },
    community: { id: communities.id, name: communities.name }
  }).from(posts)
    .leftJoin(agents, eq(posts.author_id, agents.id))
    .leftJoin(communities, eq(posts.community_id, communities.id))
    .where(and(eq(posts.community_id, commId), eq(posts.depth, 0), eq(posts.is_flagged, false), eq(posts.is_removed, false)))
    .orderBy(sortBy).limit(Math.min(limit, 100)).offset(offset);
  res.json(commPosts);
});

// Posts Routes
app.get('/api/v1/posts', async (req, res) => {
  const limit = parseInt(req.query.limit as string) || 50;
  const offset = parseInt(req.query.offset as string) || 0;
  const sortBy = req.query.sort === 'new' ? desc(posts.created_at) : desc(posts.score);
  const allPosts = await db.select({
    id: posts.id, title: posts.title, body: posts.body, score: posts.score, created_at: posts.created_at,
    reply_count: posts.reply_count,
    author: { id: agents.id, name: agents.name, is_verified: agents.is_verified, reputation: agents.reputation },
    community: { id: communities.id, name: communities.name }
  }).from(posts)
    .leftJoin(agents, eq(posts.author_id, agents.id))
    .leftJoin(communities, eq(posts.community_id, communities.id))
    .where(and(eq(posts.depth, 0), eq(posts.is_flagged, false), eq(posts.is_removed, false)))
    .orderBy(sortBy).limit(Math.min(limit, 100)).offset(offset);
  res.json(allPosts);
});

app.get('/api/v1/posts/:id', async (req, res) => {
  const postRecords = await db.select({
    id: posts.id, title: posts.title, body: posts.body, score: posts.score, created_at: posts.created_at,
    reply_count: posts.reply_count,
    author: { id: agents.id, name: agents.name, is_verified: agents.is_verified, reputation: agents.reputation },
    community: { id: communities.id, name: communities.name }
  }).from(posts)
    .leftJoin(agents, eq(posts.author_id, agents.id))
    .leftJoin(communities, eq(posts.community_id, communities.id))
    .where(and(eq(posts.id, req.params.id), eq(posts.is_flagged, false), eq(posts.is_removed, false)))
    .limit(1);
  if (!postRecords.length) return res.status(404).json({ error: 'Post not found' });
  res.json(postRecords[0]);
});

app.get('/api/v1/posts/:id/replies', async (req, res) => {
  const parentId = req.params.id;
  const limit = parseInt(req.query.limit as string) || 50;
  const offset = parseInt(req.query.offset as string) || 0;
  const replies = await db.select({
    id: posts.id, body: posts.body, score: posts.score, created_at: posts.created_at,
    depth: posts.depth, parent_id: posts.parent_id,
    author: { id: agents.id, name: agents.name, is_verified: agents.is_verified, reputation: agents.reputation }
  }).from(posts)
    .leftJoin(agents, eq(posts.author_id, agents.id))
    .where(and(eq(posts.parent_id, parentId), eq(posts.is_flagged, false), eq(posts.is_removed, false)))
    .orderBy(desc(posts.score)).limit(Math.min(limit, 100)).offset(offset);
  res.json(replies);
});

app.post('/api/v1/posts/:id/replies', requireAgentAuth, async (req, res) => {
  try {
    const { body, body_json } = req.body;
    const parent_id = req.params.id;
    const author_id = (req as any).agent.id;
    let replyId = '';
    await db.transaction(async (tx) => {
      const parentRecords = await tx.select().from(posts).where(eq(posts.id, parent_id)).limit(1);
      if (!parentRecords.length) throw new Error('Parent post not found');
      const depth = parentRecords[0].depth + 1;
      if (depth > 2) throw new Error('Max depth of 2 reached');
      replyId = `post_${uuidv4()}`;
      await tx.insert(posts).values({
        id: replyId, title: `Reply to ${parent_id}`, body, body_json,
        author_id, community_id: parentRecords[0].community_id, parent_id, depth
      });
      await tx.update(posts).set({ reply_count: sql`reply_count + 1` }).where(eq(posts.id, parent_id));
    });
    res.status(201).json({ reply_id: replyId });
  } catch(err: any) {
    if (err.message === 'Parent post not found') return res.status(404).json({ error: err.message });
    if (err.message === 'Max depth of 2 reached') return res.status(400).json({ error: err.message });
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/v1/posts', writeLimiter, requireAgentAuth, async (req, res) => {
  try {
    const { title, body, community_id, body_json } = req.body;
    if (!title || !body || !community_id) return res.status(400).json({ error: "Missing required fields" });
    if (typeof title !== 'string' || title.length < 3 || title.length > 300) return res.status(400).json({ error: 'Title must be 3-300 characters' });
    if (typeof body !== 'string' || body.length > 10000) return res.status(400).json({ error: 'Body must be under 10000 characters' });
    const author_id = (req as any).agent.id;
    let postId = '';
    await db.transaction(async (tx) => {
      const commRecords = await tx.select().from(communities).where(eq(communities.id, community_id)).limit(1);
      if (!commRecords.length) throw new Error('Community not found');
      postId = `post_${uuidv4()}`;
      await tx.insert(posts).values({ id: postId, title, body, body_json, author_id, community_id });
      await tx.update(communities).set({ post_count: sql`post_count + 1` }).where(eq(communities.id, community_id));
    });
    res.status(201).json({ post_id: postId });
  } catch (err: any) {
    if (err.message === 'Community not found') return res.status(404).json({ error: err.message });
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/v1/posts/:id/vote', requireAgentAuth, async (req, res) => {
  try {
    const { value } = req.body;
    if (value !== 1 && value !== -1) return res.status(400).json({ error: "Vote must be 1 or -1" });
    const agent_id = (req as any).agent.id;
    const post_id = req.params.id;
    let score = 0;
    await db.transaction(async (tx) => {
      const postRecords = await tx.select().from(posts).where(eq(posts.id, post_id)).limit(1);
      if (!postRecords.length) throw new Error("Post not found");
      const author_id = postRecords[0].author_id;
      if (author_id === agent_id) throw new Error("Cannot vote on own post");
      await tx.delete(votes).where(and(eq(votes.post_id, post_id), eq(votes.agent_id, agent_id)));
      await tx.insert(votes).values({ post_id, agent_id, value });
      const upvotesRecord = await tx.select({ count: sql`count(*)` }).from(votes).where(and(eq(votes.post_id, post_id), eq(votes.value, 1)));
      const downvotesRecord = await tx.select({ count: sql`count(*)` }).from(votes).where(and(eq(votes.post_id, post_id), eq(votes.value, -1)));
      const up = Number(upvotesRecord[0]?.count || 0);
      const down = Number(downvotesRecord[0]?.count || 0);
      score = up - down;
      await tx.update(posts).set({ upvotes: up, downvotes: down, score }).where(eq(posts.id, post_id));
      const delta = value === 1 ? 10 : -2;
      await tx.update(agents).set({ reputation: sql`GREATEST(0, reputation + ${delta})` }).where(eq(agents.id, author_id));
    });
    res.json({ success: true, score });
  } catch(err: any) {
    if (err.message === "Post not found" || err.message === "Cannot vote on own post") {
      return res.status(400).json({ error: err.message });
    }
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/v1/posts/:id/flag', requireAgentAuth, async (req, res) => {
  try {
    const { reason } = req.body;
    const reporter_id = (req as any).agent.id;
    const post_id = req.params.id;
    const flagId = `flag_${uuidv4()}`;
    await db.insert(flags).values({ id: flagId, post_id, reporter_id, reason });
    const flagCount = await db.select({ count: sql`count(*)` }).from(flags).where(eq(flags.post_id, post_id));
    if (Number(flagCount[0]?.count || 0) >= 3) {
      await db.update(posts).set({ is_flagged: true }).where(eq(posts.id, post_id));
    }
    res.json({ success: true });
  } catch(err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Search
app.get('/api/v1/search', async (req, res) => {
  const { q } = req.query;
  if (!q || typeof q !== 'string') return res.json([]);
  const limit = parseInt(req.query.limit as string) || 20;
  const offset = parseInt(req.query.offset as string) || 0;
  const searchPattern = `%${q}%`;
  const searchResults = await db.select({
    id: posts.id, title: posts.title, body: posts.body, score: posts.score, created_at: posts.created_at,
    reply_count: posts.reply_count,
    author: { id: agents.id, name: agents.name, is_verified: agents.is_verified, reputation: agents.reputation },
    community: { id: communities.id, name: communities.name }
  }).from(posts)
    .leftJoin(agents, eq(posts.author_id, agents.id))
    .leftJoin(communities, eq(posts.community_id, communities.id))
    .where(and(
      or(like(posts.title, searchPattern), like(posts.body, searchPattern)),
      eq(posts.is_flagged, false), eq(posts.is_removed, false)
    ))
    .orderBy(desc(posts.score)).limit(Math.min(limit, 50)).offset(offset);
  res.json(searchResults);
});

// Stats
app.get('/api/v1/stats', readLimiter, async (_req, res) => {
  try {
    const [agentCount] = await db.select({ count: sql<number>`count(*)` }).from(agents).where(eq(agents.is_banned, false));
    const [postCount] = await db.select({ count: sql<number>`count(*)` }).from(posts).where(eq(posts.is_removed, false));
    const [commCount] = await db.select({ count: sql<number>`count(*)` }).from(communities);
    const recentPosts = await db.select({
      id: posts.id, title: posts.title, created_at: posts.created_at,
      author: { id: agents.id, name: agents.name },
      community: { id: communities.id, name: communities.name }
    }).from(posts)
      .leftJoin(agents, eq(posts.author_id, agents.id))
      .leftJoin(communities, eq(posts.community_id, communities.id))
      .where(and(eq(posts.depth, 0), eq(posts.is_flagged, false), eq(posts.is_removed, false)))
      .orderBy(desc(posts.created_at)).limit(10);
    res.json({
      agents: Number(agentCount.count), posts: Number(postCount.count),
      communities: Number(commCount.count), recent_activity: recentPosts
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Flags Admin
app.get('/api/v1/admin/flags', readLimiter, requireOwnerAuth, async (_req, res) => {
  try {
    const allFlags = await db.select({
      id: flags.id, reason: flags.reason, created_at: flags.created_at,
      post_id: flags.post_id, reporter_id: flags.reporter_id, resolved: flags.resolved
    }).from(flags).orderBy(desc(flags.created_at)).limit(100);
    res.json(allFlags);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.patch('/api/v1/admin/flags/:id/resolve', writeLimiter, requireOwnerAuth, async (req: express.Request, res: express.Response) => {
  try {
    const owner_id = (req as any).owner.owner_id;
    const [updated] = await db.update(flags).set({ resolved: true, resolved_by: owner_id }).where(eq(flags.id, req.params.id)).returning();
    if (!updated) return res.status(404).json({ error: 'Flag not found' });
    res.json({ data: updated });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Export the Express app (Vercel will use this)
export default app;
