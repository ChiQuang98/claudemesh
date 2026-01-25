---
name: securify
description: Security analysis and hardening guide. Scan code for vulnerabilities and suggest fixes.
allowed-tools: Bash, Read, Glob, Grep
user-invocable: true
---

# Security Analysis (Securify)

When this skill is invoked, perform a comprehensive security analysis of the codebase.

## Step 1: Identify Project Type

```bash
# Detect framework/language
[ -f package.json ] && echo "Node.js project"
[ -f requirements.txt ] && echo "Python project"
[ -f go.mod ] && echo "Go project"
```

## Step 2: Check for Hardcoded Secrets

```bash
# Search for potential secrets
grep -rn --include="*.ts" --include="*.js" --include="*.py" \
  -E "(password|secret|api_key|apikey|token|credential).*=.*['\"][^'\"]{8,}" \
  . 2>/dev/null | head -20

# Check for AWS keys
grep -rn --include="*.ts" --include="*.js" --include="*.env*" \
  -E "AKIA[0-9A-Z]{16}" . 2>/dev/null

# Check for private keys
grep -rn "BEGIN.*PRIVATE KEY" . 2>/dev/null | head -10
```

## Step 3: Check for Common Vulnerabilities

### SQL Injection

```bash
# String concatenation in queries
grep -rn --include="*.ts" --include="*.js" \
  -E "query.*\`.*\$\{|execute.*\+.*var" . 2>/dev/null | head -10
```

### XSS Vulnerabilities

```bash
# dangerouslySetInnerHTML in React
grep -rn "dangerouslySetInnerHTML" --include="*.tsx" --include="*.jsx" . 2>/dev/null

# innerHTML assignments
grep -rn "innerHTML.*=" --include="*.ts" --include="*.js" . 2>/dev/null | head -10
```

### Command Injection

```bash
# exec, spawn without sanitization
grep -rn --include="*.ts" --include="*.js" \
  -E "exec\(|spawn\(|execSync\(" . 2>/dev/null | head -10
```

## Step 4: Check Dependencies

```bash
# Run npm audit
npm audit 2>/dev/null | head -50

# Check for outdated packages with known vulnerabilities
npm outdated 2>/dev/null | head -20
```

## Step 5: Check Security Headers

```bash
# Look for helmet usage (Node.js)
grep -rn "helmet" --include="*.ts" --include="*.js" . 2>/dev/null | head -5

# Check for CORS configuration
grep -rn "cors\|Access-Control" --include="*.ts" --include="*.js" . 2>/dev/null | head -10
```

## Step 6: Check Authentication

```bash
# Look for authentication middleware
grep -rn --include="*.ts" --include="*.js" \
  -E "authenticate|requireAuth|isAuthenticated|passport" . 2>/dev/null | head -10

# Check for JWT handling
grep -rn "jwt\|jsonwebtoken" --include="*.ts" --include="*.js" . 2>/dev/null | head -10
```

## Security Checklist

### High Priority
- [ ] No hardcoded secrets in code
- [ ] No SQL injection vulnerabilities
- [ ] No XSS vulnerabilities
- [ ] Dependencies are up to date
- [ ] Authentication on protected routes

### Medium Priority
- [ ] Rate limiting implemented
- [ ] CORS properly configured
- [ ] Security headers (helmet) in use
- [ ] Input validation on all endpoints
- [ ] Error messages don't leak info

### Low Priority
- [ ] HTTPS enforced
- [ ] Secure cookie settings
- [ ] CSP headers configured
- [ ] Logging for security events

## Output Format

```
=== Security Analysis Report ===

Scan completed: 156 files analyzed

HIGH SEVERITY (Fix immediately):
  1. Hardcoded API key found
     File: src/config.ts:15
     Issue: API_KEY = 'sk-1234...'
     Fix: Move to environment variable

  2. SQL Injection vulnerability
     File: src/db/users.ts:42
     Issue: query(`SELECT * FROM users WHERE id = ${id}`)
     Fix: Use parameterized query

MEDIUM SEVERITY:
  3. Missing rate limiting
     File: src/routes/auth.ts
     Fix: Add rate limiting middleware

LOW SEVERITY:
  4. Outdated dependency
     Package: lodash@4.17.15
     Fix: Update to 4.17.21

Summary:
  High: 2 issues
  Medium: 1 issue
  Low: 1 issue

Run `/ccmesh-fix` to auto-fix some issues.
```

## OWASP Top 10 Checks

1. **Broken Access Control** - Check authorization on all endpoints
2. **Cryptographic Failures** - Verify encryption and hashing
3. **Injection** - SQL, NoSQL, OS command injection
4. **Insecure Design** - Architecture security patterns
5. **Security Misconfiguration** - Headers, CORS, error handling
6. **Vulnerable Components** - Outdated dependencies
7. **Authentication Failures** - Weak auth, session management
8. **Data Integrity Failures** - Input validation
9. **Logging Failures** - Security event logging
10. **SSRF** - Server-side request forgery

## Options

- `--quick` - Fast scan (secrets and critical vulnerabilities only)
- `--deps` - Only check dependencies
- `--full` - Complete OWASP Top 10 analysis
