import os
import tempfile
from pathlib import Path
import pytest

# Tests never read user keys or mutate the preview's database.
os.environ['DATABASE_URL'] = 'sqlite:///' + str(Path(tempfile.mkdtemp(prefix='duizhao-stream-tests-')) / 'tests.db')

@pytest.fixture(autouse=True)
def mock_credentials(monkeypatch):
    monkeypatch.setattr('app.adapter.key_for', lambda model: '')
