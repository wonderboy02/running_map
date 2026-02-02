# Runner's Spot - Project Overview

## Purpose
Mobile-first web app for runners to find locations (locker rooms, showers, changing rooms, etc.) displayed on a Naver Map.

## Tech Stack
- **Framework**: Next.js 15 (App Router) with TypeScript
- **Database**: Supabase (PostgreSQL + Auth)
- **Styling**: Tailwind CSS v4 (CSS-based config, no tailwind.config.ts)
- **Map**: Naver Map JavaScript API v3 (NCP)
- **Deployment**: Vercel

## Path Aliases
- `@/*` → `./src/*`

## Key Directories
- `src/app/` - Next.js App Router pages
- `src/components/` - Shared components (Map/, ui/)
- `src/hooks/` - Custom hooks
- `src/lib/supabase/` - Supabase client/server
- `src/types/` - TypeScript types
- `src/styles/` - Global styles
- `supabase/migrations/` - DB migrations
