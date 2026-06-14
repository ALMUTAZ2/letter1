const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

if (!code.includes('export default app;')) {
  // Move const app = express(); app.use(express.json()); UP
  code = code.replace(/async function startServer\(\) \{\s+await ensureSeedAndSetup\(\);\s+startMasterSchedule\(\);\s+const app = express\(\);\s+app\.use\(express\.json\(\)\);/, 
`const app = express();
app.use(express.json());

// Run seed asynchronously without blocking
ensureSeedAndSetup().catch(console.error);
startMasterSchedule();

// Keep everything below in app as routes, and wrap the Vite/listen logic
`);

    // The routes are now directly on `app`. We just need to fix the end of `server.ts`.
  code = code.replace(/if\s*\(process\.env\.NODE_ENV !== "production"\)\s*\{\s*const vite = await createViteServer\([\s\S]*?startServer\(\);/,
`async function startDevServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(process.cwd(), "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(process.cwd(), "dist", "index.html"));
    });
  }

  if (!process.env.VERCEL) {
    const PORT = 3000;
    app.listen(PORT, "0.0.0.0", () => {
      console.log(\`Server executing natively on http://0.0.0.0:\${PORT}\`);
    });
  }
}

if (!process.env.VERCEL) {
  startDevServer();
} else {
  // On Vercel, serve static files (Vite build output) as fallback for unmatched routes
  app.use(express.static(path.join(process.cwd(), "dist")));
}

export default app;`);

  fs.writeFileSync('server.ts', code);
  console.log('Fixed server.ts');
} else {
  console.log('Already exported default app');
}
