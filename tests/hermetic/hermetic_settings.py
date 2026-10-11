"""Hermetic journey settings — an ISOLATED overlay of the real backend stack.

PU-25 hermetic acceptance evidence. This module is NOT a backend change: it
lives in the admin-panel worktree and is injected via ``PYTHONPATH`` so
``manage.py`` can import it without any file in ``Back-End`` changing.

It reuses the real, unmodified ``config.settings.e2e`` (real Django apps, real
middleware, real Ninja routers, real auth/OTP/CSRF/If-Match guards) and only
redirects every mutable path into a disposable HERMETIC_ROOT:

* SQLite database  -> ``$HERMETIC_ROOT/db.sqlite3``
* uploaded media   -> ``$HERMETIC_ROOT/media``
* collected static -> ``$HERMETIC_ROOT/staticfiles``

Consequences that matter for honesty:

* The backend repository is never written to (no migrations, no ``__pycache__``
  differences beyond what an existing venv already produced, no media, no
  SQLite file, no ``e2e.sqlite3``).
* No production, staging or developer database is opened. ``ALLOWED_HOSTS`` is
  pinned to loopback and ``DEBUG`` stays on only because ``e2e`` sets it.
* Credentials are synthetic: the provisioning script creates an
  ``@example.invalid`` superuser with a *published* RFC 6238 test TOTP secret.
  No owner credential is read, stored or required.

``ADMIN_SPA_ROOT`` is supplied by the runner so Django serves the REAL built
admin bundle at ``/admin/`` — that is what makes the browser journey use the
production build output rather than the Vite dev server.
"""

from __future__ import annotations

import os
from pathlib import Path

# The real backend settings module. Everything below only redirects paths.
from config.settings.e2e import *  # noqa: F403

HERMETIC_ROOT = Path(os.environ["HERMETIC_ROOT"]).resolve()

DATABASES = {  # noqa: F405
    "default": {
        "ENGINE": "django.db.backends.sqlite3",
        "NAME": HERMETIC_ROOT / "db.sqlite3",
    }
}

MEDIA_ROOT = HERMETIC_ROOT / "media"  # noqa: F405
STATIC_ROOT = HERMETIC_ROOT / "staticfiles"  # noqa: F405

# The rebuild hook must stay off: a hermetic run must never dispatch an
# external product-runner process. The e2e profile already disables it, and we
# assert it rather than trusting the import.
assert REBUILD_TRIGGER_ENABLED is False, (  # noqa: F405
    "hermetic journey must not dispatch rebuild jobs"
)
assert PUBLICATION_RUNNER_ARGV == [], (  # noqa: F405
    "hermetic journey must not dispatch a publication runner"
)
