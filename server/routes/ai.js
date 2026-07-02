const express = require('express');
const router = express.Router();
const { requireAuth, requireDeveloper } = require('../middleware/auth');
const { rateLimit } = require('../middleware/rateLimit');
const { App } = require('../database');

// The chat endpoint is public and each call costs gateway credits — keep it bounded
const chatLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 30,
  message: 'Too many AI requests. Please try again later.',
});

const GATEWAY_URL = process.env.VERCEL_AI_GATEWAY_URL;
const GATEWAY_KEY = process.env.VERCEL_AI_GATEWAY_KEY;
const AI_MODEL = process.env.VERCEL_AI_MODEL || 'gpt-4o-mini';

async function callAI(messages, opts = {}) {
  if (!GATEWAY_URL || !GATEWAY_KEY) {
    throw new Error('AI gateway not configured. Set VERCEL_AI_GATEWAY_URL and VERCEL_AI_GATEWAY_KEY.');
  }
  const res = await fetch(`${GATEWAY_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${GATEWAY_KEY}`,
    },
    body: JSON.stringify({
      model: opts.model || AI_MODEL,
      messages,
      max_tokens: opts.max_tokens || 400,
      temperature: opts.temperature ?? 0.7,
    }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`AI gateway error ${res.status}: ${err.substring(0, 200)}`);
  }
  const data = await res.json();
  const content = data?.choices?.[0]?.message?.content;
  if (typeof content !== 'string') throw new Error('AI gateway returned an unexpected response shape');
  return content;
}

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// POST /api/ai/chat — public app discovery assistant
router.post('/chat', chatLimiter, async (req, res) => {
  try {
    const { message } = req.body;
    const history = Array.isArray(req.body.history) ? req.body.history : [];
    if (!message || typeof message !== 'string' || message.length > 500) {
      return res.status(400).json({ error: 'message required (max 500 chars)' });
    }

    const apps = await App.find({ status: 'approved' }, 'id name slug short_description category downloads_count rating_avg')
      .sort({ downloads_count: -1 })
      .limit(60)
      .lean();

    const appList = apps.map(a =>
      `[${a._id}] ${a.name} (${a.category}) — ${a.short_description || 'No description'}`
    ).join('\n');

    const systemPrompt = `You are a helpful app discovery assistant for Primers Store, a curated app store.

Available apps:
${appList}

Rules:
- Only recommend apps from the list above, mentioned by their exact name
- Be concise — 1-3 sentences plus a list of relevant apps
- If no apps match the user's need, say so honestly and suggest browsing by category
- Never make up apps not in the list`;

    const safeHistory = history
      .slice(-6)
      .filter(m => (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string')
      .map(m => ({ role: m.role, content: m.content.substring(0, 500) }));

    const reply = await callAI([
      { role: 'system', content: systemPrompt },
      ...safeHistory,
      { role: 'user', content: message.trim() },
    ], { max_tokens: 300, temperature: 0.6 });

    // Word-boundary match so short app names don't false-positive on substrings
    const mentioned = apps.filter(a => {
      try { return new RegExp(`(^|\\W)${escapeRegex(a.name)}($|\\W)`, 'i').test(reply); }
      catch { return reply.includes(a.name); }
    }).map(a => ({
      id: a._id.toString(),
      name: a.name,
      slug: a.slug,
    }));

    res.json({ reply, apps: mentioned });
  } catch (e) {
    console.error('[AI /chat]', e.message);
    res.status(500).json({ error: 'AI assistant is temporarily unavailable' });
  }
});

// POST /api/ai/generate-description — developers only
router.post('/generate-description', requireAuth, requireDeveloper, async (req, res) => {
  try {
    const { name, category, description } = req.body;
    if (!name || !category || !description) {
      return res.status(400).json({ error: 'name, category, and description are required' });
    }

    const reply = await callAI([
      {
        role: 'system',
        content: 'You are a copywriter for an app store. Write short, punchy one-liner descriptions. Return ONLY the description text — no quotes, no labels, nothing else. Max 200 characters.',
      },
      {
        role: 'user',
        content: `App: ${name.substring(0, 100)}\nCategory: ${category}\nDescription: ${description.substring(0, 800)}\n\nWrite a short description:`,
      },
    ], { max_tokens: 80, temperature: 0.5 });

    const shortDesc = reply.trim().replace(/^["']|["']$/g, '').substring(0, 200);
    res.json({ short_description: shortDesc });
  } catch (e) {
    console.error('[AI /generate-description]', e.message);
    res.status(500).json({ error: 'AI assistant is temporarily unavailable' });
  }
});

// POST /api/ai/moderate — developers only
router.post('/moderate', requireAuth, requireDeveloper, async (req, res) => {
  try {
    const { name, description, category } = req.body;
    if (!name || !description) return res.status(400).json({ error: 'name and description required' });

    const reply = await callAI([
      {
        role: 'system',
        content: 'You are a content moderator for a software app store. Evaluate whether an app submission looks genuine and appropriate. Respond with ONLY valid JSON in this exact format: {"approved":true,"reason":""} or {"approved":false,"reason":"one sentence explanation"}',
      },
      {
        role: 'user',
        content: `App: ${name.substring(0, 100)}\nCategory: ${category || 'Other'}\nDescription: ${description.substring(0, 600)}`,
      },
    ], { max_tokens: 100, temperature: 0.1 });

    let parsed;
    try {
      parsed = JSON.parse(reply.match(/\{[\s\S]*?\}/)?.[0] || '{}');
      if (typeof parsed.approved !== 'boolean') parsed = { approved: true, reason: '' };
    } catch {
      parsed = { approved: true, reason: '' };
    }

    res.json(parsed);
  } catch (e) {
    console.error('[AI /moderate]', e.message);
    res.json({ approved: true, reason: '' });
  }
});

module.exports = router;
