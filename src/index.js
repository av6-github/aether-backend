import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import mongoSanitize from 'express-mongo-sanitize';
import hpp from 'hpp';
import http from 'http';
import { connectDB } from './utils/db.js';
import { authRouter } from './auth/auth.routes.js';
import { apiRouter } from './routes/index.js';
import { pluginBridgeRouter } from './plugins/pluginBridge.routes.js';
import { authMiddleware } from './middleware/auth.middleware.js';
import { globalRateLimiter } from './middleware/rateLimiter.middleware.js';
import { initSocketServer } from './notifications/socket.server.js';
import { startCronJobs } from './analytics/cron.service.js';

const app = express();
const server = http.createServer(app);

// ─── Socket.io ───
initSocketServer(server);

// ─── Hackathon Demo: Mock Third-Party Mini App ───
// Placed BEFORE helmet() to prevent strict CSP from blocking inline demo scripts
app.get('/demo-canteen', (req, res) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
      <title>Campus Canteen Tracker</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 20px; color: #334155; }
        .card { background: white; border-radius: 16px; padding: 20px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); margin-bottom: 20px; }
        h1 { color: #f59e0b; margin-top: 0; font-size: 24px; }
        .greeting { font-weight: bold; color: #6366f1; }
        .btn { background: #f59e0b; color: white; padding: 12px; border-radius: 8px; text-align: center; font-weight: bold; margin-top: 10px; }
        .item { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #e2e8f0; }
        .badge { background: #dcfce7; color: #166534; padding: 4px 8px; border-radius: 9999px; font-size: 12px; font-weight: bold; display: inline-block; margin-bottom: 10px; }
      </style>
    </head>
    <body>
      <div class="card">
        <h1>🍔 Canteen Tracker</h1>
        <div class="badge">Aether Secure Sandbox</div>
        <p>Welcome, <span class="greeting" id="userName">Loading...</span>!</p>
        <p style="font-size: 14px; color: #64748b;">This mini-app securely received your identity from Aether without asking you to log in again.</p>
      </div>

      <div class="card">
        <h2 style="font-size: 18px; margin-top:0;">Today's Menu</h2>
        <div class="item"><span>Masala Dosa</span><span>₹40</span></div>
        <div class="item"><span>Cold Coffee</span><span>₹30</span></div>
        <div class="item" style="border:none;"><span>Samosa (2 pcs)</span><span>₹20</span></div>
        <div id="actionBtn" class="btn" onclick="notifyMe()">🔔 Notify me when ready</div>
      </div>

      <script>
        var pluginToken = null;

        setTimeout(function() {
          try {
            var url = window.location.href || '';
            var tokenRaw = url.split('aetherToken=')[1];
            if (!tokenRaw) {
              document.getElementById('userName').innerText = "Guest (No Token)";
              return;
            }
            pluginToken = tokenRaw.split('&')[0];
            var payloadStr = pluginToken.split('.')[1];
            payloadStr = payloadStr.replace(/-/g, '+').replace(/_/g, '/');
            while (payloadStr.length % 4) { payloadStr += '='; }
            var payload = JSON.parse(window.atob(payloadStr));
            document.getElementById('userName').innerText = payload.name;
          } catch(e) {
            document.getElementById('userName').innerText = "Guest (Error)";
          }
        }, 100);

        function notifyMe() {
          if (!pluginToken) return alert('No secure token available');
          var btn = document.getElementById('actionBtn');
          btn.innerText = 'Sending...';
          
          fetch('/api/plugin-bridge/notify', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': 'Bearer ' + pluginToken
            },
            body: JSON.stringify({
              title: 'Your order is ready!',
              body: 'Please pick up your Masala Dosa at Counter 2.'
            })
          })
          .then(res => res.json())
          .then(data => {
            if (data.success) {
              btn.innerText = '✅ Notification Sent!';
              btn.style.background = '#16a34a';
            } else {
              alert('Error: ' + data.message);
              btn.innerText = 'Failed';
            }
          })
          .catch(err => {
            alert('Bridge Error');
            btn.innerText = 'Failed';
          });
        }
      </script>
    </body>
    </html>
  `);
});

// ─── Security ───
app.use(helmet());
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || '*',
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(mongoSanitize());
app.use(hpp());

// ─── Rate Limiting ───
app.use(globalRateLimiter);

// ─── Health Check ───
app.get('/health', (req, res) => res.json({ status: 'ok', service: 'monolith-gateway', ts: Date.now() }));

// ─── Public Routes (no auth) ───
app.use('/api/auth', authRouter);

// ─── Protected Routes (all require valid JWT) ───
// Plugin Bridge uses its own middleware
app.use('/api/plugin-bridge', pluginBridgeRouter);
app.use('/api', authMiddleware, apiRouter);

// ─── Error Handler ───
app.use((err, req, res, next) => {
  console.error('[Server Error]', err);
  const status = err.status || err.statusCode || 500;
  res.status(status).json({
    success: false,
    message: err.message || 'Internal Server Error',
    data: err.data,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
});

// ─── Start ───
const PORT = Number(process.env.PORT || 4000);

async function start() {
  await connectDB(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/aether_phase1_test');
  startCronJobs();
  server.listen(PORT, () => {
    console.log(`[Aether Backend] Running monolith server on port ${PORT}`);
  });
}

start().catch(console.error);

export { app, server };
