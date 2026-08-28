# Workflow State Matrix

| Area | Required states |
|---|---|
| Session | checking, signed-out, MFA-required, active, expired, forbidden, unavailable |
| Query | loading, empty, ready, stale, error, retrying |
| Form | pristine, dirty, validating, invalid, saving, saved, conflict, failed |
| Publish | draft, scheduled, publishing, published, failed, archived |
| Upload | queued, validating, uploading, processing, ready, rejected, failed |
| Destructive action | idle, confirming, executing, succeeded, blocked, failed |

Each state needs an accessible name, truthful message, allowed actions, recovery path, and test.
