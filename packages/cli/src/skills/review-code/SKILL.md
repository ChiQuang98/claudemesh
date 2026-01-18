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
