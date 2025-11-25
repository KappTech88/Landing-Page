# Next.js Migration Plan - Vite/React → Next.js 14

## Overview

**Current Stack**: Vite + React 19 + TypeScript
**Target Stack**: Next.js 14 (App Router) + React 19 + TypeScript + Supabase

**Estimated Effort**: 2-3 days of focused work

---

## Phase 1: Setup Next.js Project (2-3 hours)

### 1.1 Create Next.js Project

```bash
# Create Next.js 14 app in new directory
npx create-next-app@latest estimate-reliance-nextjs --typescript --tailwind --app --src-dir

# Or migrate in place:
cd /home/user/Landing-Page

# Backup current code
git branch backup/vite-version

# Initialize Next.js config
npm install next@14 react@19 react-dom@19
```

### 1.2 Update package.json

```json
{
  "name": "estimate-reliance",
  "version": "1.0.0",
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint"
  },
  "dependencies": {
    "next": "^14.2.0",
    "react": "^19.2.0",
    "react-dom": "^19.2.0",
    "@supabase/supabase-js": "^2.39.0",
    "@supabase/ssr": "^0.0.10",
    "@google/genai": "^1.30.0",
    "lucide-react": "^0.554.0"
  },
  "devDependencies": {
    "@types/node": "^22.14.0",
    "@types/react": "^18.2.0",
    "typescript": "^5.8.2",
    "tailwindcss": "^3.4.0",
    "autoprefixer": "^10.4.17",
    "postcss": "^8.4.33"
  }
}
```

### 1.3 Create Next.js Structure

```
/app
  /layout.tsx          # Root layout
  /page.tsx            # Home page (current landing)
  /labs
    /page.tsx          # Labs page
  /claim-submission
    /page.tsx          # Claim submission
  /portal
    /login
      /page.tsx        # Portal login
    /dashboard
      /page.tsx        # Dashboard (after auth)
  /api
    /auth
      /[...nextauth]/route.ts  # Auth routes
    /claims
      /route.ts        # Claims API
    /estimates
      /route.ts        # Estimates API

/components           # Migrate existing components here
  /ClaimSubmission.tsx
  /ImageHealer.tsx
  /Labs.tsx
  /MemoryAnimator.tsx
  /PortalLogin.tsx
  /StarField.tsx

/lib
  /supabase.ts        # Supabase client
  /supabase-server.ts # Server-side Supabase
  /database.types.ts  # Generated types

/middleware.ts        # Auth middleware

/public              # Static assets
  /images
  /fonts
```

---

## Phase 2: Migrate Components (4-6 hours)

### 2.1 Convert Pages to App Router

**Landing Page** (`App.tsx` → `app/page.tsx`):

```typescript
// app/page.tsx
import { StarField } from '@/components/StarField'
import { MemoryAnimator } from '@/components/MemoryAnimator'

export default function Home() {
  return (
    <main className="relative min-h-screen">
      <StarField />
      <MemoryAnimator />
      {/* Rest of landing page content */}
    </main>
  )
}
```

**Labs Page** (`app/labs/page.tsx`):

```typescript
import { Labs } from '@/components/Labs'

export default function LabsPage() {
  return <Labs />
}
```

### 2.2 Update Component Imports

Change:
```typescript
import Component from './Component'
```

To:
```typescript
import { Component } from '@/components/Component'
```

### 2.3 Handle Client Components

Add `'use client'` directive to components using:
- `useState`, `useEffect`
- Event handlers (`onClick`, etc.)
- Browser APIs

```typescript
'use client'

import { useState } from 'react'

export function ClaimSubmission() {
  const [formData, setFormData] = useState({})
  // ... rest of component
}
```

---

## Phase 3: Supabase Integration (3-4 hours)

### 3.1 Install Supabase Dependencies

```bash
npm install @supabase/supabase-js @supabase/ssr
```

### 3.2 Create Supabase Client

**Client-side** (`lib/supabase.ts`):

```typescript
import { createBrowserClient } from '@supabase/ssr'
import { Database } from '@/lib/database.types'

export const supabase = createBrowserClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)
```

**Server-side** (`lib/supabase-server.ts`):

```typescript
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { Database } from '@/lib/database.types'

export async function createClient() {
  const cookieStore = cookies()

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
      },
    }
  )
}
```

### 3.3 Auth Middleware

```typescript
// middleware.ts
import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  const response = NextResponse.next()

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set(name: string, value: string, options) {
          response.cookies.set({ name, value, ...options })
        },
        remove(name: string, options) {
          response.cookies.set({ name, value: '', ...options })
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  // Redirect to login if not authenticated
  if (!user && request.nextUrl.pathname.startsWith('/portal/dashboard')) {
    return NextResponse.redirect(new URL('/portal/login', request.url))
  }

  return response
}

export const config = {
  matcher: ['/portal/dashboard/:path*', '/api/:path*'],
}
```

---

## Phase 4: API Routes (2-3 hours)

### 4.1 Claims API

```typescript
// app/api/claims/route.ts
import { createClient } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const supabase = await createClient()

  const { data: claims, error } = await supabase
    .from('claims')
    .select(`
      *,
      properties (*),
      estimates (*)
    `)
    .order('created_at', { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ claims })
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const body = await request.json()

  // Insert claim
  const { data: claim, error: claimError } = await supabase
    .from('claims')
    .insert({
      organization_id: body.organization_id,
      claim_number: body.claim_number,
      date_of_loss: body.date_of_loss,
      claim_type: body.claim_type,
      description: body.description,
    })
    .select()
    .single()

  if (claimError) {
    return NextResponse.json({ error: claimError.message }, { status: 500 })
  }

  // Insert property
  const { error: propertyError } = await supabase
    .from('properties')
    .insert({
      claim_id: claim.id,
      organization_id: body.organization_id,
      address_line1: body.address_line1,
      city: body.city,
      state: body.state,
      zip_code: body.zip_code,
      owner_first_name: body.owner_first_name,
      owner_last_name: body.owner_last_name,
      owner_email: body.owner_email,
      owner_phone: body.owner_phone,
    })

  if (propertyError) {
    return NextResponse.json({ error: propertyError.message }, { status: 500 })
  }

  return NextResponse.json({ claim }, { status: 201 })
}
```

### 4.2 File Upload API

```typescript
// app/api/upload/route.ts
import { createClient } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const supabase = await createClient()
  const formData = await request.formData()
  const file = formData.get('file') as File
  const claimId = formData.get('claimId') as string

  if (!file || !claimId) {
    return NextResponse.json({ error: 'Missing file or claimId' }, { status: 400 })
  }

  // Upload to Supabase Storage
  const fileName = `${Date.now()}_${file.name}`
  const storagePath = `claims/${claimId}/${fileName}`

  const { error: uploadError } = await supabase.storage
    .from('claim-photos')
    .upload(storagePath, file)

  if (uploadError) {
    return NextResponse.json({ error: uploadError.message }, { status: 500 })
  }

  // Get public URL
  const { data: { publicUrl } } = supabase.storage
    .from('claim-photos')
    .getPublicUrl(storagePath)

  // Insert photo record
  const { data: photo, error: photoError } = await supabase
    .from('photos')
    .insert({
      claim_id: claimId,
      storage_path: storagePath,
      public_url: publicUrl,
      file_name: fileName,
      category: 'damage',
    })
    .select()
    .single()

  if (photoError) {
    return NextResponse.json({ error: photoError.message }, { status: 500 })
  }

  return NextResponse.json({ photo })
}
```

---

## Phase 5: Authentication (2-3 hours)

### 5.1 Login Page

```typescript
// app/portal/login/page.tsx
'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      alert(error.message)
      setLoading(false)
      return
    }

    router.push('/portal/dashboard')
  }

  return (
    <form onSubmit={handleLogin}>
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Email"
        required
      />
      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Password"
        required
      />
      <button type="submit" disabled={loading}>
        {loading ? 'Loading...' : 'Login'}
      </button>
    </form>
  )
}
```

### 5.2 Google OAuth (for Workspace Integration)

```typescript
// app/api/auth/google/route.ts
import { createClient } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const supabase = await createClient()
  const { searchParams } = new URL(request.url)
  const redirectTo = searchParams.get('redirectTo') || '/portal/dashboard'

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/api/auth/callback?redirectTo=${redirectTo}`,
      scopes: 'https://www.googleapis.com/auth/gmail.send',
    },
  })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.redirect(data.url)
}
```

---

## Phase 6: Testing & Deployment (2-3 hours)

### 6.1 Local Testing

```bash
# Run development server
npm run dev

# Test pages:
# - http://localhost:3000 (landing)
# - http://localhost:3000/labs
# - http://localhost:3000/claim-submission
# - http://localhost:3000/portal/login
```

### 6.2 Vercel Deployment

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel --prod

# Set environment variables in Vercel dashboard
```

### 6.3 Environment Variables Checklist

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
NEXT_PUBLIC_SITE_URL=
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
```

---

## Migration Checklist

### Pre-Migration
- [ ] Backup current Vite codebase
- [ ] Document current features
- [ ] Set up Supabase project
- [ ] Generate database types

### Phase 1: Setup
- [ ] Create Next.js project structure
- [ ] Update package.json
- [ ] Configure next.config.js
- [ ] Set up TypeScript config

### Phase 2: Components
- [ ] Migrate StarField component
- [ ] Migrate MemoryAnimator
- [ ] Migrate ClaimSubmission form
- [ ] Migrate Labs components
- [ ] Migrate PortalLogin
- [ ] Add 'use client' where needed

### Phase 3: Supabase
- [ ] Create Supabase clients
- [ ] Set up auth middleware
- [ ] Generate types from schema
- [ ] Test database connection

### Phase 4: API Routes
- [ ] Claims CRUD routes
- [ ] Estimates routes
- [ ] File upload route
- [ ] Auth callback route

### Phase 5: Auth
- [ ] Login page
- [ ] Signup page
- [ ] Google OAuth setup
- [ ] Protected routes

### Phase 6: Deployment
- [ ] Test locally
- [ ] Deploy to Vercel
- [ ] Set environment variables
- [ ] Test production build
- [ ] Update DNS (if needed)

---

## Rollback Plan

If migration fails:

```bash
# Restore Vite version
git checkout backup/vite-version

# Redeploy to Vercel
vercel --prod
```

---

## Post-Migration Tasks

1. Update README.md with new setup instructions
2. Update .env.example with required variables
3. Create migration guide for team
4. Test all features in production
5. Monitor error logs
6. Set up database backups

---

**Total Estimated Time**: 15-20 hours of focused work
