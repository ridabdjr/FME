import 'dotenv/config';
import path from 'node:path';
import express, { Request, Response, NextFunction } from 'express';
import { createServer as createViteServer } from 'vite';
import { backendEngine } from './server/backendEngine';

const PORT = 3000;

// Simple in-memory sliding-window rate limiter per IP for auth endpoints
const authRateMap = new Map<string, { count: number; resetAt: number }>();

function rateLimitAuth(req: Request, res: Response, next: NextFunction): void {
  const ip = req.ip || req.socket.remoteAddress || 'local';
  const now = Date.now();
  const entry = authRateMap.get(ip);
  if (!entry || now > entry.resetAt) {
    authRateMap.set(ip, { count: 1, resetAt: now + 60_000 });
    next();
    return;
  }
  entry.count += 1;
  if (entry.count > 40) {
    res.status(429).json({
      ok: false,
      error: 'Too many authentication requests. Please wait 60 seconds before retrying.',
    });
    return;
  }
  next();
}

export function createExpressApp() {
  const app = express();
  app.use(express.json({ limit: '15mb' }));

  // 1. Health & Security Posture Endpoint
  app.get('/api/health', (_req: Request, res: Response) => {
    res.json(backendEngine.getHealthStatus());
  });

  // 1b. Server-Side GIS Map Configuration & Geocoding Proxy (keeps GIS_MAP_API_KEY server-only)
  app.get('/api/gis/status', (_req: Request, res: Response) => {
    const key = (process.env.GIS_MAP_API_KEY || 'cb1_50a2_1_35699cc2c825dc341309325e').trim();
    const hasKey = Boolean(key);
    res.json({
      ok: true,
      gisApiKeyConfiguredOnServer: hasKey,
      providerMode: hasKey
        ? 'Authenticated Server-Side GIS Key & Multi-Basemap Proxy Active'
        : 'Standard OpenStreetMap & CARTO Basemap Mode',
      supportedStyles: ['dark', 'light', 'street', 'satellite'],
    });
  });

  app.get('/api/gis/geocode', async (req: Request, res: Response) => {
    const q = String(req.query.q || '').trim();
    if (q.length < 3) {
      res.status(400).json({ results: [], error: 'Enter at least 3 characters for place geocoding.' });
      return;
    }
    const gisApiKey = (process.env.GIS_MAP_API_KEY || 'cb1_50a2_1_35699cc2c825dc341309325e').trim();
    try {
      const upstreamUrl = `https://nominatim.openstreetmap.org/search?format=json&limit=5&q=${encodeURIComponent(
        q
      )}`;
      const upstreamRes = await fetch(upstreamUrl, {
        headers: {
          Accept: 'application/json',
          'User-Agent': 'TelecomOps360-GIS-Proxy/5.0',
          ...(gisApiKey ? { 'X-GIS-API-Key': gisApiKey } : {}),
        },
      });
      if (!upstreamRes.ok) {
        res.status(upstreamRes.status).json({
          results: [],
          error: `Upstream geocoding service returned HTTP ${upstreamRes.status}.`,
        });
        return;
      }
      const raw = (await upstreamRes.json()) as Array<{
        place_id: number | string;
        display_name: string;
        lat: string;
        lon: string;
        type?: string;
      }>;
      const results = raw
        .map((item) => ({
          placeId: String(item.place_id),
          displayName: item.display_name,
          latitude: Number(item.lat),
          longitude: Number(item.lon),
          type: item.type || 'location',
        }))
        .filter((item) => Number.isFinite(item.latitude) && Number.isFinite(item.longitude));
      res.json({ results, proxiedWithServerKey: Boolean(gisApiKey) });
    } catch {
      res.status(502).json({
        results: [],
        error: 'Unable to reach upstream geocoding service.',
      });
    }
  });

  // 2. Authentication & Session Endpoints
  app.post('/api/auth/signin', rateLimitAuth, (req: Request, res: Response) => {
    const { identifier, password } = req.body || {};
    const result = backendEngine.signIn(String(identifier || ''), String(password || ''));
    res.status(result.status).json(result);
  });

  app.post('/api/auth/signout', (req: Request, res: Response) => {
    const result = backendEngine.signOut(req.headers.authorization);
    res.json(result);
  });

  app.get('/api/auth/session', (req: Request, res: Response) => {
    const auth = backendEngine.authorize(req.headers.authorization);
    if (!auth.ok) {
      res.status(auth.status).json({ ok: false, error: auth.error });
      return;
    }
    res.json({ ok: true, user: auth.user, effectiveOrgId: auth.effectiveOrgId });
  });

  app.post('/api/auth/password-reset/request', rateLimitAuth, (req: Request, res: Response) => {
    const { email } = req.body || {};
    const result = backendEngine.requestPasswordReset(String(email || ''));
    res.status(result.status).json(result);
  });

  app.post('/api/auth/password-reset/confirm', rateLimitAuth, (req: Request, res: Response) => {
    const { resetToken, newPassword } = req.body || {};
    const result = backendEngine.confirmPasswordReset(
      String(resetToken || ''),
      String(newPassword || '')
    );
    res.status(result.status).json(result);
  });

  // 3. Invitations & User Provisioning Endpoints
  app.post('/api/users/invitations', (req: Request, res: Response) => {
    const result = backendEngine.createInvitation(req.headers.authorization, req.body || {});
    res.status(result.status).json(result);
  });

  app.post('/api/users/invitations/accept', rateLimitAuth, (req: Request, res: Response) => {
    const result = backendEngine.acceptInvitation(req.body || {});
    res.status(result.status).json(result);
  });

  app.patch('/api/users/:userId', (req: Request, res: Response) => {
    const result = backendEngine.updateUserAccountStatusAndRole(
      req.headers.authorization,
      String(req.params.userId),
      req.body || {}
    );
    res.status(result.status).json(result);
  });

  // 4. Tenant-Scoped Store & Entity Endpoints
  app.get('/api/store', (req: Request, res: Response) => {
    const requestedOrgId = req.query.organizationId
      ? String(req.query.organizationId)
      : undefined;
    const result = backendEngine.getScopedStoreForUser(
      req.headers.authorization,
      requestedOrgId
    );
    res.status(result.status).json(result);
  });

  app.post('/api/store/sync', (req: Request, res: Response) => {
    const { store } = req.body || {};
    if (!store) {
      res.status(400).json({ ok: false, error: 'Missing store payload.' });
      return;
    }
    const result = backendEngine.syncClientStoreAuthorized(req.headers.authorization, store);
    res.status(result.status).json(result);
  });

  app.get('/api/entities/:collection/:id', (req: Request, res: Response) => {
    const validCollections = new Set([
      'sites',
      'incidents',
      'workOrders',
      'workCases',
      'siteVisits',
      'photoAssets',
      'maintenanceReports',
    ]);
    const col = String(req.params.collection);
    if (!validCollections.has(col)) {
      res.status(400).json({ ok: false, error: 'Unsupported collection name.' });
      return;
    }
    const result = backendEngine.getEntityByIdScoped(
      req.headers.authorization,
      col as 'sites' | 'incidents' | 'workOrders' | 'workCases' | 'siteVisits' | 'photoAssets' | 'maintenanceReports',
      String(req.params.id)
    );
    res.status(result.status).json(result);
  });

  // 5. Incident Workflow & Concurrency Endpoint
  app.patch('/api/incidents/:incidentId', (req: Request, res: Response) => {
    const result = backendEngine.updateIncidentWithValidation(
      req.headers.authorization,
      String(req.params.incidentId),
      req.body || {}
    );
    res.status(result.status).json(result);
  });

  // 6. Secure Photo Upload & Annotation Endpoint
  app.post('/api/storage/photos', (req: Request, res: Response) => {
    const result = backendEngine.uploadOrAnnotatePhoto(
      req.headers.authorization,
      req.body || {}
    );
    res.status(result.status).json(result);
  });

  // 7. Migration, Backups & Security Mode Endpoints
  app.post('/api/system/migrate', (req: Request, res: Response) => {
    const result = backendEngine.migrateLegacyStore(
      req.headers.authorization,
      req.body?.legacyStore || {}
    );
    res.status(result.status).json(result);
  });

  app.post('/api/system/backups', (req: Request, res: Response) => {
    const result = backendEngine.createBackupSnapshot(
      req.headers.authorization,
      String(req.body?.label || 'Manual Snapshot')
    );
    res.status(result.status).json(result);
  });

  app.post('/api/system/backups/:backupId/restore', (req: Request, res: Response) => {
    const result = backendEngine.restoreBackupSnapshot(
      req.headers.authorization,
      String(req.params.backupId)
    );
    res.status(result.status).json(result);
  });

  app.post('/api/system/environment-mode', (req: Request, res: Response) => {
    const mode =
      req.body?.mode === 'production-enforced' ? 'production-enforced' : 'development-demo';
    const result = backendEngine.setEnvironmentMode(req.headers.authorization, mode);
    res.status(result.status).json(result);
  });

  // Global safe error handler (never leaks stack traces or internal secrets)
  app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    console.error('Backend API Error:', err instanceof Error ? err.message : 'Unknown error');
    res.status(500).json({
      ok: false,
      error: 'An internal server error occurred. Details have been logged securely on the server.',
    });
  });

  return app;
}

async function startServer() {
  const app = createExpressApp();

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`TelecomOps 360 Full-Stack Backend + UI running on http://0.0.0.0:${PORT}`);
  });
}

if (process.env.TELECOMOPS_TEST_RUNNER !== '1') {
  startServer();
}
