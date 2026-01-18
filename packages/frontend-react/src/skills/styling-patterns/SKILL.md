---
name: styling-patterns
description: React and Next.js styling patterns including CSS-in-JS, Tailwind CSS, CSS Modules, and modern styling approaches.
allowed-tools: Read, Write, Edit
user-invocable: true
---

# Styling Patterns

## Overview
Modern styling approaches for React and Next.js applications.

## Tailwind CSS Patterns

### Utility-First Approach
```tsx
// Responsive design
function Card() {
  return (
    <div className="max-w-md mx-auto bg-white rounded-xl shadow-md overflow-hidden md:max-w-2xl">
      <div className="md:flex">
        <div className="md:shrink-0">
          <img className="h-48 w-full object-cover md:h-full md:w-48" src="/img.jpg" alt="Image" />
        </div>
        <div className="p-8">
          <div className="uppercase tracking-wide text-sm text-indigo-500 font-semibold">
            Case study
          </div>
          <h3 className="block mt-1 text-lg leading-tight font-medium text-black">
            Title
          </h3>
          <p className="mt-2 text-slate-500">
            Description text here.
          </p>
        </div>
      </div>
    </div>
  );
}
```

### Dynamic Classes
```tsx
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

// clsx for conditional classes
function Button({ variant, isLoading }: ButtonProps) {
  return (
    <button
      className={clsx(
        'px-4 py-2 rounded font-medium',
        variant === 'primary' && 'bg-blue-600 text-white',
        variant === 'secondary' && 'bg-gray-200 text-gray-800',
        isLoading && 'opacity-50 cursor-not-allowed'
      )}
    >
      {isLoading ? 'Loading...' : 'Click me'}
    </button>
  );
}

// tailwind-merge for merging Tailwind classes
function Panel({ className, ...props }: PanelProps) {
  return (
    <div
      className={twMerge(
        'bg-white rounded-lg shadow p-6',
        className  // Overrides conflicting classes
      )}
      {...props}
    />
  );
}
```

### Component Libraries with Tailwind
```tsx
// components/ui/button.tsx
import { cva, type VariantProps } from 'class-variance-authority';

const buttonVariants = cva(
  'inline-flex items-center justify-center rounded-md font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
  {
    variants: {
      variant: {
        default: 'bg-slate-900 text-white hover:bg-slate-800',
        destructive: 'bg-red-600 text-white hover:bg-red-700',
        outline: 'border border-slate-200 bg-white hover:bg-slate-100',
        ghost: 'hover:bg-slate-100',
        link: 'text-slate-900 underline-offset-4 hover:underline'
      },
      size: {
        default: 'h-10 px-4 py-2',
        sm: 'h-9 px-3 text-sm',
        lg: 'h-11 px-8',
        icon: 'h-10 w-10'
      }
    },
    defaultVariants: {
      variant: 'default',
      size: 'default'
    }
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

export function Button({ className, variant, size, ...props }: ButtonProps) {
  return (
    <button className={cn(buttonVariants({ variant, size, className }))} {...props} />
  );
}

// Usage
<Button variant="destructive" size="sm">Delete</Button>
<Button variant="outline" size="lg">Cancel</Button>
```

### Dark Mode
```tsx
// app/providers.tsx
import { ThemeProvider } from 'next-themes';

export function Providers({ children }: { children: React.ReactNode }) {
  return <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
    {children}
  </ThemeProvider>;
}

// app/components/Header.tsx
'use client';

import { useTheme } from 'next-themes';

function Header() {
  const { theme, setTheme } = useTheme();

  return (
    <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
      <nav className="flex items-center justify-between px-4 py-3">
        <h1 className="text-slate-900 dark:text-white">Logo</h1>
        <button
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          className="p-2 rounded hover:bg-slate-100 dark:hover:bg-slate-800"
        >
          {theme === 'dark' ? '☀️' : '🌙'}
        </button>
      </nav>
    </header>
  );
}
```

## CSS Modules

### Basic Usage
```tsx
// components/Card.module.css
.card {
  background-color: white;
  border-radius: 8px;
  padding: 1.5rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.card__title {
  font-size: 1.5rem;
  font-weight: 600;
  margin-bottom: 0.5rem;
}

.card__description {
  color: #64748b;
  line-height: 1.6;
}

// components/Card.tsx
import styles from './Card.module.css';

function Card({ title, description }: CardProps) {
  return (
    <div className={styles.card}>
      <h2 className={styles.card__title}>{title}</h2>
      <p className={styles.card__description}>{description}</p>
    </div>
  );
}
```

### CSS Modules with Composition
```tsx
// utils.module.css
.container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 1rem;
}

.flex {
  display: flex;
}

.flexCenter {
  composes: flex;
  justify-content: center;
  align-items: center;
}

// Usage
import styles from './utils.module.css';

function CenteredContainer({ children }: { children: React.ReactNode }) {
  return <div className={styles.flexCenter}>{children}</div>;
}
```

## CSS-in-JS (Styled-Components)

### Basic Patterns
```tsx
import styled from 'styled-components';

const StyledButton = styled.button<{ variant: 'primary' | 'secondary' }>`
  padding: 0.75rem 1.5rem;
  border-radius: 0.5rem;
  font-weight: 600;
  border: none;
  cursor: pointer;
  transition: all 0.2s;

  ${(props) => ({
    backgroundColor: props.variant === 'primary' ? '#3b82f6' : '#e5e7eb',
    color: props.variant === 'primary' ? '#ffffff' : '#1f2937'
  })}

  &:hover {
    opacity: 0.9;
    transform: translateY(-1px);
  }

  &:active {
    transform: translateY(0);
  }
`;

// Usage
function Form() {
  return (
    <>
      <StyledButton variant="primary">Submit</StyledButton>
      <StyledButton variant="secondary">Cancel</StyledButton>
    </>
  );
}
```

### Theme Support
```tsx
import styled, { ThemeProvider } from 'styled-components';

const theme = {
  colors: {
    primary: '#3b82f6',
    secondary: '#8b5cf6',
    success: '#10b981',
    danger: '#ef4444',
    background: '#ffffff',
    text: '#1f2937'
  },
  spacing: {
    xs: '0.25rem',
    sm: '0.5rem',
    md: '1rem',
    lg: '1.5rem',
    xl: '2rem'
  }
};

const StyledCard = styled.div`
  background-color: ${(props) => props.theme.colors.background};
  color: ${(props) => props.theme.colors.text};
  padding: ${(props) => props.theme.spacing.lg};
  border-radius: 0.5rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
`;

// Usage
function App() {
  return (
    <ThemeProvider theme={theme}>
      <StyledCard>Card content</StyledCard>
    </ThemeProvider>
  );
}
```

### Global Styles
```tsx
import { createGlobalStyle } from 'styled-components';

const GlobalStyle = createGlobalStyle`
  * {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
  }

  body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
    line-height: 1.6;
    color: #1f2937;
    background-color: #ffffff;
  }

  h1, h2, h3, h4, h5, h6 {
    line-height: 1.2;
    font-weight: 600;
  }
`;

function App() {
  return (
    <>
      <GlobalStyle />
      <MainContent />
    </>
  );
}
```

## Emotion

### CSS Prop Pattern
```tsx
/** @jsxImportSource @emotion/react */
import { css } from '@emotion/react';

const buttonStyle = css`
  padding: 0.75rem 1.5rem;
  border-radius: 0.5rem;
  font-weight: 600;
  border: none;
  cursor: pointer;
  background-color: #3b82f6;
  color: white;
  &:hover {
    opacity: 0.9;
  }
`;

function Button({ children }: { children: React.ReactNode }) {
  return <button css={buttonStyle}>{children}</button>;
}
```

### Styled Components with Emotion
```tsx
/** @jsxImportSource @emotion/react */
import styled from '@emotion/styled';

const Card = styled.div<{ variant?: 'primary' | 'secondary' }>`
  background: white;
  padding: 1.5rem;
  border-radius: 0.5rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);

  ${(props) =>
    props.variant === 'primary' &&
    `
      border: 2px solid #3b82f6;
    `}

  ${(props) =>
    props.variant === 'secondary' &&
    `
      border: 2px solid #8b5cf6;
    `}
`;
```

## Vanilla Extract

### Type-Safe CSS
```tsx
// styles.css.ts
import { style, globalStyle } from '@vanilla-extract/css';

export const card = style({
  background: 'white',
  padding: '1.5rem',
  borderRadius: '0.5rem',
  boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
});

export const title = style({
  fontSize: '1.5rem',
  fontWeight: 600,
  marginBottom: '0.5rem'
});

export const description = style({
  color: '#64748b',
  lineHeight: 1.6
});

globalStyle('body', {
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  margin: 0,
  padding: 0
});

// Usage
import { card, title, description } from './styles.css';

function Card({ title: cardTitle, description: cardDescription }: CardProps) {
  return (
    <div className={card}>
      <h2 className={title}>{cardTitle}</h2>
      <p className={description}>{cardDescription}</p>
    </div>
  );
}
```

### Responsive Variants
```tsx
// styles.css.ts
import { style, createVar } from '@vanilla-extract/css';

const gap = createVar();

export const container = style({
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
  gap: gap,
  '@media': {
    '(max-width: 768px)': {
      gap: '1rem',
      gridTemplateColumns: '1fr'
    }
  }
});

export const card = style({
  padding: '1.5rem',
  gap: gap,
  vars: {
    [gap]: '1.5rem'
  }
});
```

## Responsive Design Patterns

### Container Queries (Modern Approach)
```tsx
// Card with container queries
function Card() {
  return (
    <div className="@container">
      <div className="grid @md:grid-cols-2 @lg:grid-cols-3">
        <div className="@md:bg-slate-50 @lg:bg-slate-100">
          Content that adapts to container
        </div>
      </div>
    </div>
  );
}
```

### Breakpoint Prefixes
```tsx
// Tailwind responsive prefixes
function ResponsiveComponent() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      {/* 1 col on mobile, 2 on small, 3 on medium, 4 on large */}
      {items.map(item => <Card key={item.id} item={item} />)}
    </div>
  );
}
```

### Hide on Breakpoint
```tsx
function ConditionalDisplay() {
  return (
    <>
      <div className="hidden md:block">Desktop only</div>
      <div className="block md:hidden">Mobile only</div>
    </>
  );
}
```

## Animation Patterns

### Tailwind Animations
```tsx
function Spinner() {
  return (
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
  );
}

function Pulse() {
  return (
    <div className="animate-pulse bg-slate-200 h-4 w-full rounded" />
  );
}

function Bounce() {
  return (
    <div className="animate-bounce">
      <svg>↓</svg>
    </div>
  );
}
```

### Custom Animations
```tsx
// tailwind.config.js
module.exports = {
  theme: {
    extend: {
      keyframes: {
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' }
        },
        'slide-up': {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' }
        }
      },
      animation: {
        'fade-in': 'fade-in 0.3s ease-out',
        'slide-up': 'slide-up 0.3s ease-out'
      }
    }
  }
};

// Usage
function AnimatedCard() {
  return (
    <div className="animate-fade-in animate-slide-up">
      Content with animation
    </div>
  );
}
```

### Framer Motion
```tsx
import { motion, AnimatePresence } from 'framer-motion';

function Modal({ isOpen, onClose }: ModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/50 flex items-center justify-center"
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="bg-white rounded-lg p-6"
            onClick={(e) => e.stopPropagation()}
          >
            Modal content
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
```

## Theme Patterns

### CSS Custom Properties
```tsx
// globals.css
:root {
  --color-primary: #3b82f6;
  --color-secondary: #8b5cf6;
  --color-background: #ffffff;
  --color-text: #1f2937;
  --spacing-unit: 0.25rem;
}

[data-theme='dark'] {
  --color-primary: #60a5fa;
  --color-secondary: #a78bfa;
  --color-background: #1f2937;
  --color-text: #f9fafb;
}

// Usage
function ThemedCard() {
  return (
    <div
      style={{
        backgroundColor: 'var(--color-background)',
        color: 'var(--color-text)',
        padding: 'calc(4 * var(--spacing-unit))'
      }}
    >
      Content
    </div>
  );
}
```

### Theme Provider
```tsx
// contexts/ThemeContext.tsx
interface Theme {
  colors: {
    primary: string;
    secondary: string;
    background: string;
    text: string;
  };
  spacing: {
    xs: string;
    sm: string;
    md: string;
    lg: string;
  };
}

const lightTheme: Theme = {
  colors: {
    primary: '#3b82f6',
    secondary: '#8b5cf6',
    background: '#ffffff',
    text: '#1f2937'
  },
  spacing: {
    xs: '0.25rem',
    sm: '0.5rem',
    md: '1rem',
    lg: '1.5rem'
  }
};

const darkTheme: Theme = {
  colors: {
    primary: '#60a5fa',
    secondary: '#a78bfa',
    background: '#1f2937',
    text: '#f9fafb'
  },
  spacing: {
    xs: '0.25rem',
    sm: '0.5rem',
    md: '1rem',
    lg: '1.5rem'
  }
};

const ThemeContext = createContext<{ theme: Theme; toggleTheme: () => void }>({
  theme: lightTheme,
  toggleTheme: () => {}
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [isDark, setIsDark] = useState(false);

  const toggleTheme = () => setIsDark(!isDark);

  return (
    <ThemeContext.Provider value={{ theme: isDark ? darkTheme : lightTheme, toggleTheme }}>
      <div style={{ backgroundColor: isDark ? darkTheme.colors.background : lightTheme.colors.background }}>
        {children}
      </div>
    </ThemeContext.Provider>
  );
}
```

## Best Practices

### ✅ DO:
- Use utility-first CSS (Tailwind) for most cases
- Extract reusable component classes
- Use CSS Modules for component-specific styles
- Implement dark mode support
- Use responsive design from mobile-first
- Optimize critical CSS
- Use CSS-in-JS sparingly (performance impact)
- Consider CSS containment for isolation
- Use CSS custom properties for theming
- Implement proper focus states for accessibility

### ❌ DON'T:
- Inline styles (except dynamic values)
- Over-nest selectors
- Use !important (rare exceptions)
- Ignore mobile-first approach
- Create large CSS bundles
- Mix styling approaches excessively
- Skip accessibility considerations
- Ignore performance impact
- Use arbitrary values everywhere
- Forget about browser support
