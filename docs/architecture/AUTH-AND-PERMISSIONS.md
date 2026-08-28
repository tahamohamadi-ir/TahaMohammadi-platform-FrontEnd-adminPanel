# Authentication and Permissions

The current backend exposes staff authentication, two-factor setup/verification, and admin API controls. Exact session, cookie, CSRF, MFA, timeout, re-authentication, and permission behavior must be derived from the backend contract and accepted in an ADR before implementation.

The client may use permissions to explain or remove unavailable actions, but every privileged operation is authorized again by the server. Handle unauthenticated, MFA-required, forbidden, expired, and temporarily unavailable states distinctly.
