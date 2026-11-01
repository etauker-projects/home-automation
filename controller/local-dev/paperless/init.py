# Runs inside `manage.py shell` (paperless-init service). Safe to run repeatedly.
import os
import shutil
from pathlib import Path

from django.conf import settings
from django.contrib.auth.models import User
from documents.models import Document
from rest_framework.authtoken.models import Token

admin = User.objects.get(username=os.environ['PAPERLESS_ADMIN_USER'])
key = os.environ['PAPERLESS_DEV_TOKEN']
Token.objects.filter(user=admin).exclude(key=key).delete()
Token.objects.get_or_create(user=admin, key=key)
print(f'[paperless-init] API token ready for {admin.username}')

if Document.objects.exists():
    print('[paperless-init] documents already present, skipping samples')
else:
    for pdf in sorted(Path('/local-dev/sample-docs').glob('*.pdf')):
        shutil.copy(pdf, Path(settings.CONSUMPTION_DIR) / pdf.name)
        print(f'[paperless-init] queued {pdf.name} for consumption')
