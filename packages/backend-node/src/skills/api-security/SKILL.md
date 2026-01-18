---
name: api-security
description: API security best practices and patterns. Use when implementing security, preventing vulnerabilities, or securing APIs.
allowed-tools: Read, Write, Edit
user-invocable: true
---

# API Security

## Overview
Security best practices for protecting Node.js APIs from common vulnerabilities.

## OWASP Top 10 for APIs

### 1. Broken Object Level Authorization (BOLA)
**Problem**: Users can access objects they shouldn't.

```typescript
// ❌ Bad - No authorization check
router.get('/users/:id/orders', async (req, res) => {
  const orders = await orderService.findByUserId(req.params.id);
  res.json(orders);
});

// ✅ Good - Verify ownership
router.get('/users/:id/orders', authenticate, async (req, res) => {
  // Check if requesting user owns this resource
  if (req.user.id !== req.params.id && req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Forbidden' });
  }

  const orders = await orderService.findByUserId(req.params.id);
  res.json(orders);
});

// ✅ Better - Use middleware
const checkOwnership = (resource: string) => {
  return async (req, res, next) => {
    const resourceId = req.params.id;
    const isOwner = await authService.checkOwnership(
      req.user.id,
      resource,
      resourceId
    );

    if (!isOwner && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden' });
    }

    next();
  };
};

router.get('/users/:id/orders',
  authenticate,
  checkOwnership('user'),
  getOrders
);
```

### 2. Broken Authentication
**Problem**: Weak authentication mechanisms.

```typescript
// ✅ Strong password hashing
import bcrypt from 'bcrypt';

async function hashPassword(password: string): Promise<string> {
  const saltRounds = 12; // Adjust based on security requirements
  return bcrypt.hash(password, saltRounds);
}

async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

// ✅ Secure JWT implementation
import jwt from 'jsonwebtoken';

function generateAccessToken(payload: any): string {
  return jwt.sign(payload, process.env.JWT_SECRET!, {
    expiresIn: '15m', // Short-lived
    algorithm: 'HS256'
  });
}

function generateRefreshToken(payload: any): string {
  return jwt.sign(payload, process.env.REFRESH_SECRET!, {
    expiresIn: '7d',
    algorithm: 'HS256'
  });
}

// ✅ Token blacklisting (for logout)
const blacklist = new Set<string>();

async function logout(req: Request, res: Response) {
  const token = req.headers.authorization?.split(' ')[1];
  if (token) {
    blacklist.add(token);
    // Also store in Redis with expiration
    await redis.setex(`blacklist:${token}`, 900, 'true'); // 15 min
  }
  res.json({ message: 'Logged out successfully' });
}

// Check blacklist in auth middleware
if (blacklist.has(token) || await redis.get(`blacklist:${token}`)) {
  return res.status(401).json({ error: 'Token revoked' });
}
```

### 3. Excessive Data Exposure
**Problem**: API returns more data than needed.

```typescript
// ❌ Bad - Exposes all fields including sensitive ones
router.get('/users/:id', async (req, res) => {
  const user = await User.findById(req.params.id);
  res.json(user); // Includes password hash, internal IDs, etc.
});

// ✅ Good - Use DTOs to control response shape
class UserResponseDto {
  id: string;
  email: string;
  name: string;
  createdAt: Date;

  static fromEntity(user: User): UserResponseDto {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      createdAt: user.createdAt
    };
  }
}

router.get('/users/:id', async (req, res) => {
  const user = await User.findById(req.params.id);
  res.json(UserResponseDto.fromEntity(user));
});

// ✅ Or use serialization
import { Exclude, Expose, plainToClass } from 'class-transformer';

class User {
  @Expose()
  id: string;

  @Expose()
  email: string;

  @Exclude() // Never expose
  password: string;

  @Exclude()
  passwordResetToken?: string;
}

router.get('/users/:id', async (req, res) => {
  const user = await User.findById(req.params.id);
  res.json(plainToClass(User, user, { excludeExtraneousValues: true }));
});
```

### 4. Lack of Resources & Rate Limiting

```typescript
import rateLimit from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';
import { createClient } from 'redis';

const redisClient = createClient({ url: process.env.REDIS_URL });

// General API rate limit
const apiLimiter = rateLimit({
  store: new RedisStore({ client: redisClient }),
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Max 100 requests per window
  message: 'Too many requests, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
});

// Strict limit for auth endpoints
const authLimiter = rateLimit({
  store: new RedisStore({ client: redisClient }),
  windowMs: 15 * 60 * 1000,
  max: 5, // Max 5 attempts
  skipSuccessfulRequests: true,
  message: 'Too many login attempts, please try again later'
});

// Apply limits
app.use('/api/', apiLimiter);
app.use('/auth/login', authLimiter);
app.use('/auth/register', authLimiter);

// Request size limits
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ limit: '10kb', extended: true }));

// Timeout middleware
app.use((req, res, next) => {
  req.setTimeout(30000, () => {
    res.status(408).json({ error: 'Request timeout' });
  });
  next();
});
```

### 5. Broken Function Level Authorization

```typescript
// ❌ Bad - Only checks authentication
router.delete('/users/:id', authenticate, async (req, res) => {
  await userService.delete(req.params.id);
  res.status(204).send();
});

// ✅ Good - Checks roles/permissions
const requireRole = (...roles: string[]) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    next();
  };
};

router.delete('/users/:id',
  authenticate,
  requireRole('admin'),
  deleteUser
);

// ✅ Better - Fine-grained permissions
const requirePermission = (...perms: string[]) => {
  return async (req, res, next) => {
    const userPermissions = await permissionService.getUserPermissions(req.user.id);

    const hasPermission = perms.every(p => userPermissions.includes(p));

    if (!hasPermission) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    next();
  };
};

router.delete('/users/:id',
  authenticate,
  requirePermission('users:delete'),
  deleteUser
);
```

### 6. Mass Assignment
**Problem**: Users can modify fields they shouldn't.

```typescript
// ❌ Bad - Accepts any fields from request body
router.put('/users/:id', async (req, res) => {
  await User.update(req.params.id, req.body);
  res.json({ message: 'Updated' });
});

// ✅ Good - Use DTOs with validation
import { IsString, IsEmail, IsOptional, Length } from 'class-validator';

class UpdateUserDto {
  @IsOptional()
  @IsString()
  @Length(2, 50)
  name?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  // role and other sensitive fields NOT included
}

router.put('/users/:id',
  validate(UpdateUserDto),
  async (req, res) => {
    const dto = plainToClass(UpdateUserDto, req.body);
    await User.update(req.params.id, dto);
    res.json({ message: 'Updated' });
  }
);
```

### 7. Security Misconfiguration

```typescript
import helmet from 'helmet';
import cors from 'cors';

// Security headers
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", 'data:', 'https:']
    }
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
}));

// CORS configuration
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(','),
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Disable powered-by header
app.disable('x-powered-by');

// Environment-specific settings
if (process.env.NODE_ENV === 'production') {
  // Force HTTPS
  app.use((req, res, next) => {
    if (req.header('x-forwarded-proto') !== 'https') {
      res.redirect(`https://${req.header('host')}${req.url}`);
    } else {
      next();
    }
  });

  // Strict transport security
  app.use((req, res, next) => {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    next();
  });
}

// Don't expose error details in production
app.use((err, req, res, next) => {
  if (process.env.NODE_ENV === 'production') {
    res.status(500).json({ error: 'Internal server error' });
  } else {
    res.status(500).json({ error: err.message, stack: err.stack });
  }
});
```

### 8. Injection
**Problem**: SQL injection, NoSQL injection, command injection.

```typescript
// ✅ SQL Injection Prevention - Use parameterized queries
import { Pool } from 'pg';

const pool = new Pool();

// ❌ Bad - SQL injection vulnerable
async function getUserBad(email: string) {
  const result = await pool.query(
    `SELECT * FROM users WHERE email = '${email}'`
  );
  return result.rows[0];
}

// ✅ Good - Parameterized query
async function getUserGood(email: string) {
  const result = await pool.query(
    'SELECT * FROM users WHERE email = $1',
    [email]
  );
  return result.rows[0];
}

// ✅ NoSQL Injection Prevention
import { z } from 'zod';

// ❌ Bad - NoSQL injection vulnerable
async function findUser(req: Request) {
  const user = await User.findOne({ email: req.body.email });
  return user;
}

// ✅ Good - Validate input
const emailSchema = z.string().email();

async function findUserSafe(req: Request) {
  const email = emailSchema.parse(req.body.email);
  const user = await User.findOne({ email });
  return user;
}

// ✅ Command Injection Prevention
import { exec } from 'child_process';

// ❌ Bad - Command injection vulnerable
async function pingHost(host: string) {
  exec(`ping -c 4 ${host}`, (error, stdout) => {
    console.log(stdout);
  });
}

// ✅ Good - Use execFile with arguments array
import { execFile } from 'child_process';

async function pingHostSafe(host: string) {
  // Validate host format first
  if (!/^[\w.-]+$/.test(host)) {
    throw new Error('Invalid host format');
  }

  execFile('ping', ['-c', '4', host], (error, stdout) => {
    console.log(stdout);
  });
}
```

### 9. Improper Assets Management
**Problem**: Exposed debug endpoints, old API versions.

```typescript
// Remove debug/admin routes in production
if (process.env.NODE_ENV !== 'production') {
  app.use('/debug', debugRouter);
  app.use('/admin', adminRouter);
}

// API versioning
app.use('/api/v1', v1Router);
app.use('/api/v2', v2Router);

// Deprecation headers for old versions
app.use('/api/v1', (req, res, next) => {
  res.setHeader('Deprecation', 'true');
  res.setHeader('Sunset', 'Wed, 31 Dec 2024 23:59:59 GMT');
  res.setHeader('Link', '</api/v2>; rel="successor-version"');
  next();
});

// Health check endpoint (no sensitive info)
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
    // Don't expose: versions, dependencies, internal IPs
  });
});
```

### 10. Insufficient Logging & Monitoring

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
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' })
  ]
});

// Log security events
function logSecurityEvent(event: string, details: any) {
  logger.warn('SECURITY_EVENT', {
    event,
    ...details,
    timestamp: new Date().toISOString()
  });
}

// Log authentication failures
app.post('/auth/login', async (req, res) => {
  const { email, password } = req.body;

  const user = await userService.findByEmail(email);

  if (!user || !(await verifyPassword(password, user.password))) {
    logSecurityEvent('LOGIN_FAILED', {
      email,
      ip: req.ip,
      userAgent: req.get('user-agent')
    });

    return res.status(401).json({ error: 'Invalid credentials' });
  }

  logSecurityEvent('LOGIN_SUCCESS', {
    userId: user.id,
    email: user.email,
    ip: req.ip
  });

  // Continue with login...
});

// Monitor suspicious activity
async function detectSuspiciousActivity(userId: string) {
  const recentLogins = await getRecentLogins(userId, '1h');

  // Multiple logins from different IPs
  const uniqueIPs = new Set(recentLogins.map(l => l.ip));
  if (uniqueIPs.size > 3) {
    logSecurityEvent('SUSPICIOUS_ACTIVITY', {
      userId,
      reason: 'Multiple IPs',
      count: uniqueIPs.size
    });

    // Send alert email
    await sendSecurityAlert(userId, 'suspicious_login');
  }
}
```

## Input Sanitization

```typescript
import sanitizeHtml from 'sanitize-html';
import validator from 'validator';

// Sanitize HTML input
function sanitizeInput(input: string): string {
  return sanitizeHtml(input, {
    allowedTags: [],
    allowedAttributes: {}
  });
}

// Validate and sanitize email
function validateEmail(email: string): string {
  const sanitized = validator.normalizeEmail(email) || '';

  if (!validator.isEmail(sanitized)) {
    throw new Error('Invalid email format');
  }

  return sanitized;
}

// Validate URL
function validateURL(url: string): string {
  if (!validator.isURL(url, {
    protocols: ['http', 'https'],
    require_protocol: true
  })) {
    throw new Error('Invalid URL');
  }

  return url;
}
```

## Secure File Uploads

```typescript
import multer from 'multer';
import path from 'path';
import crypto from 'crypto';

const upload = multer({
  storage: multer.diskStorage({
    destination: './uploads',
    filename: (req, file, cb) => {
      // Generate random filename to prevent path traversal
      const randomName = crypto.randomBytes(16).toString('hex');
      const ext = path.extname(file.originalname);
      cb(null, `${randomName}${ext}`);
    }
  }),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB max
    files: 1
  },
  fileFilter: (req, file, cb) => {
    // Whitelist allowed file types
    const allowedTypes = /jpeg|jpg|png|pdf/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (extname && mimetype) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type'));
    }
  }
});

router.post('/upload',
  authenticate,
  upload.single('file'),
  async (req, res) => {
    // Validate file content (not just extension)
    // Store file metadata in database
    // Scan for malware if needed

    res.json({
      filename: req.file!.filename,
      size: req.file!.size
    });
  }
);
```

## Security Checklist

✅ **Authentication & Authorization**
- [ ] Use strong password hashing (bcrypt, scrypt)
- [ ] Implement secure JWT with short expiration
- [ ] Use refresh token rotation
- [ ] Implement MFA for sensitive operations
- [ ] Check object-level authorization
- [ ] Validate function-level permissions

✅ **Input Validation**
- [ ] Validate all inputs with DTOs
- [ ] Sanitize HTML/SQL inputs
- [ ] Use parameterized queries
- [ ] Validate file uploads
- [ ] Implement rate limiting

✅ **Configuration**
- [ ] Use helmet for security headers
- [ ] Configure CORS properly
- [ ] Force HTTPS in production
- [ ] Don't expose error details
- [ ] Remove debug endpoints

✅ **Monitoring**
- [ ] Log security events
- [ ] Monitor failed login attempts
- [ ] Set up alerts for suspicious activity
- [ ] Track API usage patterns

Remember: Security is not a feature, it's a requirement!
