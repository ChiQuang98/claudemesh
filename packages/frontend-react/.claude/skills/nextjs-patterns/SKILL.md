---
name: nextjs-patterns
description: Next.js framework patterns and best practices. Use when building Next.js applications with App Router, Server Components, or implementing Next.js-specific features.
allowed-tools: Read, Write, Edit
user-invocable: true
---

# Next.js Patterns

## Overview
Production-ready patterns for Next.js 14+ with App Router, Server Components, and modern features.

## App Router Patterns

### Server Component Architecture
```tsx
// app/page.tsx - Server Component (default)
import { prisma } from '@/lib/prisma';
import Link from 'next/link';

export default async function HomePage() {
  // Direct database access
  const posts = await prisma.post.findMany({
    take: 10,
    orderBy: { createdAt: 'desc' }
  });

  return (
    <main>
      <h1>Latest Posts</h1>
      {posts.map(post => (
        <article key={post.id}>
          <Link href={`/blog/${post.slug}`}>
            <h2>{post.title}</h2>
          </Link>
          <p>{post.excerpt}</p>
        </article>
      ))}
    </main>
  );
}
```

### Hybrid Server/Client Pattern
```tsx
// Server Component
import LikeButton from './LikeButton';

export default async function PostPage({ params }: { params: { slug: string } }) {
  const post = await prisma.post.findUnique({
    where: { slug: params.slug }
  });

  if (!post) {
    notFound();
  }

  return (
    <article>
      <h1>{post.title}</h1>
      <p>{post.content}</p>
      <LikeButton postId={post.id} />
    </article>
  );
}

// Client Component (components/LikeButton.tsx)
'use client';

import { useState } from 'react';

export default function LikeButton({ postId }: { postId: string }) {
  const [likes, setLikes] = useState(0);

  return (
    <button onClick={() => setLikes(likes + 1)}>
      ❤️ {likes}
    </button>
  );
}
```

### Data Fetching Patterns

#### Static Generation (Default)
```tsx
// Built at build time, cached on CDN
export const revalidate = 3600; // Revalidate every hour

export default async function StaticPage() {
  const data = await fetch('https://api.example.com/data', {
    next: { revalidate: 3600 }
  }).then(r => r.json());

  return <div>{/* Render data */}</div>;
}
```

#### Dynamic Rendering
```tsx
// Force dynamic rendering
export const dynamic = 'force-dynamic';

export default async function DynamicPage() {
  const data = await fetch('https://api.example.com/data', {
    cache: 'no-store'
  }).then(r => r.json());

  return <div>{/* Render data */}</div>;
}
```

#### On-Demand Revalidation
```tsx
// app/actions/revalidate.ts
'use server';

import { revalidatePath } from 'next/cache';

export async function revalidatePost(slug: string) {
  revalidatePath(`/blog/${slug}`);
  revalidatePath('/blog'); // Also revalidate list page
}
```

## Server Actions Patterns

### Form Handling
```tsx
// app/actions.ts
'use server';

import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';

const schema = z.object({
  title: z.string().min(1).max(200),
  content: z.string().min(1),
  published: z.boolean().default(false)
});

export async function createPost(formData: FormData) {
  const validated = schema.parse({
    title: formData.get('title'),
    content: formData.get('content'),
    published: formData.get('published') === 'true'
  });

  const post = await prisma.post.create({
    data: validated
  });

  redirect(`/blog/${post.slug}`);
}
```

### Server Actions with UI Feedback
```tsx
'use client';

import { useActionState } from 'react';
import { createPost } from '@/app/actions';

export default function CreatePostForm() {
  const [state, formAction, isPending] = useActionState(createPost, null);

  return (
    <form action={formAction}>
      <input name="title" required />
      <textarea name="content" required />
      <button disabled={isPending}>
        {isPending ? 'Creating...' : 'Create Post'}
      </button>
      {state?.error && <div className="error">{state.error}</div>}
    </form>
  );
}
```

### Optimistic Updates
```tsx
'use client';

import { useOptimistic } from 'react';
import { likePost } from '@/app/actions';

export default function LikeButton({ postId, likes }: { postId: string; likes: number }) {
  const [optimisticLikes, addOptimisticLike] = useOptimistic(
    likes,
    (state, newLikes: number) => state + newLikes
  );

  return (
    <button
      onClick={async () => {
        addOptimisticLike(1);
        await likePost(postId);
      }}
    >
      ❤️ {optimisticLikes}
    </button>
  );
}
```

## Layout Patterns

### Root Layout
```tsx
// app/layout.tsx
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: {
    default: 'My App',
    template: '%s | My App'
  },
  description: 'Built with Next.js',
  openGraph: {
    title: 'My App',
    description: 'Built with Next.js',
    type: 'website'
  }
};

export default function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
```

### Nested Layouts
```tsx
// app/dashboard/layout.tsx
export default function DashboardLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="dashboard">
      <DashboardSidebar />
      <main>{children}</main>
    </div>
  );
}

// app/dashboard/settings/layout.tsx
export default function SettingsLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="settings">
      <SettingsNav />
      <div className="content">{children}</div>
    </div>
  );
}
```

### Route Groups
```
app/
├── (marketing)/
│   ├── layout.tsx      # Marketing layout
│   ├── about/
│   │   └── page.tsx    # /about
│   └── pricing/
│       └── page.tsx    # /pricing
├── (app)/
│   ├── layout.tsx      # App layout
│   ├── dashboard/
│   │   └── page.tsx    # /dashboard
│   └── settings/
│       └── page.tsx    # /settings
└── (auth)/
    ├── layout.tsx      # Auth layout
    ├── login/
    │   └── page.tsx    # /login
    └── register/
        └── page.tsx    # /register
```

## Error Handling Patterns

### Error Boundaries
```tsx
// app/error.tsx
'use client';

export default function Error({
  error,
  reset
}: {
  error: Error;
  reset: () => void;
}) {
  return (
    <div className="error-container">
      <h2>Something went wrong!</h2>
      <p>{error.message}</p>
      <button onClick={reset}>Try again</button>
    </div>
  );
}
```

### Global Error Handler
```tsx
// app/global-error.tsx
'use client';

export default function GlobalError({
  error,
  reset
}: {
  error: Error;
  reset: () => void;
}) {
  return (
    <html>
      <body>
        <h2>Application error</h2>
        <button onClick={reset}>Try again</button>
      </body>
    </html>
  );
}
```

### notFound() Function
```tsx
// app/blog/[slug]/page.tsx
import { notFound } from 'next/navigation';

export default async function BlogPost({ params }: { params: { slug: string } }) {
  const post = await prisma.post.findUnique({
    where: { slug: params.slug }
  });

  if (!post) {
    notFound();
  }

  return <article>{post.content}</article>;
}
```

## Loading Patterns

### Loading UI
```tsx
// app/blog/loading.tsx
export default function Loading() {
  return (
    <div className="animate-pulse">
      <div className="h-8 bg-gray-200 w-3/4 mb-4"></div>
      <div className="h-4 bg-gray-200 w-full mb-2"></div>
      <div className="h-4 bg-gray-200 w-5/6"></div>
    </div>
  );
}
```

### Suspense Boundaries
```tsx
// app/dashboard/page.tsx
import { Suspense } from 'react';

export default async function DashboardPage() {
  return (
    <div>
      <h1>Dashboard</h1>
      <Suspense fallback={<StatsSkeleton />}>
        <DashboardStats />
      </Suspense>
      <Suspense fallback={<ChartSkeleton />}>
        <RevenueChart />
      </Suspense>
    </div>
  );
}
```

## Streaming Patterns

### Incremental Static Regeneration (ISR)
```tsx
// Revalidate every 60 seconds
export const revalidate = 60;

export default async function ProductsPage() {
  const products = await prisma.product.findMany();

  return (
    <div>
      {products.map(product => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  );
}
```

### Streaming with Suspense
```tsx
async function SlowComponent() {
  await new Promise(resolve => setTimeout(resolve, 3000));
  return <div>I'm slow!</div>;
}

export default function Page() {
  return (
    <div>
      <div>I load immediately</div>
      <Suspense fallback={<div>Loading slow component...</div>}>
        <SlowComponent />
      </Suspense>
    </div>
  );
}
```

## API Route Patterns

### RESTful API
```tsx
// app/api/posts/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const schema = z.object({
  title: z.string().min(1),
  content: z.string().min(1)
});

// GET /api/posts
export async function GET() {
  const posts = await prisma.post.findMany();
  return NextResponse.json(posts);
}

// POST /api/posts
export async function POST(request: NextRequest) {
  const body = await request.json();
  const validated = schema.parse(body);

  const post = await prisma.post.create({
    data: validated
  });

  return NextResponse.json(post, { status: 201 });
}
```

### Dynamic API Routes
```tsx
// app/api/posts/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/posts/:id
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const post = await prisma.post.findUnique({
    where: { id: params.id }
  });

  if (!post) {
    return NextResponse.json(
      { error: 'Post not found' },
      { status: 404 }
    );
  }

  return NextResponse.json(post);
}

// DELETE /api/posts/:id
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  await prisma.post.delete({
    where: { id: params.id }
  });

  return NextResponse.json({ success: true });
}
```

## Authentication Patterns

### Middleware Protection
```tsx
// middleware.ts
import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';

export function middleware(request: NextRequest) {
  const token = request.cookies.get('token')?.value;

  if (!token || !verifyToken(token)) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*', '/api/protected/:path*']
};
```

### Server Component Auth Check
```tsx
// app/dashboard/page.tsx
import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';

export default async function DashboardPage() {
  const session = await getServerSession();

  if (!session) {
    redirect('/login');
  }

  return (
    <div>
      <h1>Welcome, {session.user?.name}</h1>
    </div>
  );
}
```

## Metadata Patterns

### Static Metadata
```tsx
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Blog',
  description: 'Read our latest posts',
  keywords: ['blog', 'posts', 'articles'],
  openGraph: {
    title: 'Blog',
    description: 'Read our latest posts',
    type: 'website',
    images: ['/og-image.jpg']
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Blog',
    description: 'Read our latest posts',
    images: ['/og-image.jpg']
  }
};

export default function BlogPage() {
  return <div>Blog content</div>;
}
```

### Dynamic Metadata
```tsx
import { Metadata } from 'next';

interface PageProps {
  params: { slug: string };
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const post = await prisma.post.findUnique({
    where: { slug: params.slug }
  });

  return {
    title: post?.title,
    description: post?.excerpt,
    openGraph: {
      title: post?.title,
      description: post?.excerpt,
      images: [post?.coverImage || '/default-og.jpg']
    }
  };
}

export default async function BlogPost({ params }: PageProps) {
  const post = await prisma.post.findUnique({
    where: { slug: params.slug }
  });

  return <article>{post?.content}</article>;
}
```

## Performance Patterns

### Dynamic Imports
```tsx
// Client-side only component
const HeavyChart = dynamic(() => import('@/components/HeavyChart'), {
  loading: () => <div>Loading chart...</div>,
  ssr: false
});

// Lazy load admin panel
const AdminPanel = dynamic(() => import('@/components/AdminPanel'), {
  loading: () => <AdminPanelSkeleton />
});

export default function Dashboard() {
  return (
    <div>
      <AdminPanel />
      <HeavyChart />
    </div>
  );
}
```

### Image Optimization
```tsx
import Image from 'next/image';

export default function HeroSection() {
  return (
    <div className="hero">
      <Image
        src="/hero.jpg"
        alt="Hero"
        width={1920}
        height={1080}
        priority  // Above the fold
        placeholder="blur"
        sizes="100vw"
        quality={90}
      />
    </div>
  );
}
```

### Font Optimization
```tsx
import { Inter, Playfair_Display } from 'next/font/google';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap'
});

const playfair = Playfair_Display({
  subsets: ['latin'],
  variable: '--font-playfair',
  weight: ['400', '700']
});

export default function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <html className={`${inter.variable} ${playfair.variable}`}>
      <body>{children}</body>
    </html>
  );
}
```

## Testing Patterns

### Testing Server Actions
```tsx
// app/actions/__tests__/createPost.test.ts
import { createPost } from '../createPost';
import { prisma } from '@/lib/prisma';

jest.mock('@/lib/prisma');

describe('createPost', () => {
  it('creates a new post', async () => {
    const mockPost = { id: '1', title: 'Test', content: 'Content' };
    (prisma.post.create as jest.Mock).mockResolvedValue(mockPost);

    const formData = new FormData();
    formData.set('title', 'Test');
    formData.set('content', 'Content');

    const result = await createPost(formData);

    expect(result).toEqual(mockPost);
  });
});
```

### Testing Server Components
```tsx
// Use integration testing for Server Components
// e2e/playwright/blog.spec.ts
import { test, expect } from '@playwright/test';

test('displays blog posts', async ({ page }) => {
  await page.goto('/blog');
  await expect(page.locator('h1')).toContainText('Blog');
  await expect(page.locator('article')).toHaveCountGreaterThan(0);
});
```

## Best Practices

### ✅ DO:
- Use Server Components by default
- Only use 'use client' when necessary
- Implement proper error boundaries
- Use loading.tsx for better UX
- Implement ISR for dynamic content
- Optimize images with next/image
- Use TypeScript throughout
- Implement proper caching strategies
- Use Server Actions for mutations
- Protect routes with middleware

### ❌ DON'T:
- Use 'use client' unnecessarily
- Fetch in useEffect when you can fetch in Server Component
- Ignore error handling
- Skip loading states
- Use Pages Router for new projects
- Forget to optimize images
- Ignore TypeScript
- Skip caching
- Use client-side state for server data
- Forget about SEO
