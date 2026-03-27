# Platform Ranking Factors — AI Search

How each major AI search platform selects sources, what signals matter most, and how to optimize specifically for each.

---

## Google AI Overviews

### How It Works
Google AI Overviews (formerly Search Generative Experience) generates summaries by pulling from pages that already rank well in traditional Google Search. It uses Google's full index and ranking infrastructure as its source pool, then applies Gemini to synthesize answers.

### Source Selection Signals
| Signal | Weight | Notes |
|--------|--------|-------|
| Traditional ranking position | Very high | Pages ranking in top 10 are far more likely to be cited |
| E-E-A-T (Experience, Expertise, Authoritativeness, Trustworthiness) | Very high | Google's core quality signal applies directly |
| Content freshness | High | Recently updated pages preferred, especially for time-sensitive queries |
| Schema markup (FAQ, HowTo, Article) | High | Structured data improves extractability |
| Page authority / backlink profile | High | Same as traditional SEO |
| Content extractability | Medium | Passage-level relevance matters — AI pulls specific paragraphs |
| Mobile-friendliness / Core Web Vitals | Medium | Technical SEO prerequisites still apply |

### What to Optimize
- Rank well in traditional Google Search first — AI Overviews are a downstream benefit
- Implement FAQ schema for Q&A content; HowTo schema for process content
- Write a clear, direct answer in the first 100 words of each section
- Demonstrate first-hand experience (photos, original data, named authors)
- Keep "last updated" dates visible and accurate

### Query Types Most Likely to Trigger AI Overviews
- Informational: "What is…", "How does…", "Why is…"
- How-to: "How to…", "Steps to…"
- Comparison: "X vs Y", "Best X for Y"
- Definition: "Define…", "What does X mean"

### Robots.txt
```
# Allow Google AI Overviews (uses standard Googlebot)
User-agent: Googlebot
Allow: /

# Allow Google-Extended (Gemini training + AI features)
User-agent: Google-Extended
Allow: /
```
> Note: Blocking `Google-Extended` prevents your content from being used in Gemini training AND AI Overviews. These cannot currently be separated.

---

## ChatGPT (OpenAI with Browse)

### How It Works
When Browse is enabled, ChatGPT uses Bing search to find current web results, then synthesizes answers with citations. It casts a wider net than Google AI Overviews — it can cite pages that rank on page 2 or 3 of Bing if the content quality is high.

### Source Selection Signals
| Signal | Weight | Notes |
|--------|--------|-------|
| Content relevance to query | Very high | Semantic match, not just keyword match |
| Content structure / extractability | Very high | Self-contained passages are preferred |
| Page authority | High | High-DA domains cited more frequently |
| Bing indexing | High | Must be indexed by Bing, not just Google |
| Freshness | High | Publication and update dates matter |
| Trust signals (author, sources cited) | Medium | Authoritative tone and citations in content |
| Schema markup | Medium | Helpful but less critical than on Google |

### What to Optimize
- Verify your site is indexed by Bing (`site:yourdomain.com` in Bing)
- Submit sitemap to Bing Webmaster Tools
- Write self-contained answer blocks — ChatGPT often extracts a single paragraph
- Cite external sources within your content (signals authority)
- Include specific statistics with dates

### Robots.txt
```
# Allow ChatGPT browsing (do NOT block)
User-agent: GPTBot
Allow: /

User-agent: ChatGPT-User
Allow: /
```
> Blocking `GPTBot` prevents ChatGPT from crawling your content for both training and browsing citations.

---

## Perplexity

### How It Works
Perplexity always shows citations alongside answers. It uses its own crawler (PerplexityBot) plus access to multiple search indexes. It aggressively favors well-structured, authoritative, recent content — and is particularly good at surfacing non-top-10 pages if the content is high quality.

### Source Selection Signals
| Signal | Weight | Notes |
|--------|--------|-------|
| Content structure (headings, tables, lists) | Very high | Perplexity extracts structured content very effectively |
| Freshness | Very high | Strongly favors recently updated content |
| Cited sources within content | Very high | The Princeton GEO study found +40% visibility from citations |
| Statistics with sources | Very high | Specific numbers with attributions are heavily favored |
| Domain authority | High | But lower-DA sites can still rank with strong content |
| Expert quotes with attribution | High | Named sources with credentials boost citation rate |
| Keyword relevance | Medium | Semantic and exact-match both matter |

### What to Optimize
- Structure every major claim as an extractable sentence (40-60 words)
- Use H2/H3 headings that directly match query phrasing
- Include tables for comparative information
- Add statistics with inline source citations
- Keep content updated — stale content loses citation share quickly
- Author bylines with credentials visible

### Robots.txt
```
User-agent: PerplexityBot
Allow: /
```

---

## Google Gemini

### How It Works
Gemini powers Google's AI assistant and is deeply integrated with Google's Knowledge Graph and search index. For grounded responses (those with citations), it draws from Google Search results using similar signals to AI Overviews.

### Source Selection Signals
Same core signals as Google AI Overviews, plus:
| Signal | Weight | Notes |
|--------|--------|-------|
| Knowledge Graph entity presence | High | Entities (brands, people, places) recognized in KG are cited more |
| Structured data / schema | High | Organization, Product, Person schemas improve entity recognition |
| YouTube content | Medium | Gemini frequently cites YouTube for how-to and visual queries |

### What to Optimize
- Ensure your brand/product is an established entity in Google's ecosystem
- Maintain consistent NAP (Name, Address, Phone) across web if local
- Implement `Organization` schema with `sameAs` links to authoritative profiles
- Create YouTube content for key how-to queries — Gemini surfaces video

### Robots.txt
```
# Same as Google — Google-Extended covers Gemini
User-agent: Google-Extended
Allow: /
```

---

## Microsoft Copilot

### How It Works
Copilot is powered by Bing search and GPT-4. It behaves similarly to ChatGPT with Browse but is more tightly integrated with Bing's ranking signals. Being indexed and ranking in Bing is a prerequisite.

### Source Selection Signals
| Signal | Weight | Notes |
|--------|--------|-------|
| Bing ranking position | Very high | Higher Bing rank = higher citation probability |
| Bing Webmaster Tools verification | High | Verified sites get better crawl treatment |
| Content extractability | High | Self-contained answer blocks preferred |
| Microsoft-affiliated domains | Medium | .edu, .gov, major publishers get slight boost |
| Schema markup | Medium | Helpful for content type recognition |

### What to Optimize
- Verify and submit sitemap in Bing Webmaster Tools
- Optimize for Bing's ranking factors (similar to Google but with differences in link weighting)
- Write concise, direct answers — Copilot often displays a summary box

### Robots.txt
```
User-agent: Bingbot
Allow: /

# Copilot uses standard Bingbot — no separate agent needed
```

---

## Claude (Anthropic)

### How It Works
Claude uses Brave Search when web browsing is enabled. For non-browsing responses, Claude draws on training data (cutoff August 2025). Citations in web-enabled Claude responses come from Brave's index.

### Source Selection Signals (Browse-enabled)
| Signal | Weight | Notes |
|--------|--------|-------|
| Brave Search index presence | Very high | Must be indexed by Brave |
| Content quality / structure | Very high | Claude favors well-organized, factual content |
| Domain authority | High | Established, trusted domains preferred |
| Content clarity and accuracy | High | Claude is sensitive to misleading or low-quality content |

### What to Optimize
- Submit sitemap to Brave Search (search.brave.com/webmaster)
- Focus on content accuracy and factual density
- Structure content clearly with headings and concise paragraphs

### Robots.txt
```
User-agent: ClaudeBot
Allow: /

User-agent: anthropic-ai
Allow: /
```

---

## Master Robots.txt Configuration

Allow all major AI search bots while blocking training-only crawlers you may want to restrict:

```robots
# === AI SEARCH BOTS (allow for citations) ===

# Google (AI Overviews + Gemini)
User-agent: Googlebot
Allow: /

User-agent: Google-Extended
Allow: /

# OpenAI (ChatGPT browsing)
User-agent: GPTBot
Allow: /

User-agent: ChatGPT-User
Allow: /

# Perplexity
User-agent: PerplexityBot
Allow: /

# Microsoft Copilot (via Bing)
User-agent: Bingbot
Allow: /

# Anthropic Claude
User-agent: ClaudeBot
Allow: /

User-agent: anthropic-ai
Allow: /

# === TRAINING-ONLY CRAWLERS (optional: block if you don't want training use) ===

# Common Crawl (used for LLM training datasets — not for search citation)
User-agent: CCBot
Disallow: /

# === SCANNER/BOT BLOCKING ===
# Handle in your application middleware, not robots.txt
```

> **Decision:** Blocking `CCBot` prevents your content from being added to Common Crawl datasets used in training many LLMs, but does NOT affect whether AI search engines cite your live pages. The search-specific bots above (GPTBot, PerplexityBot, etc.) are separate from training crawlers.

---

## Platform Comparison Summary

| Platform | Source Pool | Top Signal | Robots.txt Bot |
|----------|-------------|------------|----------------|
| Google AI Overviews | Google index (top results) | Traditional rank + E-E-A-T | `Google-Extended` |
| ChatGPT Browse | Bing index | Content structure + Bing rank | `GPTBot`, `ChatGPT-User` |
| Perplexity | Own crawler + multiple indexes | Structure + citations + freshness | `PerplexityBot` |
| Gemini | Google index + Knowledge Graph | Google rank + entity recognition | `Google-Extended` |
| Copilot | Bing index | Bing rank | `Bingbot` |
| Claude | Brave Search | Content quality + Brave index | `ClaudeBot`, `anthropic-ai` |
