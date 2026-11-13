// Local / long-running server. On Vercel, api/index.js serves the same app.
const app = require('./app');
const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`🚀 Primers Store server running on http://localhost:${PORT}`);
  app.ensureDb().catch(err => console.error('❌ MongoDB connect failed:', err.message));
});
