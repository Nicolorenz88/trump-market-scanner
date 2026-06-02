/**
 * /api/scan.js — Vercel Serverless Function
 *
 * Receives POST from the frontend with { prompt, portfolio }
 * Calls Anthropic API with web_search tool (server-side, no CORS issues)
 * Returns JSON with { alerts, news, portfolio, sourceCounts }
 *
 * Environment variable required in Vercel dashboard:
 *   ANTHROPIC_API_KEY = sk-ant-...
 */

import Anthropic from '@anthropic-ai/sdk';

export const config = {
  runtime: 'nodejs',
  maxDuration: 60,
};

const ai = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export default async function handler(req, res) {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    return res.status(204).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  res.setHeader('Access-Control-Allow-Origin', '*');

  try {
    const { portfolio = [], datetime: clientDatetime } = req.body || {};

    const now = new Date();
    const dateStr = now.toLocaleDateString('it-IT');
    const timeStr = now.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
    const ptf = portfolio.length ? portfolio.join(', ') : 'no portfolio specified';

    const prompt = `You are a financial intelligence AI. Today is ${dateStr} at ${timeStr} (Italian time).

Use your web search tool to find the LATEST news about:
1. Trump's statements about specific companies, sectors, or assets (Truth Social, X, press conferences, interviews)
2. Market-moving news related to Trump's policies (tariffs, sanctions, executive orders, trade deals)
3. Significant financial market news from today (major moves, earnings surprises, macro data)

After searching, return a JSON object with EXACTLY this structure (no markdown, no preamble, no explanation — just the JSON object):
{
  "alerts": [
    {
      "id": "a1",
      "source": "Reuters",
      "sourceIcon": "📰",
      "headline": "headline text",
      "tickers": ["NVDA","AMD"],
      "keywords": ["tariff","ban"],
      "score": 88,
      "priority": "HIGH",
      "time": "${timeStr}",
      "datetime": "${now.toISOString().slice(0,19)}",
      "url": "https://actual-article-url.com/...",
      "rationale": "1-sentence explanation"
    }
  ],
  "news": [
    {
      "id": "n1",
      "source": "Bloomberg",
      "headline": "Market news headline",
      "snippet": "Brief 1-2 sentence summary",
      "tickers": ["NVDA","MSFT"],
      "tag": "markets",
      "datetime": "2025-06-02T14:32:00",
      "url": "https://actual-article-url.com/...",
      "time": "${timeStr}"
    }
  ],
  "portfolio": [
    {
      "ticker": "NVDA",
      "impact": "positive",
      "headline": "Relevant headline affecting this ticker",
      "reason": "1-2 sentence explanation of impact on this specific stock",
      "url": "",
      "time": "${timeStr}"
    }
  ],
  "sourceCounts": {
    "reuters": 3,
    "ap": 2,
    "cnbc": 4,
    "politico": 1,
    "guardian": 0,
    "bloomberg": 3,
    "wsj": 2,
    "ft": 1
  }
}

RULES for alerts:
- Only include headlines where Trump directly mentions or implies companies/assets
- Extract real NYSE/NASDAQ tickers; for sectors use ETFs (ITA=defense, XLE=energy, XLF=finance, SMH=semiconductors)
- Score 0-100: directness of Trump mention (40pts) + ticker specificity (30pts) + keyword urgency (30pts)
- Priority: HIGH≥85, MEDIUM 65-84, LOW 50-64. Omit below 50.
- sourceIcon: 📰 news, 🇺🇸 Truth Social, 𝕏 X/Twitter, 📺 TV
- url: MUST be the real article URL from your web search results (use "" only if genuinely not found)
- datetime: ISO 8601 of the article's actual publication time

RULES for news:
- 5-7 significant market/financial news items from today, NOT necessarily Trump-related
- tag must be one of: markets, politics, macro, trade
- tickers: real NYSE/NASDAQ symbols mentioned (use [] if none)
- datetime: ISO 8601 of actual article publication time
- url: MUST be the real article URL from your web search results

RULES for portfolio:
- Analyze impact on each ticker: ${ptf}
- impact: positive, negative, neutral, or watch
- Only return tickers from this list: ${ptf}`;

    const msg = await ai.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4000,
      tools: [{ type: 'web_search_20250305', name: 'web_search' }],
      messages: [{ role: 'user', content: prompt }],
    });

    // Extract final text block (after tool use cycles)
    const textBlock = (msg.content || [])
      .filter(b => b.type === 'text')
      .map(b => b.text)
      .join('');

    if (!textBlock) {
      return res.status(500).json({ error: 'No text in Claude response' });
    }

    const clean = textBlock.replace(/```json|```/g, '').trim();
    const jsonMatch = clean.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return res.status(500).json({ error: 'No JSON found in response', raw: clean.slice(0, 300) });
    }

    const result = JSON.parse(jsonMatch[0]);
    return res.status(200).json(result);

  } catch (err) {
    console.error('[/api/scan] Error:', err);
    return res.status(500).json({ error: err.message });
  }
}
