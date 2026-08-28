# Security

Report vulnerabilities privately to the repository owner. Never place credentials, session material, unpublished content, personal data, media originals, or exploit steps in a public issue.

The panel must rely on server authorization, use CSRF protections appropriate to the accepted auth mechanism, prevent open redirects, avoid token leakage, sanitize rich content previews, redact logs, limit upload types and sizes through server-confirmed policy, and time out or re-authenticate sensitive sessions. Hiding a control is not authorization.
