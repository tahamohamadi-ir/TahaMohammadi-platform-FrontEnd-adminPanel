"""Provision the hermetic journey backend: migrate + synthetic fixtures.

Run with the backend venv, cwd = the admin worktree, and ``HERMETIC_ROOT`` set.
Writes ONLY inside ``$HERMETIC_ROOT``. Never touches the backend repository, a
developer database, staging, or production.

Every record created here is explicitly synthetic:

* admin user  -> ``hermetic-journey@example.invalid`` (RFC 2606 reserved TLD)
* password    -> a fixed, published, non-secret test string
* TOTP secret -> the RFC 6238 example key, identical to
  ``Back-End/scripts/seed_e2e_fixtures.py``, so Node and django-otp derive the
  same code stream. It is a published test vector, not a credential.

No real owner content, profile claim, or publication is created.
"""

from __future__ import annotations

import os
import sys
from pathlib import Path

BACKEND_ROOT = Path(os.environ.get("HERMETIC_BACKEND_ROOT", "")).resolve()
if not BACKEND_ROOT.is_dir():
    raise SystemExit("HERMETIC_BACKEND_ROOT must point at the Back-End checkout")
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "hermetic_settings")

import django  # noqa: E402

django.setup()

from django.contrib.auth import get_user_model  # noqa: E402
from django_otp.plugins.otp_totp.models import TOTPDevice  # noqa: E402

# --- Synthetic fixture identity (test-only, never a real credential) --------
HERMETIC_EMAIL = "hermetic-journey@example.invalid"
HERMETIC_PASSWORD = "hermetic-journey-not-a-real-secret"
HERMETIC_USERNAME = "hermetic-journey-admin"
# RFC 6238 example key ("12345678901234567890") as hex.
HERMETIC_TOTP_KEY_HEX = "3132333435363738393031323334353637383930"


def main() -> None:
    User = get_user_model()
    user, created = User.objects.get_or_create(
        email=HERMETIC_EMAIL,
        defaults={
            "username": HERMETIC_USERNAME,
            "is_staff": True,
            "is_superuser": True,
        },
    )
    if not created:
        user.username = HERMETIC_USERNAME
    user.is_staff = True
    user.is_superuser = True
    user.set_password(HERMETIC_PASSWORD)
    user.save()

    device, _ = TOTPDevice.objects.get_or_create(
        user=user,
        name="hermetic",
        defaults={"confirmed": True, "key": HERMETIC_TOTP_KEY_HEX},
    )
    if device.key != HERMETIC_TOTP_KEY_HEX or not device.confirmed:
        device.key = HERMETIC_TOTP_KEY_HEX
        device.confirmed = True
        device.save(update_fields=["key", "confirmed"])

    print(
        f"hermetic fixtures ready: email={HERMETIC_EMAIL} "
        f"totp_device={device.persistent_id} db={os.environ['HERMETIC_ROOT']}"
    )


if __name__ == "__main__":
    main()
