---
name: review-code
description: Guide Claude to conduct thorough code reviews. Use when reviewing pull requests, code changes, or providing feedback on code quality.
allowed-tools: Read, Write, Edit, Bash
user-invocable: true
---

# Code Review Guide

## Overview
This skill guides Claude to conduct comprehensive, constructive code reviews across multiple dimensions.

## Review Process

### Phase 1: Understanding Context

#### Before Reviewing
```bash
# Check the scope of changes
git diff main...feature-branch --stat

# View files changed
git diff main...feature-branch --name-only

# Check commit history
git log main..feature-branch --oneline
```

#### Review Checklist
- [ ] Understand the purpose of the change
- [ ] Read the PR description / issue
- [ ] Identify the files changed
- [ ] Note the complexity of changes
- [ ] Check for breaking changes

### Phase 2: Code Quality Assessment

#### Functional Correctness
```typescript
// ✅ Good: Clear, correct logic
function calculateDiscount(price: number, percentage: number): number {
  if (percentage < 0 || percentage > 100) {
    throw new Error('Invalid percentage');
  }
  if (price < 0) {
    throw new Error('Invalid price');
  }
  return price * (1 - percentage / 100);
}

// ❌ Bad: No validation, unclear logic
function calc(p, per) {
  return p * (1 - per / 100);
}
```

**What to check:**
- [ ] Logic is correct and handles edge cases
- [ ] Input validation is present
- [ ] Error handling is appropriate
- [ ] Business rules are followed
- [ ] No obvious bugs or off-by-one errors

#### Code Readability
```typescript
// ✅ Good: Clear naming and structure
function getUserOrders(userId: string, filters: OrderFilters): Promise<Order[]> {
  const user = await db.users.findById(userId);
  if (!user) {
    throw new NotFoundError('User not found');
  }

  return db.orders.findMany({
    where: { userId, ...filters },
    orderBy: { createdAt: 'desc' }
  });
}

// ❌ Bad: Unclear naming, nested logic
function get(d, f) {
  const u = await db.query('SELECT * FROM users WHERE id = ?', [d]);
  if (!u[0]) throw new Error('Not found');
  return db.query('SELECT * FROM orders WHERE user_id = ?', [d]);
}
```

**What to check:**
- [ ] Variables and functions have clear names
- [ ] Code is self-documenting
- [ ] Complex logic has comments
- [ ] Magic numbers are replaced with constants
- [ ] Functions are small and focused

### Phase 3: Security Review

#### Common Security Issues

**SQL Injection:**
```typescript
// ❌ Bad: SQL injection risk
const query = `SELECT * FROM users WHERE id = ${userId}`;

// ✅ Good: Parameterized query
const query = 'SELECT * FROM users WHERE id = ?';
```

**XSS Prevention:**
```tsx
// ❌ Bad: XSS vulnerability
<div dangerouslySetInnerHTML={{ __html: userInput }} />

// ✅ Good: Escaped content
<div>{userInput}</div>
```

**Authentication/Authorization:**
```typescript
// ❌ Bad: No auth check
app.get('/admin/users', async (req, res) => {
  const users = await db.users.findAll();
  res.json(users);
});

// ✅ Good: Auth check
app.get('/admin/users',
  requireAuth,
  requireRole('admin'),
  async (req, res) => {
    const users = await db.users.findAll();
    res.json(users);
  }
);
```

**Security Checklist:**
- [ ] Input validation on all user inputs
- [ ] Output encoding to prevent XSS
- [ ] Authentication on protected endpoints
- [ ] Authorization checks for permissions
- [ ] No hardcoded secrets
- [ ] Proper error handling (don't leak info)
- [ ] Rate limiting on public APIs
- [ ] SQL/NoSQL injection prevention
- [ ] File upload validation
- [ ] CSRF protection

### Phase 4: Performance Considerations

#### Common Performance Issues

**N+1 Queries:**
```typescript
// ❌ Bad: N+1 queries
async function getUsersWithOrders() {
  const users = await db.users.findAll();
  for (const user of users) {
    user.orders = await db.orders.findAll({ where: { userId: user.id } });
  }
  return users;
}

// ✅ Good: Single query with JOIN
async function getUsersWithOrders() {
  return db.users.findAll({
    include: [{ model: Order, as: 'orders' }]
  });
}
```

**Inefficient Loops:**
```typescript
// ❌ Bad: Repeated operations
for (const user of users) {
  const isValid = await validateUser(user.id);
}

// ✅ Good: Batch validation
const userIds = users.map(u => u.id);
const validUsers = await validateUsers(userIds);
```

**Performance Checklist:**
- [ ] No N+1 query problems
- [ ] Appropriate database indexes used
- [ ] Caching implemented where appropriate
- [ ] Pagination for large result sets
- [ ] Efficient algorithms (not O(n²) unnecessarily)
- [ ] No memory leaks (event listeners, timers)
- [ ] Lazy loading for large components
- [ ] Debouncing/throttling user inputs
- [ ] Proper HTTP caching headers
- [ ] Assets optimized (images, bundles)

### Phase 5: Testing

#### Test Coverage

```typescript
// ✅ Good: Comprehensive tests
describe('UserService', () => {
  describe('createUser', () => {
    it('should create a user with valid data', async () => {
      const user = await userService.create(validUserData);
      expect(user).toHaveProperty('id');
      expect(user.email).toBe(validUserData.email);
    });

    it('should throw error with invalid email', async () => {
      await expect(
        userService.create({ email: 'invalid' })
      ).rejects.toThrow('Invalid email');
    });

    it('should throw error for duplicate email', async () => {
      await userService.create(validUserData);
      await expect(
        userService.create(validUserData)
      ).rejects.toThrow('Email already exists');
    });
  });
});
```

**Testing Checklist:**
- [ ] Unit tests for business logic
- [ ] Integration tests for API endpoints
- [ ] Edge cases are tested
- [ ] Error scenarios are tested
- [ ] Tests are readable and maintainable
- [ ] No flaky tests
- [ ] Test data is realistic
- [ ] Mocks are appropriate

### Phase 6: Documentation

#### Documentation Review

**Code Comments:**
```typescript
// ✅ Good: Comments explain WHY, not WHAT
// Hash password with 12 rounds for security
const hash = await bcrypt.hash(password, 12);

// ❌ Bad: Comment repeats obvious code
// Increment counter by 1
count++;

// ✅ Good: Explains non-obvious logic
// Use 12 rounds for better security (OWASP recommendation)
// Trade-off: 50ms slower but 2^12 more resistant to cracking
const hash = await bcrypt.hash(password, 12);
```

**Documentation Checklist:**
- [ ] Complex functions have JSDoc/TSDoc comments
- [ ] Public APIs are documented
- [ ] Environment variables are documented
- [ ] README is up to date
- [ ] Changes are reflected in CHANGELOG
- [ ] Breaking changes are documented

### Phase 7: Maintainability

#### Code Organization

```typescript
// ✅ Good: Well-organized
// services/
//   UserService.ts
//   OrderService.ts
//   PaymentService.ts

// ❌ Bad: Poor organization
// services.ts (3000 lines, everything in one file)
```

**Maintainability Checklist:**
- [ ] Code follows DRY principle
- [ ] Single responsibility principle
- [ ] Appropriate abstraction levels
- [ ] No code duplication
- [ ] Consistent code style
- [ ] Proper file/folder structure
- [ ] Dependencies are justified
- [ ] No dead/commented code
- [ ] TypeScript types are defined

## Review Feedback Template

### Positive Feedback
```markdown
**Strengths:**
- Excellent error handling throughout
- Good use of TypeScript for type safety
- Tests cover edge cases well
- Performance optimizations are thoughtful

**Particularly Good:**
The validation logic in `validateUser()` is comprehensive and handles all edge cases. The error messages are user-friendly.
```

### Constructive Feedback
```markdown
**Areas for Improvement:**

**1. Security**
```typescript
// Current
const query = `SELECT * FROM users WHERE id = ${userId}`;

// Suggestion: Use parameterized query to prevent SQL injection
const query = 'SELECT * FROM users WHERE id = ?';
```

**2. Performance**
Consider caching the user data to avoid repeated database calls in the loop.

**3. Naming**
`calc()` → `calculateDiscount()` for clarity
```

### Blocker Issues
```markdown
**Must Fix Before Merge:**

1. **Critical Security Issue**: SQL injection vulnerability in `getUserById()`
2. **Missing Tests**: No tests for error scenarios
3. **Breaking Change**: API contract changed without version bump

Please address these before merging.
```

## Language-Specific Guidelines

### TypeScript/JavaScript

```typescript
// ✅ Good Practices
- Use strict null checks
- Define proper interfaces/types
- Avoid `any` type
- Use async/await instead of callbacks
- Handle promises properly
- Use const/let appropriately
- Destructure objects for clarity
```

### Python

```python
# ✅ Good Practices
- Type hints for functions
- Docstrings for modules, classes, functions
- List/dict comprehensions where appropriate
- Context managers for resources
- Proper exception handling
- Follow PEP 8 style guide
```

### SQL

```sql
-- ✅ Good Practices
-- Use explicit column names (not SELECT *)
-- Index foreign keys
-- Use transactions for multi-table operations
-- Proper JOIN syntax
-- Query formatting for readability
```

## Review Templates

### Quick Review (Small Changes)
```markdown
**Quick Review for [PR Title]**

**Overview:** [Brief summary of changes]

**Changes:**
- [ ] [File 1]: [Brief comment]
- [ ] [File 2]: [Brief comment]

**Issues:**
- [ ] [Any issues found]

**Verdict:** ✅ Approve / 🤔 Request Changes / ❌ Reject
```

### Detailed Review (Large Changes)
```markdown
**Detailed Review for [PR Title]**

**Context:** [What problem does this solve?]

**Architecture:** [How does it fit into the system?]

**Security:** [Any security concerns?]

**Performance:** [Any performance concerns?]

**Testing:** [Test coverage adequate?]

**Documentation:** [Documentation updated?]

**Issues by Category:**
- **Blockers:** [Must fix]
- **Important:** [Should fix]
- **Nice to Have:** [Consider fixing]

**Overall Assessment:**
[Detailed summary]
```

## Common Review Patterns

### Frontend (React/Next.js)
```typescript
// Check for:
- Component re-renders (useCallback, useMemo where needed)
- Prop validation (TypeScript, PropTypes)
- State management (appropriate use of context/state)
- Accessibility (ARIA labels, keyboard navigation)
- Performance (lazy loading, code splitting)
- SEO (meta tags, semantic HTML)
- Error boundaries
- Loading states
```

### Backend (Node/Express)
```typescript
// Check for:
- Input validation
- Error handling
- Authentication/authorization
- Rate limiting
- Logging
- API versioning
- Database transaction usage
- Environment variable usage
- CORS configuration
```

### Database (SQL)
```sql
-- Check for:
- Index usage (EXPLAIN query plans)
- Proper JOINs
- WHERE clauses on indexed columns
- No SELECT *
- Appropriate data types
- Normalization (or intentional denormalization)
- Migration files included
- Rollback capability
```

## Feedback Etiquette

### Be Constructive
```markdown
❌ Bad:
"This code is terrible. Rewrite it."

✅ Good:
"I think we can improve the readability here. Consider splitting this function into smaller pieces to make it easier to test and maintain."
```

### Explain the Why
```markdown
❌ Bad:
"Change this."

✅ Good:
"Let's use a parameterized query here to prevent SQL injection vulnerabilities. Here's an example of how we can refactor it..."
```

### Provide Examples
```markdown
✅ Good:
"Instead of this:
[old code]

We could do:
[new code]

This improves X and makes the code more maintainable because Y."
```

### Be Open to Discussion
```markdown
✅ Good:
"I have a concern about performance here. What do you think about caching this result? Am I missing context about why it needs to be real-time?"
```

## Red Flags Requiring Blocker

**Must Reject:**
- Security vulnerabilities
- Data loss risk
- Breaking API changes without versioning
- No tests for critical code
- Copyright/licensing issues
- Performance regression with no mitigation

**Request Changes:**
- Missing error handling
- Incomplete implementation
- Poor code quality that hinders maintenance
- Missing documentation for public APIs
- Test coverage below threshold

## Approval Criteria

### Ready to Merge ✅
- No blocker issues
- Important issues are addressed or acknowledged
- Code is maintainable and well-tested
- Documentation is updated
- No security concerns
- No performance regressions
- CI/CD passes

### Needs Changes 🤔
- Has important issues but none are blockers
- Author has plan to address
- Good faith effort, needs refinement

### Reject ❌
- Has blocker issues
- Fundamentally wrong approach
- Incomplete implementation
- No tests for critical functionality
- Security vulnerabilities

## Best Practices

### For Reviewers
- [ ] Start with understanding, not judgment
- [ ] Ask questions instead of making demands
- [ ] Explain your reasoning
- [ ] Provide actionable feedback
- [ ] Prioritize issues (blocker, important, nice-to-have)
- [ ] Recognize good work
- [ ] Be timely with reviews
- [ ] Consider alternative approaches

### For Authors
- [ ] Keep PRs focused and small
- [ ] Write clear descriptions
- [ ] Self-review before submitting
- [ ] Add tests for new code
- [ ] Update documentation
- [ ] Respond to feedback
- [ ] Ask for clarification
- [ ] Explain trade-offs
- [ ] Be open to suggestions
```

### Testing Checklist</think><tool_call>Write<arg_key>content</arg_key><arg_value>---
name: securify
description: Security analysis and hardening guide. Use when reviewing code for security issues, implementing security measures, or conducting security audits.
allowed-tools: Read, Write, Edit, Bash
user-invocable: true
---

# Security Analysis and Hardening

## Overview
This skill guides Claude through comprehensive security analysis and hardening of code across all layers of the application.

## Security Review Process

### Phase 1: Threat Modeling

#### Identify Assets
```typescript
// What are we protecting?
- User data (PII: emails, addresses, phone numbers)
- Payment information (credit cards, bank accounts)
- Authentication credentials (passwords, tokens)
- API keys and secrets
- Proprietary business data
- Intellectual property
```

#### Identify Threats
```typescript
// Who are we defending against?
- External attackers (SQL injection, XSS, DDoS)
- Insider threats (privilege escalation, data exfiltration)
- Automated bots (credential stuffing, brute force)
- Competitors (scraping, IP theft)
```

#### STRIDE Threat Model
```typescript
// S - Spoofing: Fake identity, authentication bypass
// T - Tampering: Data modification
// R - Repudiation: Denying actions, lack of audit trail
// I - Information Disclosure: Data leaks
// D - Denial of Service: System unavailability
// E - Elevation of Privilege: Unauthorized access
```

### Phase 2: Common Vulnerabilities

### OWASP Top 10

#### 1. Broken Access Control
```typescript
// ❌ Vulnerable: No admin check
app.get('/admin/users', async (req, res) => {
  const users = await db.users.findAll();
  res.json(users);
});

// ✅ Secure: Authorization check
import { requireRole } from './middleware/auth';

app.get('/admin/users',
  requireRole('admin'),
  async (req, res) => {
    const users = await db.users.findAll();
    res.json(users);
  }
);
```

#### 2. Cryptographic Failures
```typescript
// ❌ Vulnerable: Hardcoded secrets
const API_KEY = 'sk-1234567890abcdef';

// ❌ Vulnerable: Weak hashing
import md5 from 'md5';
const hash = md5(password);  // MD5 is broken

// ✅ Secure: Environment variables
const API_KEY = process.env.API_KEY;

// ✅ Secure: Strong hashing
import bcrypt from 'bcrypt';
const hash = await bcrypt.hash(password, 12);  // 12 rounds
```

#### 3. Injection (SQL, NoSQL, OS Command)
```typescript
// ❌ SQL Injection
const query = `SELECT * FROM users WHERE id = ${userId}`;

// ✅ Parameterized Query
const query = 'SELECT * FROM users WHERE id = ?';
const result = await db.query(query, [userId]);

// ❌ NoSQL Injection
const query = { username: userInput };
const result = await db.users.find(query);

// ✅ Sanitized
const { username } = sanitizeUserInput(userInput);
const result = await db.users.findOne({ username });
```

#### 4. Insecure Design
```typescript
// ❌ No rate limiting
app.post('/api/login', async (req, res) => {
  // Vulnerable to brute force
});

// ✅ Rate limiting
import rateLimit from 'express-rate-limit';

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5 // limit each IP to 5 requests per windowMs
});

app.post('/api/login', loginLimiter, async (req, res) => {
  // Protected
});
```

#### 5. Security Misconfiguration
```typescript
// ❌ Exposes stack traces
app.use((err, req, res, next) => {
  res.status(500).json({
    error: err.message,
    stack: err.stack  // Leaks implementation details
  });
});

// ✅ Secure error handling
app.use((err, req, res, next) => {
  console.error(err); // Log for debugging
  res.status(500).json({
    error: 'An error occurred'
    // No stack trace in production
  });
});
```

#### 6. Vulnerable Components
```json
// ❌ Vulnerable dependencies
{
  "dependencies": {
    "express": "4.0.0",  // Outdated, known vulnerabilities
    "lodash": "4.17.4"   // Prototype pollution vulnerability
  }
}

// ✅ Run security audit
// npm audit
// npm audit fix
```

#### 7. Authentication Failures
```typescript
// ❌ Weak password requirements
function validatePassword(password: string): boolean {
  return password.length >= 6;  // Too weak
}

// ✅ Strong password validation
function validatePassword(password: string): boolean {
  // Min 12 chars, uppercase, lowercase, number, special
  const regex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{12,}$/;
  return regex.test(password);
}
```

#### 8. Data Integrity Failures
```typescript
// ❌ No integrity checks
app.put('/api/users/:id', async (req, res) => {
  await db.users.update(req.body, { where: { id: req.params.id } });
});

// ✅ Input validation & schema validation
import { z } from 'zod';

const updateUserSchema = z.object({
  email: z.string().email(),
  age: z.number().min(0).max(120),
  role: z.enum(['user', 'admin'])
});

app.put('/api/users/:id', async (req, res) => {
  const validated = updateUserSchema.parse(req.body);
  await db.users.update(validated, { where: { id: req.params.id } });
});
```

#### 9. Security Logging
```typescript
// ✅ Security event logging
import winston from 'winston';

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.File({ filename: 'security.log' })
  ]
});

// Log security events
logger.info('auth_failed', {
  userId: req.user.id,
  ip: req.ip,
  userAgent: req.get('user-agent'),
  timestamp: new Date().toISOString()
});
```

#### 10. Server-Side Request Forgery (SSRF)
```typescript
// ❌ Vulnerable: User-controlled URL
app.get('/api/fetch', async (req, res) => {
  const url = req.query.url;
  const response = await fetch(url);  // SSRF risk
  res.json(await response.json());
});

// ✅ Secure: URL whitelist
const ALLOWED_HOSTS = [
  'api.example.com',
  'cdn.example.com'
];

app.get('/api/fetch', async (req, res) => {
  const url = new URL(req.query.url);
  if (!ALLOWED_HOSTS.includes(url.hostname)) {
    return res.status(400).json({ error: 'Invalid host' });
  }
  const response = await fetch(url);
  res.json(await response.json());
});
```

## Security Checklist by Layer

### Authentication & Authorization

```typescript
// ✅ Password Requirements
- Minimum 12 characters
- Uppercase and lowercase letters
- At least one number and special character
- Not common passwords (check against list)
- Not same as email/username

// ✅ Session Management
- HttpOnly cookies
- Secure flag (HTTPS only)
- SameSite flag (CSRF protection)
- Session expiration
- Regenerate session after login

// ✅ JWT Best Practices
- Use strong secret keys (256+ bits)
- Short expiration times
- Refresh token rotation
- Verify signature
- Validate claims
```

### Input Validation

```typescript
// ✅ Validate All Inputs
import { z } from 'zod';

const schema = z.object({
  email: z.string().email().max(255),
  password: z.string().min(12).max(128),
  age: z.number().int().min(0).max(120),
  website: z.string().url().optional(),
  phone: z.string().regex(/^\+?[\d\s-()]+$/).optional()
});

// ✅ Sanitize Output
import * as sanitizeHtml from 'sanitize-html';

app.post('/api/comments', async (req, res) => {
  const clean = sanitizeHtml(req.body.comment, {
    allowedTags: ['p', 'br', 'strong', 'em'],
    allowedAttributes: {}
  });
  // Save clean HTML
});
```

### Data Protection

```typescript
// ✅ Encrypt sensitive data
import crypto from 'crypto';

function encrypt(text: string): string {
  const algorithm = 'aes-256-gcm';
  const key = crypto.scryptSync(
    process.env.ENCRYPTION_KEY,
    'salt',
    32
  );
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(algorithm, key, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag();
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
}

// ✅ Hash passwords (never encrypt)
import bcrypt from 'bcrypt';

async function hashPassword(password: string): Promise<string> {
  const saltRounds = 12;
  return bcrypt.hash(password, saltRounds);
}

// ✅ PII Redaction
function redactPII(data: any): any {
  const sensitive = ['ssn', 'creditCard', 'password'];
  for (const key of sensitive) {
    if (data[key]) {
      data[key] = data[key].substring(0, 4) + '****';
    }
  }
  return data;
}
```

### API Security

```typescript
// ✅ Rate Limiting
import rateLimit from 'express-rate-limit';

const apiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100, // limit each IP to 100 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api/', apiLimiter);

// ✅ CORS Configuration
const corsOptions = {
  origin: ['https://example.com'], // Whitelist
  credentials: true,
  optionsSuccessStatus: 204
};

// ✅ Security Headers
import helmet from 'helmet';

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", 'data:', 'https:'],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
}));

// ✅ Hide powered-by headers
app.disable('x-powered-by');
```

### Database Security

```typescript
// ✅ Principle of Least Privilege
const dbConfig = {
  user: process.env.DB_APP_USER,  // Limited permissions
  password: process.env.DB_APP_PASSWORD,
  // NOT root user
};

// ✅ Parameterized Queries
async function getUser(id: string) {
  const query = 'SELECT * FROM users WHERE id = ?';
  return db.query(query, [id]);
}

// ✅ Sensitive Data Encryption
// Encrypt at application level before storage
// Or use database transparent data encryption (TDE)

// ✅ Database Connection Security
{
  ssl: true,  // Require SSL
  rejectUnauthorized: true,  // Valid certificates only
}
```

### File Upload Security

```typescript
import multer from 'multer';
import path from 'path';

// ✅ File Validation
const upload = multer({
  storage: multer.diskStorage({
    destination: 'uploads/',
    filename: (req, file, cb) => {
      const uniqueName = `${Date.now()}-${Math.random()}-${file.originalname}`;
      cb(null, uniqueName);
    }
  }),
  fileFilter: (req, file, cb) => {
    // Allow only specific file types
    const allowedTypes = ['image/jpeg', 'image/png', 'application/pdf'];
    const ext = path.extname(file.originalname);

    if (!allowedTypes.includes(file.mimetype)) {
      return cb(new Error('Invalid file type'), false);
    }
    cb(null, true);
  },
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  }
});

// ✅ Virus Scan
import { exec } from 'child_process';

async function scanFile(filePath: string): Promise<boolean> {
  return new Promise((resolve) => {
    exec(`clamscan ${filePath}`, (error, stdout) => {
      if (stdout.includes('OK')) {
        resolve(true);
      } else {
        resolve(false);
      }
    });
  });
}
```

### Secrets Management

```typescript
// ❌ Never hardcode secrets
const secrets = {
  apiKey: 'hardcoded-key',
  dbPassword: 'password123'
};

// ✅ Environment variables
const secrets = {
  apiKey: process.env.API_KEY,
  dbPassword: process.env.DB_PASSWORD
};

// ✅ Use secrets manager (AWS, HashiCorp Vault)
import { SecretsManagerClient } from '@aws-sdk/client-secrets-manager';

async function getSecret(secretName: string) {
  const client = new SecretsManagerClient();
  const response = await client.getSecretValue({ SecretId: secretName });
  return JSON.parse(response.SecretString);
}
```

## Security Auditing

### Static Analysis Tools

```bash
# Node.js
npm install -D npm audit
npm audit
npm audit fix

# Python
pip install safety
safety check

# Dependency scanning
pip install pip-audit
pip-audit check
```

### Dynamic Analysis

```typescript
// ✅ Security Logging
const securityEvents = {
  AUTH_FAILURE: 'auth_failure',
  AUTH_SUCCESS: 'auth_success',
  PERMISSION_ESCALATION: 'permission_escalation',
  DATA_ACCESS: 'data_access',
  CONFIG_CHANGE: 'config_change'
};

function logSecurityEvent(event: string, details: any) {
  logger.info('security_event', {
    event,
    details: redactPII(details),
    timestamp: new Date().toISOString(),
    ip: details.ip,
    userAgent: details.userAgent
  });
}
```

### Penetration Testing Checklist

```markdown
**Authentication:**
- [ ] Test weak passwords
- [ ] Test password reset flows
- [ ] Test session hijacking
- [ ] Test JWT expiration

**Authorization:**
- [ ] Test horizontal privilege escalation
- [ ] Test vertical privilege escalation
- [ ] Test IDOR (insecure direct object references)
- [ ] Test force browsing

**Input Validation:**
- [ ] Test SQL injection
- [ ] Test XSS attacks
- [ ] Test command injection
- [ ] Test path traversal

**Session Management:**
- [ ] Test session fixation
- [ ] Test session timeout
- [ ] Test concurrent sessions
- [ ] Test logout functionality
```

## Security Headers

### HTTP Headers
```typescript
// ✅ Security Headers
app.use((req, res, next) => {
  // Prevent clickjacking
  res.setHeader('X-Frame-Options', 'DENY');

  // Prevent MIME type sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff');

  // Enable XSS filter
  res.setHeader('X-XSS-Protection', '1; mode=block');

  // Prevent referrer leakage
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

  // Content Security Policy
  res.setHeader('Content-Security-Policy',
    "default-src 'self'; " +
    "script-src 'self' 'unsafe-inline'; " +
    "style-src 'self' 'unsafe-inline'; " +
    "img-src 'self' data: https:;"
  );

  // HSTS
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');

  next();
});
```

## Common Security Patterns

### Rate Limiting by User
```typescript
import rateLimit from 'express-rate-limit';

const createUserLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour per IP
  max: 3, // max 3 accounts per hour per IP
  message: 'Too many accounts created, please try again later',
  keyGenerator: (req) => req.ip
});

app.post('/api/users', createUserLimiter, async (req, res) => {
  // Create user
});
```

### Account Lockout
```typescript
import Redis from 'ioredis';

const redis = new Redis();

async function checkLoginAttempts(email: string): Promise<boolean> {
  const attempts = await redis.get(`login_attempts:${email}`);
  if (parseInt(attempts || '0') >= 5) {
    return false; // Locked
  }
  return true;
}

async function recordLoginAttempt(email: string, success: boolean) {
  const key = `login_attempts:${email}`;
  if (success) {
    await redis.del(key);
  } else {
    await redis.incr(key);
    await redis.expire(key, 900); // 15 minutes
  }
}
```

### CAPTCHA Integration
```typescript
import { RecaptchaV3 } from 'express-recaptcha-v3';

app.post('/api/sensitive',
  RecaptchaV3(process.env.RECAPTCHA_SECRET_KEY),
  async (req, res) => {
    // Protected by CAPTCHA
  }
);
```

## Data Encryption

### Encryption at Rest
```typescript
import crypto from 'crypto';

function encryptData(data: string): { encrypted: string; iv: string; authTag: string } {
  const algorithm = 'aes-256-gcm';
  const key = crypto.scryptSync(
    process.env.ENCRYPTION_KEY,
    process.env.ENCRYPTION_SALT,
    32
  );
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(algorithm, key, iv);

  let encrypted = cipher.update(data, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  const authTag = cipher.getAuthTag();

  return {
    encrypted,
    iv: iv.toString('hex'),
    authTag: authTag.toString('hex')
  };
}

function decryptData(encrypted: string, iv: string, authTag: string): string {
  const algorithm = 'aes-256-gcm';
  const key = crypto.scryptSync(
    process.env.ENCRYPTION_KEY,
    process.env.ENCRYPTION_SALT,
    32
  );

  const decipher = crypto.createDecipheriv(
    algorithm,
    key,
    Buffer.from(iv, 'hex')
  );

  decipher.setAuthTag(Buffer.from(authTag, 'hex'));

  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}
```

## Incident Response

### Logging Security Events
```typescript
type SecurityEvent = {
  type: 'auth_failure' | 'permission_denied' | 'suspicious_activity';
  severity: 'low' | 'medium' | 'high' | 'critical';
  userId?: string;
  ip: string;
  userAgent: string;
  details: Record<string, any>;
  timestamp: string;
};

function logSecurityEvent(event: SecurityEvent) {
  // Log to security monitoring system
  securityLogger.info('security_event', {
    ...event,
    environment: process.env.NODE_ENV
  });

  // Alert on critical events
  if (event.severity === 'critical') {
    alertSecurityTeam(event);
  }
}
```

### Incident Response Checklist
```markdown
**Detection:**
- [ ] Identify affected systems
- [ ] Determine scope of breach
- [ ] Preserve evidence (logs, etc.)

**Containment:**
- [ ] Isolate affected systems
- [ ] Reset compromised credentials
- [ ] Block malicious IPs

**Eradication:**
- [ ] Identify vulnerability source
- [ ] Patch vulnerabilities
- [ ] Remove malware/backdoors

**Recovery:**
- [ ] Restore from clean backups
- [ ] Verify system integrity
- [ ] Monitor for recurrence

**Post-Incident:**
- [ ] Conduct post-mortem
- [ ] Update security policies
- [ ] Improve monitoring
- [ ] Document lessons learned
```

## Security Best Practices

### ✅ DO:
- Validate all input (whitelist approach)
- Use parameterized queries
- Hash passwords with bcrypt/argon2
- Use HTTPS everywhere
- Implement rate limiting
- Log security events
- Keep dependencies updated
- Follow principle of least privilege
- Use environment variables for secrets
- Implement proper error handling
- Use security headers
- Regular security audits

### ❌ DON'T:
- Hardcode secrets/credentials
- Trust client-side input
- Use eval() or similar dangerous functions
- Disable security features for convenience
- Ignore security warnings
- Use outdated/vulnerable dependencies
- Expose stack traces in production
- Store passwords in plain text
- Use broken crypto algorithms (MD5, SHA1)
- Implement your own crypto
- Ignore security headers
- Skip input validation
```

### Quick Security Checklist

```markdown
**Before Deploying:**
- [ ] All user input is validated
- [ ] SQL/NoSQL injection prevented
- [ ] XSS protection in place
- [ ] CSRF tokens implemented
- [ ] Authentication required for protected routes
- [ ] Authorization checks implemented
- [ ] Rate limiting configured
- [ ] Security headers set
- [ ] Secrets in environment variables
- [ ] Dependencies audited
- [ ] Error handling doesn't leak info
- [ ] Logging in place (no sensitive data)
- [ ] HTTPS enforced
- [ ] File upload validation
- [ ] Password policies enforced
```
