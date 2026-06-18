const { getDb } = require('./database');

const db = getDb();

// Update Presona app version to use Internet Archive URL
const result = db.prepare(`
  UPDATE app_versions
  SET file_url = 'https://archive.org/download/presona-installer/Presona-Installer.exe'
  WHERE app_id = 1 AND version = '1.0.0'
`).run();

if (result.changes > 0) {
  console.log('✅ Presona download URL updated to Internet Archive');
} else {
  console.log('ℹ️ No Presona v1.0.0 record found to update');
}

process.exit(0);
