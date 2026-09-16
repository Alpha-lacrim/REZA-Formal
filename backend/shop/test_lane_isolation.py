"""Settings guards must fail before opening a database connection."""
import os
import subprocess
import sys
from tempfile import TemporaryDirectory

from django.test import SimpleTestCase


class LaneIsolationTests(SimpleTestCase):
    def run_settings(self, module, changes):
        env = {key: value for key, value in os.environ.items() if not key.startswith('REZA_SQL_TEST')}
        env.update(changes)
        code = (
            'import importlib\n'
            'from django.core.exceptions import ImproperlyConfigured\n'
            'try:\n'
            f'    importlib.import_module("reza_backend.{module}")\n'
            'except ImproperlyConfigured:\n'
            '    pass\n'
            'else:\n'
            '    raise AssertionError("Unsafe test configuration accepted")\n'
        )
        result = subprocess.run([sys.executable, '-c', code], env=env, capture_output=True, timeout=15)
        self.assertEqual(result.returncode, 0, 'Isolation guard subprocess failed')

    def test_sql_requires_explicit_disposable_opt_in(self):
        self.run_settings('sql_test_settings', {})

    def test_sql_rejects_remote_database_hosts(self):
        self.run_settings('sql_test_settings', {'REZA_SQL_TEST': 'disposable', 'REZA_SQL_TEST_HOST': 'database.example.invalid'})

    def test_browser_settings_reject_unmarked_directory(self):
        with TemporaryDirectory(prefix='reza-e2e-') as directory:
            self.run_settings('e2e_settings', {'REZA_E2E_DIRECTORY': directory})
