# Security Runbook & Checklist

## Overview
This document outlines security controls, monitoring, and incident response procedures for the Payments Platform.

## Security Controls Checklist

### ✅ Authentication & Authorization
- [x] JWT-based authentication with refresh token rotation
- [x] Role-based access control (user/admin)
- [x] Token expiry enforcement (15min access, 7day refresh)
- [x] Failed login attempt tracking with IP lockout
- [x] CSRF protection for state-changing requests
- [x] Secure cookie configuration (httpOnly, secure, sameSite)

### ✅ Input Validation & Sanitization
- [x] Centralized validation middleware using Zod schemas
- [x] Consistent error responses across all endpoints
- [x] Server-side input sanitization to prevent XSS
- [x] Strict parameter validation (length, type, format)
- [x] SQL injection protection via Prisma ORM

### ✅ Security Headers & Transport
- [x] Helmet.js security headers configuration
- [x] Content Security Policy (CSP) with strict directives
- [x] HTTP Strict Transport Security (HSTS)
- [x] X-Frame-Options: DENY
- [x] X-Content-Type-Options: nosniff
- [x] X-XSS-Protection: 1; mode=block
- [x] Referrer-Policy: strict-origin-when-cross-origin

### ✅ Rate Limiting & DDoS Protection
- [x] Redis-backed distributed rate limiting
- [x] Endpoint-specific rate limits (auth: 5/15min, payments: 20/min, etc.)
- [x] IP-based rate limiting with automatic lockout
- [x] Request size limits (1MB body limit)
- [x] Request timeout enforcement (30s)

### ✅ Logging & Monitoring
- [x] Structured logging with Pino
- [x] Request/response logging with security redaction
- [x] Failed authentication attempt logging
- [x] Payment webhook security monitoring
- [x] Rate limit violation tracking
- [x] CSP violation reporting endpoint

### ✅ Data Protection
- [x] Sensitive data redaction in logs (passwords, tokens, HMAC)
- [x] Secure session management
- [x] Database query parameterization
- [x] Environment variable validation

## Security Monitoring

### Critical Security Events to Monitor

1. **Authentication Failures**
   - Monitor: `/api/auth/login` failures
   - Alert threshold: >10 failures/minute from same IP
   - Action: Auto-block IP temporarily

2. **Rate Limit Violations**
   - Monitor: 429 responses
   - Alert threshold: >50 violations/minute from same IP
   - Action: Review for potential DDoS attack

3. **Payment Anomalies**
   - Monitor: Webhook failures, reconciliation requests
   - Alert threshold: >5 webhook failures in 5 minutes
   - Action: Check payment provider connectivity

4. **CSP Violations**
   - Monitor: `/api/csp-report` endpoint
   - Alert threshold: >10 violations from same source
   - Action: Review CSP configuration

### Log Analysis Queries

```bash
# Check for multiple failed login attempts
grep "Login attempt with invalid password" logs/*.log | wc -l

# Monitor rate limit violations
grep "RATE_LIMIT_EXCEEDED" logs/*.log | grep "$(date +%Y-%m-%d)"

# Check for webhook errors
grep "WEBHOOK_ERROR" logs/*.log | tail -20

# Monitor admin operations
grep "Admin reconciliation initiated" logs/*.log
```

## Incident Response Procedures

### 1. Security Incident Detection
- Monitor alerts from the above thresholds
- Review security logs for suspicious patterns
- Check external security feeds for new vulnerabilities

### 2. Immediate Response (0-15 minutes)
1. **Assess Severity**
   - Critical: Data breach, active attack, payment compromise
   - High: Multiple failed auth attempts, rate limit abuse
   - Medium: CSP violations, unusual traffic patterns

2. **Immediate Containment**
   ```bash
   # Emergency rate limiting (if under attack)
   redis-cli SETBLOCKLIST:attackers:10.0.0.1 3600 1
   
   # Emergency lockdown (disable specific endpoints)
   # (Implementation depends on your infrastructure)
   ```

3. **Preserve Evidence**
   ```bash
   # Backup logs immediately
   cp -r logs/ backups/security-incident-$(date +%Y%m%d-%H%M%S)/
   
   # Capture current database state
   pg_dump database_name > backups/db-incident-$(date +%Y%m%d-%H%M%S).sql
   ```

### 3. Investigation (15-60 minutes)
1. **Timeline Analysis**
   - Review request logs around incident time
   - Identify attack vectors and scope
   - Check for data exfiltration

2. **Impact Assessment**
   - Which users/systems were affected?
   - What data may have been compromised?
   - Financial impact assessment

### 4. Recovery (1-4 hours)
1. **Service Restoration**
   - Clear attack vectors
   - Update security rules
   - Gradual service restoration

2. **Data Recovery**
   - Restore from clean backups if needed
   - Verify data integrity
   - Update user passwords if necessary

### 5. Post-Incident (24+ hours)
1. **Root Cause Analysis**
   - Document incident timeline
   - Identify security gaps
   - Update security controls

2. **Prevention**
   - Implement additional monitoring
   - Update incident response procedures
   - Security awareness training

## Backup Strategy

### Database Backups
- **Frequency**: Every 6 hours (automated)
- **Retention**: 30 days for daily, 12 months for monthly
- **Encryption**: AES-256 encrypted backups
- **Offsite**: Cloud storage with regional redundancy
- **Testing**: Monthly restore tests

### Application Backups
- **Code**: Git repository (already version controlled)
- **Configuration**: Infrastructure as Code (Terraform)
- **Secrets**: HashiCorp Vault or AWS Secrets Manager
- **Logs**: Centralized logging with 90-day retention

### Backup Recovery Testing
```bash
# Weekly backup integrity check
./scripts/test-backup-restore.sh

# Monthly disaster recovery drill
./scripts/disaster-recovery-drill.sh
```

## Security Scanning & Updates

### Dependency Security Scanning
```bash
# Daily automated scans
npm audit --audit-level=moderate

# Weekly Snyk security report
snyk test --severity-threshold=medium

# Monthly dependency updates
npm update && npm audit fix
```

### Application Security Testing
```bash
# Run security-focused unit tests
npm run test:security

# Load test with security validation
npm run test:load

# ESLint security rules
npm run lint:security
```

### Infrastructure Security
```bash
# Container security scanning (if using Docker)
docker scan payments-platform:latest

# SSL/TLS certificate monitoring
ssl-cert-check -c /path/to/cert.pem
```

## Deployment Security Requirements

### Pre-Deployment Checklist
- [ ] All security tests pass (>80% coverage)
- [ ] No high/critical vulnerabilities in dependencies
- [ ] Environment variables properly configured
- [ ] SSL certificates valid and monitoring
- [ ] Rate limiting configured and tested
- [ ] CSP rules validated
- [ ] Database migrations tested on staging

### Production Security Configuration
```bash
# Required environment variables
NODE_ENV=production
JWT_SECRET=<strong-random-secret>
CORS_ORIGIN=<specific-frontend-urls>
RATE_LIMIT_STORAGE_URL=<redis-url>
HSTS_ENABLED=true
CSP_ENABLED=true
```

## Contact Information
- **Security Team**: security@company.com
- **On-call Engineer**: +1-xxx-xxx-xxxx
- **Incident Response**: incident@company.com

## Legal & Compliance
- **GDPR**: Data retention policies implemented
- **PCI DSS**: Payment data handling procedures
- **SOX**: Financial data integrity controls
- **Audit Logs**: Maintained for compliance (7-year retention)

---

**Last Updated**: 2024-01-15
**Next Review**: 2024-02-15
**Document Owner**: Security Team