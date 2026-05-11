# Security Policy

## Supported Versions

| Version | Supported |
| ------- | --------- |
| latest (main) | Yes |
| older branches | No |

## Reporting a Vulnerability

**Do not open a public GitHub issue for security vulnerabilities.**

Please report security vulnerabilities by email to:

**security@liftgo.net**

Include in your report:
- Description of the vulnerability
- Steps to reproduce
- Potential impact (data exposure, privilege escalation, etc.)
- Any suggested fix (optional)

### What to expect

| Timeline | Action |
|----------|--------|
| Within 48 hours | Acknowledgement of receipt |
| Within 7 days | Initial assessment and severity classification |
| Within 30 days | Patch or mitigation plan communicated |
| After fix ships | Credit in release notes (if desired) |

If you do not receive acknowledgement within 48 hours, please follow up via the GitHub repository discussion board.

### Scope

The following are in scope:
- Authentication and authorisation bypasses (Supabase RLS, RBAC)
- SQL injection / data exposure via API routes
- Stripe payment flow tampering
- Privilege escalation between naročnik / obrtnik roles
- Exposed secrets or credentials in codebase

The following are out of scope:
- Denial of service attacks
- Social engineering
- Issues in third-party dependencies already reported upstream

### Disclosure policy

We follow responsible disclosure. We ask that you give us 30 days to remediate before public disclosure.
