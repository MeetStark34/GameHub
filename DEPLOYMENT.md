# GameHub Production Deployment Guide

## 1. Hosting Environment
GameHub is optimized for deployment on modern platforms such as Vercel, Supabase, or AWS/Cloudflare.

## 2. Environment Variables Required

| Variable | Description | Exposure |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase Project API URL | Public (Browser & Server) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase Anonymous Client Key | Public (Browser & Server) |
| `SUPABASE_SERVICE_ROLE_KEY` | Privileged Backend Service Role Key | **Private (Server Only)** |
| `NEXT_PUBLIC_APP_URL` | Canonical app domain URL | Public |

## 3. Database Migrations
All PostgreSQL migrations are stored in `/supabase/migrations/` and should be applied sequentially.

## 4. Build Command
```bash
npm run build
```
Production output is located in `.next/`.
