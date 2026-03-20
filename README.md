# Revify Outreach

AI data enrichment and outreach tool built for Revology Analytics.

Pulls companies and contacts from GoHighLevel, runs research using Gemini, Tavily, and SERP APIs, then generates personalized outreach emails tailored to each contact's role. Token usage is logged per run for cost transparency.

## Stack

- React, TypeScript, Vite
- Gemini API, Tavily, SERP API
- GoHighLevel API
- Supabase (PostgreSQL)
- Vercel

## Setup

```bash
npm install
cp .env.local.example .env.local  # add your API keys
npm run dev
```
