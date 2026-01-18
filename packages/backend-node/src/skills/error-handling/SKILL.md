---
name: error-handling
description: Error handling patterns for Node.js APIs. Use when implementing error handling, creating custom errors, or managing exceptions.
allowed-tools: Read, Write, Edit
user-invocable: true
---

# Error Handling Patterns

## Overview
Comprehensive error handling strategies for robust Node.js applications.

## Custom Error Classes

### Base Error Class
```typescript
// errors/AppError.ts
export class AppError extends Error {
  constructor(
    public statusCode: number,
    public message: string,
    public isOperational: boolean = true,
    public code?: string
  ) {
    super(message);
    Object.setPrototypeOf(this, AppError.prototype);
    Error.captureStackTrace(this, this.constructor);
  }
}
```

### Specific Error Classes
```typescript
// errors/ValidationError.ts
export class ValidationError extends AppError {
  constructor(message: string, public details?: any) {
    super(422, message, true, 'VALIDATION_ERROR');
  }
}

// errors/NotFoundError.ts
export class NotFoundError extends AppError {
  constructor(resource: string, identifier?: string) {
    const message = identifier
      ? `${resource} with identifier '${identifier}' not found`
      : `${resource} not found`;

    super(404, message, true, 'NOT_FOUND');
  }
}

// errors/UnauthorizedError.ts
export class UnauthorizedError extends AppError {
  constructor(message: string = 'Unauthorized') {
    super(401, message, true, 'UNAUTHORIZED');
  }
}

// errors/ForbiddenError.ts
export class ForbiddenError extends AppError {
  constructor(message: string = 'Forbidden') {
    super(403, message, true, 'FORBIDDEN');
  }
}

// errors/ConflictError.ts
export class ConflictError extends AppError {
  constructor(message: string) {
    super(409, message, true, 'CONFLICT');
  }
}

// errors/DatabaseError.ts
export class DatabaseError extends AppError {
  constructor(message: string, public originalError?: Error) {
    super(500, message, false, 'DATABASE_ERROR');
  }
}

// errors/ExternalServiceError.ts
export class ExternalServiceError extends AppError {
  constructor(
    public service: string,
    message: string,
    public originalError?: Error
  ) {
    super(503, `${service}: ${message}`, false, 'EXTERNAL_SERVICE_ERROR');
  }
}
```

## Global Error Handler

### Express Error Middleware
```typescript
// middleware/errorHandler.ts
import { Request, Response, NextFunction } from 'express';
import { AppError } from '../errors/AppError';
import { logger } from '../utils/logger';

export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
) {
  // Log error
  if (err instanceof AppError && !err.isOperational) {
    logger.error('Non-operational error:', {
      error: err.message,
      stack: err.stack,
      code: err.code
    });
  } else if (!(err instanceof AppError)) {
    logger.error('Unexpected error:', {
      error: err.message,
      stack: err.stack
    });
  }

  // Handle known errors
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      error: {
        code: err.code,
        message: err.message,
        ...(err instanceof ValidationError && { details: err.details })
      }
    });
  }

  // Handle validation errors (from libraries)
  if (err.name === 'ValidationError') {
    return res.status(422).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Validation failed',
        details: err.errors
      }
    });
  }

  // Handle JWT errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      error: {
        code: 'INVALID_TOKEN',
        message: 'Invalid authentication token'
      }
    });
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      error: {
        code: 'TOKEN_EXPIRED',
        message: 'Authentication token expired'
      }
    });
  }

  // Handle database errors
  if (err.name === 'SequelizeUniqueConstraintError') {
    return res.status(409).json({
      error: {
        code: 'DUPLICATE_ENTRY',
        message: 'Resource already exists'
      }
    });
  }

  // Default: Internal server error
  // Don't expose error details in production
  const message = process.env.NODE_ENV === 'production'
    ? 'Internal server error'
    : err.message;

  res.status(500).json({
    error: {
      code: 'INTERNAL_ERROR',
      message
    }
  });
}

// Apply in app.ts
app.use(errorHandler);
```

## Async Error Handling

### Async Wrapper
```typescript
// utils/asyncHandler.ts
import { Request, Response, NextFunction } from 'express';

export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<any>
) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

// Usage in controllers
router.get('/users/:id',
  asyncHandler(async (req, res) => {
    const user = await userService.findById(req.params.id);

    if (!user) {
      throw new NotFoundError('User', req.params.id);
    }

    res.json({ data: user });
  })
);
```

### Try-Catch Pattern
```typescript
// Alternative: explicit try-catch
router.get('/users/:id', async (req, res, next) => {
  try {
    const user = await userService.findById(req.params.id);

    if (!user) {
      throw new NotFoundError('User', req.params.id);
    }

    res.json({ data: user });
  } catch (error) {
    next(error);
  }
});
```

## Service Layer Error Handling

```typescript
// services/userService.ts
import { NotFoundError, ConflictError, DatabaseError } from '../errors';

export class UserService {
  async create(data: CreateUserDto): Promise<User> {
    try {
      // Check if user already exists
      const existing = await this.userRepository.findByEmail(data.email);
      if (existing) {
        throw new ConflictError('User with this email already exists');
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(data.password, 10);

      // Create user
      const user = await this.userRepository.create({
        ...data,
        password: hashedPassword
      });

      return user;
    } catch (error) {
      // Re-throw known errors
      if (error instanceof AppError) {
        throw error;
      }

      // Wrap database errors
      if (error.code === '23505') { // PostgreSQL unique violation
        throw new ConflictError('User with this email already exists');
      }

      // Wrap unknown database errors
      throw new DatabaseError('Failed to create user', error);
    }
  }

  async findById(id: string): Promise<User> {
    const user = await this.userRepository.findById(id);

    if (!user) {
      throw new NotFoundError('User', id);
    }

    return user;
  }

  async update(id: string, data: UpdateUserDto): Promise<User> {
    const user = await this.findById(id); // Throws if not found

    try {
      return await this.userRepository.update(id, data);
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }

      throw new DatabaseError('Failed to update user', error);
    }
  }

  async delete(id: string): Promise<void> {
    await this.findById(id); // Throws if not found

    try {
      await this.userRepository.delete(id);
    } catch (error) {
      throw new DatabaseError('Failed to delete user', error);
    }
  }
}
```

## Validation Error Handling

### Using Zod
```typescript
import { z } from 'zod';
import { ValidationError } from '../errors/ValidationError';

const createUserSchema = z.object({
  email: z.string().email('Invalid email format'),
  name: z.string().min(2, 'Name must be at least 2 characters').max(50),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  role: z.enum(['user', 'admin']).optional()
});

router.post('/users', async (req, res, next) => {
  try {
    // Validate request body
    const validatedData = createUserSchema.parse(req.body);

    const user = await userService.create(validatedData);
    res.status(201).json({ data: user });
  } catch (error) {
    if (error instanceof z.ZodError) {
      const details = error.errors.map(err => ({
        field: err.path.join('.'),
        message: err.message
      }));

      return next(new ValidationError('Validation failed', details));
    }

    next(error);
  }
});
```

### Validation Middleware
```typescript
// middleware/validate.ts
import { Request, Response, NextFunction } from 'express';
import { AnyZodObject, ZodError } from 'zod';
import { ValidationError } from '../errors/ValidationError';

export function validate(schema: AnyZodObject) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      await schema.parseAsync({
        body: req.body,
        query: req.query,
        params: req.params
      });
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const details = error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message
        }));

        next(new ValidationError('Validation failed', details));
      } else {
        next(error);
      }
    }
  };
}

// Usage
router.post('/users',
  validate(z.object({ body: createUserSchema })),
  createUser
);
```

## External API Error Handling

```typescript
import axios from 'axios';
import { ExternalServiceError } from '../errors';

export class PaymentService {
  async processPayment(data: PaymentData): Promise<PaymentResult> {
    try {
      const response = await axios.post(
        `${process.env.PAYMENT_API_URL}/charge`,
        data,
        {
          timeout: 10000,
          headers: {
            'Authorization': `Bearer ${process.env.PAYMENT_API_KEY}`
          }
        }
      );

      return response.data;
    } catch (error) {
      // Axios error with response (4xx, 5xx)
      if (axios.isAxiosError(error) && error.response) {
        throw new ExternalServiceError(
          'Payment Service',
          `Payment failed: ${error.response.data.message || 'Unknown error'}`,
          error
        );
      }

      // Network error (no response)
      if (axios.isAxiosError(error) && error.code === 'ECONNREFUSED') {
        throw new ExternalServiceError(
          'Payment Service',
          'Service unavailable',
          error
        );
      }

      // Timeout
      if (axios.isAxiosError(error) && error.code === 'ECONNABORTED') {
        throw new ExternalServiceError(
          'Payment Service',
          'Request timeout',
          error
        );
      }

      // Unknown error
      throw new ExternalServiceError(
        'Payment Service',
        'Unexpected error occurred',
        error
      );
    }
  }
}
```

## Circuit Breaker for External Services

```typescript
class CircuitBreaker {
  private failures = 0;
  private lastFailureTime?: Date;
  private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';

  constructor(
    private threshold: number = 5,
    private timeout: number = 60000,
    private retryDelay: number = 30000
  ) {}

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === 'OPEN') {
      if (Date.now() - this.lastFailureTime!.getTime() > this.retryDelay) {
        this.state = 'HALF_OPEN';
      } else {
        throw new ExternalServiceError(
          'Service',
          'Circuit breaker is OPEN - service temporarily unavailable'
        );
      }
    }

    try {
      const result = await fn();

      if (this.state === 'HALF_OPEN') {
        this.reset();
      }

      return result;
    } catch (error) {
      this.recordFailure();
      throw error;
    }
  }

  private recordFailure() {
    this.failures++;
    this.lastFailureTime = new Date();

    if (this.failures >= this.threshold) {
      this.state = 'OPEN';
    }
  }

  private reset() {
    this.failures = 0;
    this.state = 'CLOSED';
  }
}

// Usage
const paymentServiceBreaker = new CircuitBreaker();

async function processPayment(data: PaymentData) {
  return paymentServiceBreaker.execute(async () => {
    return await paymentService.charge(data);
  });
}
```

## Graceful Shutdown

```typescript
// server.ts
import { Server } from 'http';

let server: Server;

async function startServer() {
  server = app.listen(port, () => {
    console.log(`Server running on port ${port}`);
  });

  // Handle graceful shutdown
  process.on('SIGTERM', gracefulShutdown);
  process.on('SIGINT', gracefulShutdown);
}

async function gracefulShutdown() {
  console.log('Received shutdown signal, closing server...');

  // Stop accepting new connections
  server.close(async (err) => {
    if (err) {
      console.error('Error during shutdown:', err);
      process.exit(1);
    }

    try {
      // Close database connections
      await prisma.$disconnect();

      // Close Redis connection
      await redis.quit();

      // Close message queue connections
      await messageQueue.close();

      console.log('Shutdown complete');
      process.exit(0);
    } catch (error) {
      console.error('Error during cleanup:', error);
      process.exit(1);
    }
  });

  // Force shutdown after timeout
  setTimeout(() => {
    console.error('Forced shutdown after timeout');
    process.exit(1);
  }, 30000); // 30 seconds
}

startServer();
```

## Error Logging

```typescript
import winston from 'winston';

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({
      filename: 'logs/error.log',
      level: 'error'
    }),
    new winston.transports.File({
      filename: 'logs/combined.log'
    })
  ]
});

// Add console in development
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.simple()
  }));
}

// Log errors in error handler
export function errorHandler(err: Error, req: Request, res: Response, next: NextFunction) {
  // Log with context
  logger.error('Request error', {
    error: {
      message: err.message,
      stack: err.stack,
      code: err instanceof AppError ? err.code : undefined
    },
    request: {
      method: req.method,
      url: req.url,
      params: req.params,
      query: req.query,
      body: sanitizeBody(req.body), // Remove sensitive data
      user: req.user?.id,
      ip: req.ip
    }
  });

  // Send response...
}

function sanitizeBody(body: any): any {
  const sanitized = { ...body };
  const sensitiveFields = ['password', 'token', 'ssn', 'creditCard'];

  for (const field of sensitiveFields) {
    if (field in sanitized) {
      sanitized[field] = '[REDACTED]';
    }
  }

  return sanitized;
}
```

## Error Monitoring Integration

```typescript
// Sentry integration
import * as Sentry from '@sentry/node';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 0.1
});

// Add Sentry middleware
app.use(Sentry.Handlers.requestHandler());
app.use(Sentry.Handlers.tracingHandler());

// Add Sentry error handler (before your error handler)
app.use(Sentry.Handlers.errorHandler());

// Custom error tracking
export function errorHandler(err: Error, req: Request, res: Response, next: NextFunction) {
  // Only report non-operational errors to Sentry
  if (!(err instanceof AppError) || !err.isOperational) {
    Sentry.captureException(err, {
      user: { id: req.user?.id },
      tags: {
        path: req.path,
        method: req.method
      }
    });
  }

  // Continue with normal error handling...
}
```

## Best Practices

✅ **Do:**
- Use custom error classes for different error types
- Implement global error handler
- Log all errors with context
- Use async error handling patterns
- Validate all inputs
- Handle external service failures gracefully
- Implement circuit breakers for resilience
- Use appropriate HTTP status codes
- Sanitize error messages in production
- Implement graceful shutdown
- Monitor and track errors

❌ **Don't:**
- Expose sensitive information in errors
- Return stack traces to clients
- Ignore unhandled promise rejections
- Skip error logging
- Use generic error messages
- Catch errors without re-throwing or handling
- Mix business logic with error handling
- Forget to clean up resources on errors
- Use process.exit() in error handlers
- Skip validation

Remember: Good error handling makes debugging easier and improves user experience!
