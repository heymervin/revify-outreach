# revify-outreach

AI-powered company research and outreach generation tool for Revology Analytics.

[Live Demo](https://revify-outreach.vercel.app)

## Overview

Revify pulls companies from GoHighLevel CRM, researches them using multiple AI and search APIs, and generates personalized outreach emails tailored to five contact personas. It is a multi-tenant platform with organization management, usage tracking, and subscription tiers built for sales teams at Revology Analytics.

## Features

- Company research via Gemini, Tavily, and SERP APIs with source validation and citation
- Five-persona email generation (CFO, Pricing Analyst, Sales Lead, CEO, Tech Lead)
- GoHighLevel CRM sync — pull contacts, push research results back
- Research prompt customization per organization
- Token and cost tracking per research run
- Multi-tenant organizations with role-based access control
- Usage credits and subscription tier management

## Stack

| Technology | Purpose |
|-----------|---------|
| React 18 + TypeScript | Frontend UI |
| Vite | Build tooling |
| Supabase (PostgreSQL + Auth + RLS) | Database, authentication, row-level security |
| Gemini API / OpenAI / Tavily / SERP API | AI research and content generation |
| GoHighLevel API | CRM integration |
| Vercel | Hosting and serverless functions |

## Getting Started

### Prerequisites

- Node.js 18+
- npm

### Setup

```bash
git clone https://github.com/heymervin/revify-outreach.git
cd revify-outreach
cp .env.example .env.local
npm install
npm run dev
```

### Environment Variables

| Variable | Description |
|----------|-------------|
| `VITE_SUPABASE_URL` | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Supabase anonymous key |
| `VITE_GHL_API_KEY` | GoHighLevel API key |

Additional API keys (Gemini, Tavily, SERP) are configured per-organization through the UI.

## Project Structure

```
src/
├── pages/         # Route-level page components
├── components/    # Shared UI components
├── features/      # Feature modules (research, outreach, orgs)
├── lib/           # API clients and utilities
├── types/         # TypeScript type definitions
└── data/          # Static data and constants
api/               # Serverless API routes
supabase/          # Database migrations and config
```
