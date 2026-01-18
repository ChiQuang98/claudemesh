---
name: express-patterns
description: Express.js best practices and common patterns. Use when working with Express applications.
allowed-tools: Read, Write, Edit
user-invocable: true
---

# Express.js Patterns

## Overview
Best practices and common patterns for building Express.js applications.

## Project Structure

```
src/
├── routes/
│   ├── users.ts
│   ├── auth.ts
│   └── index.ts
├── middleware/
│   ├── auth.ts
│   ├── errorHandler.ts
│   └── validation.ts
├── controllers/
│   ├── userController.ts
│   └── authController.ts
├── models/
├── services/
└── app.ts
```

## Router Patterns

### Basic Router
```typescript
// routes/users.ts
import { Router } from 'express';
import { userController } from '../controllers/userController';
import { authenticate } from '../middleware/auth';

const router = Router();

router.get('/', userController.getAll);
router.get('/:id', userController.getById);
router.post('/', authenticate, userController.create);
router.put('/:id', authenticate, userController.update);
router.delete('/:id', authenticate, userController.delete);

export default router;
```

### Versioned Routes
```typescript
// routes/index.ts
import express from 'express';
import v1Routes from './v1';
import v2Routes from './v2';

const router = express.Router();

router.use('/v1', v1Routes);
router.use('/v2', v2Routes);

export default router;
```

## Middleware Patterns

### Authentication Middleware
```typescript
// middleware/auth.ts
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export interface AuthRequest extends Request {
  user?: { id: string; email: string };
}

export const authenticate = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as {
      id: string;
      email: string;
    };

    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
};
```

### Validation Middleware (using Zod)
```typescript
// middleware/validation.ts
import { Request, Response, NextFunction } from 'express';
import { AnyZodObject, ZodError } from 'zod';

export const validate = (schema: AnyZodObject) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      await schema.parseAsync({
        body: req.body,
        query: req.query,
        params: req.params,
      });
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(422).json({
          error: 'Validation failed',
          details: error.errors,
        });
      }
      next(error);
    }
  };
};
```

### Error Handler Middleware
```typescript
// middleware/errorHandler.ts
import { Request, Response, NextFunction } from 'express';

export class AppError extends Error {
  constructor(
    public statusCode: number,
    public message: string,
    public isOperational = true
  ) {
    super(message);
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      error: err.message,
    });
  }

  // Log unexpected errors
  console.error('Unexpected error:', err);

  // Don't leak error details in production
  const message = process.env.NODE_ENV === 'production'
    ? 'Internal server error'
    : err.message;

  res.status(500).json({ error: message });
};
```

## Controller Patterns

### Async Controller
```typescript
// controllers/userController.ts
import { Request, Response, NextFunction } from 'express';
import { userService } from '../services/userService';
import { AppError } from '../middleware/errorHandler';

// Wrapper to catch async errors
const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

export const userController = {
  getAll: asyncHandler(async (req: Request, res: Response) => {
    const users = await userService.findAll();
    res.json({ data: users });
  }),

  getById: asyncHandler(async (req: Request, res: Response) => {
    const user = await userService.findById(req.params.id);

    if (!user) {
      throw new AppError(404, 'User not found');
    }

    res.json({ data: user });
  }),

  create: asyncHandler(async (req: Request, res: Response) => {
    const user = await userService.create(req.body);
    res.status(201).json({ data: user });
  }),
};
```

## Application Setup

### app.ts
```typescript
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import morgan from 'morgan';
import routes from './routes';
import { errorHandler } from './middleware/errorHandler';

const app = express();

// Security middleware
app.use(helmet());

// CORS
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(','),
  credentials: true,
}));

// Logging
app.use(morgan('combined'));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api', routes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Error handler (must be last)
app.use(errorHandler);

export default app;
```

## Best Practices

1. **Separation of Concerns**
   - Controllers handle HTTP
   - Services contain business logic
   - Models define data structure
   - Middleware handles cross-cutting concerns

2. **Error Handling**
   - Use centralized error handler
   - Create custom error classes
   - Don't expose stack traces in production
   - Log errors appropriately

3. **Validation**
   - Validate at API boundary
   - Use schema validation libraries (Zod, Joi)
   - Return detailed validation errors
   - Validate all user input

4. **Security**
   - Use helmet for security headers
   - Implement rate limiting
   - Sanitize user input
   - Use CORS appropriately
   - Keep dependencies updated

5. **Performance**
   - Use compression middleware
   - Implement caching where appropriate
   - Use connection pooling for databases
   - Monitor performance metrics

## Anti-Patterns

❌ **Don't put business logic in routes**
```typescript
// BAD
router.post('/users', async (req, res) => {
  const hashedPassword = await bcrypt.hash(req.body.password, 10);
  const user = await db.users.create({ ...req.body, password: hashedPassword });
  res.json(user);
});
```

✅ **Do use service layer**
```typescript
// GOOD
router.post('/users', userController.create);
// Controller calls userService.create()
```

❌ **Don't ignore error handling**
```typescript
// BAD
router.get('/users/:id', async (req, res) => {
  const user = await db.users.findById(req.params.id);
  res.json(user);
});
```

✅ **Do handle errors properly**
```typescript
// GOOD
router.get('/users/:id', asyncHandler(async (req, res) => {
  const user = await userService.findById(req.params.id);
  if (!user) throw new AppError(404, 'User not found');
  res.json({ data: user });
}));
```
