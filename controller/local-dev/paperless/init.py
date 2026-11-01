# Runs inside `manage.py shell` (paperless-init service). Safe to run repeatedly.
import os
import shutil
from pathlib import Path

from django.conf import settings
from django.contrib.auth.models import User
from documents.models import Document, Tag
from rest_framework.authtoken.models import Token

admin = User.objects.get(username=os.environ['PAPERLESS_ADMIN_USER'])
key = os.environ['PAPERLESS_DEV_TOKEN']
Token.objects.filter(user=admin).exclude(key=key).delete()
Token.objects.get_or_create(user=admin, key=key)
print(f'[paperless-init] API token ready for {admin.username}')

# Inbox tag: paperless adds it to every newly consumed document (as in prod);
# the controller skips exporting documents that still carry it.
inbox, created = Tag.objects.get_or_create(name='inbox', defaults={'is_inbox_tag': True, 'owner': admin})
if not inbox.is_inbox_tag:
    inbox.is_inbox_tag = True
    inbox.save()
print(f'[paperless-init] inbox tag {"created" if created else "ready"}')

if Document.objects.exists():
    print('[paperless-init] documents already present, skipping samples')
else:
    for pdf in sorted(Path('/local-dev/sample-docs').glob('*.pdf')):
        shutil.copy(pdf, Path(settings.CONSUMPTION_DIR) / pdf.name)
        print(f'[paperless-init] queued {pdf.name} for consumption')
