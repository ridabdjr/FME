import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import {
  getInitialSeedStore,
  TelecomDataStore,
  upgradeStoreToPhase5,
} from '../src/services/telecomRepository';
import {
  hasPermission,
  normalizeUserRole,
  PermissionAction,
} from '../src/security/permissions';
import {
  Alarm,
  AuditEvent,
  BackupSnapshotMetadata,
  BackendHealthStatus,
  Incident,
  IncidentStatus,
  MaintenanceReport,
  MigrationReport,
  Organization,
  PhotoAsset,
  ReportStatus,
  Site,
  SiteVisit,
  Team,
  User,
  UserAccountStatus,
  UserInvitation,
  UserRole,
  WorkOrder,
} from '../src/types/models';
import { PRIMARY_ORG_ID } from '../src/data/seedPhase5Data';

export interface PasswordCredentialRecord {
  userId: string;
  saltHex: string;
  hashHex: string;
  updatedAt: string;
}

export interface ServerSessionRecord {
  sessionId: string;
  userId: string;
  organizationId: string;
  role: UserRole;
  createdAtMs: number;
  expiresAtMs: number;
  revoked: boolean;
}

export interface PasswordResetTokenRecord {
  token: string;
  userId: string;
  email: string;
  expiresAtMs: number;
  used: boolean;
}

interface PersistentBackendDiskFormat {
  schemaVersion: string;
  store: TelecomDataStore;
  credentials: Record<string, PasswordCredentialRecord>;
  sessions: Record<string, ServerSessionRecord>;
  resetTokens: Record<string, PasswordResetTokenRecord>;
  backups: Record<string, { meta: BackupSnapshotMetadata; snapshot: TelecomDataStore }>;
}

const VALID_PHOTO_MIMES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/svg+xml',
]);

const VALID_INCIDENT_TRANSITIONS: Record<IncidentStatus, IncidentStatus[]> = {
  New: ['Acknowledged', 'Assigned', 'In Progress'],
  Acknowledged: ['Assigned', 'In Progress', 'Pending Parts or Access', 'Monitoring'],
  Assigned: ['In Progress', 'Pending Parts or Access', 'Monitoring', 'Resolved'],
  'In Progress': ['Pending Parts or Access', 'Monitoring', 'Resolved'],
  'Pending Parts or Access': ['In Progress', 'Monitoring', 'Resolved'],
  Monitoring: ['In Progress', 'Resolved'],
  Resolved: ['Closed', 'In Progress', 'Assigned'],
  Closed: ['In Progress', 'Assigned'], // Reopening requires incident:reopen
};

function hashPasswordScrypt(password: string, saltHex?: string): { saltHex: string; hashHex: string } {
  const salt = saltHex || crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(password, salt, 64).toString('hex');
  return { saltHex: salt, hashHex: derived };
}

function verifyPasswordScrypt(password: string, record: PasswordCredentialRecord): boolean {
  const computed = crypto.scryptSync(password, record.saltHex, 64);
  const expected = Buffer.from(record.hashHex, 'hex');
  if (computed.length !== expected.length) return false;
  return crypto.timingSafeEqual(computed, expected);
}

export class TelecomBackendEngine {
  private readonly dataFilePath: string;
  private readonly secretKey: string;
  private readonly startedAtMs: number;
  private state: PersistentBackendDiskFormat;

  constructor(options?: { dataFilePath?: string; secretKey?: string; inMemoryOnly?: boolean }) {
    this.startedAtMs = Date.now();
    this.secretKey =
      options?.secretKey ||
      process.env.TELECOMOPS_SESSION_SECRET ||
      'telecomops360-server-hmac-secret-key-v5-2026';
    const dataDir = path.resolve(process.cwd(), '.data');
    this.dataFilePath =
      options?.dataFilePath ||
      (options?.inMemoryOnly ? '' : path.join(dataDir, 'telecomops360_backend_db.json'));

    this.state = this.loadOrInitializeDiskState();
  }

  private loadOrInitializeDiskState(): PersistentBackendDiskFormat {
    if (this.dataFilePath && fs.existsSync(this.dataFilePath)) {
      try {
        const raw = fs.readFileSync(this.dataFilePath, 'utf-8');
        const parsed = JSON.parse(raw) as PersistentBackendDiskFormat;
        if (parsed && parsed.store && parsed.credentials) {
          parsed.store = upgradeStoreToPhase5(parsed.store);
          this.ensureSeedUserCredentials(parsed.store.users, parsed.credentials);
          return parsed;
        }
      } catch (err) {
        console.warn('Recovering backend database from seed state:', err);
      }
    }

    const initialStore = getInitialSeedStore();
    const credentials: Record<string, PasswordCredentialRecord> = {};
    this.ensureSeedUserCredentials(initialStore.users, credentials);

    const fresh: PersistentBackendDiskFormat = {
      schemaVersion: '5.0.0',
      store: initialStore,
      credentials,
      sessions: {},
      resetTokens: {},
      backups: {},
    };
    this.persistToDisk(fresh);
    return fresh;
  }

  private ensureSeedUserCredentials(
    users: User[],
    credentials: Record<string, PasswordCredentialRecord>
  ): void {
    const defaultDemoPass = process.env.TELECOMOPS_DEFAULT_DEMO_PASSWORD || 'Ops360!Demo';
    for (const u of users) {
      if (!credentials[u.id]) {
        const { saltHex, hashHex } = hashPasswordScrypt(defaultDemoPass);
        credentials[u.id] = {
          userId: u.id,
          saltHex,
          hashHex,
          updatedAt: new Date().toISOString(),
        };
      }
    }
  }

  private persistToDisk(stateToSave = this.state): void {
    if (!this.dataFilePath) return;
    try {
      const dir = path.dirname(this.dataFilePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      const tmpPath = `${this.dataFilePath}.tmp`;
      fs.writeFileSync(tmpPath, JSON.stringify(stateToSave, null, 2), 'utf-8');
      fs.renameSync(tmpPath, this.dataFilePath);
    } catch (err) {
      console.error('Failed to persist backend state to disk:', err);
    }
  }

  private signToken(payload: {
    sessionId: string;
    userId: string;
    organizationId: string;
    role: UserRole;
    exp: number;
  }): string {
    const dataB64 = Buffer.from(JSON.stringify(payload), 'utf-8').toString('base64url');
    const sig = crypto
      .createHmac('sha256', this.secretKey)
      .update(dataB64)
      .digest('base64url');
    return `${dataB64}.${sig}`;
  }

  private verifySignedToken(token: string): {
    ok: boolean;
    error?: string;
    status?: number;
    user?: User;
    session?: ServerSessionRecord;
  } {
    if (!token || !token.includes('.')) {
      return { ok: false, status: 401, error: 'Missing or malformed authentication token.' };
    }
    const [dataB64, providedSig] = token.split('.');
    const expectedSig = crypto
      .createHmac('sha256', this.secretKey)
      .update(dataB64)
      .digest('base64url');

    const a = Buffer.from(providedSig);
    const b = Buffer.from(expectedSig);
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
      return { ok: false, status: 401, error: 'Invalid token cryptographic signature.' };
    }

    let decoded: {
      sessionId: string;
      userId: string;
      organizationId: string;
      role: UserRole;
      exp: number;
    };
    try {
      decoded = JSON.parse(Buffer.from(dataB64, 'base64url').toString('utf-8'));
    } catch {
      return { ok: false, status: 401, error: 'Corrupted token payload.' };
    }

    if (Date.now() > decoded.exp) {
      return { ok: false, status: 401, error: 'Session token has expired. Please sign in again.' };
    }

    const session = this.state.sessions[decoded.sessionId];
    if (!session || session.revoked || Date.now() > session.expiresAtMs) {
      return {
        ok: false,
        status: 401,
        error: 'Session has been revoked or expired on the server.',
      };
    }

    const user = this.state.store.users.find((u) => u.id === decoded.userId);
    if (!user) {
      return { ok: false, status: 401, error: 'Authenticated operator record no longer exists.' };
    }

    if (!user.active || user.accountStatus === 'Suspended' || user.accountStatus === 'Inactive') {
      session.revoked = true;
      this.persistToDisk();
      return {
        ok: false,
        status: 403,
        error: `Operator account is ${user.accountStatus || 'Suspended'}. Access revoked.`,
      };
    }

    return { ok: true, user, session };
  }

  public appendAuditEvent(params: {
    actor?: User | null;
    actionType: AuditEvent['actionType'];
    entityType: AuditEvent['entityType'];
    entityId: string;
    summary: string;
    organizationId?: string;
    beforeValue?: string;
    afterValue?: string;
  }): AuditEvent {
    const ev: AuditEvent = {
      id: `AUD-${Date.now()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`,
      timestamp: new Date().toISOString(),
      actorId: params.actor?.id || 'UNAUTHENTICATED',
      actorName: params.actor?.fullName || 'Unauthenticated Client',
      actorRole: params.actor?.role || UserRole.AUDITOR,
      organizationId:
        params.organizationId || params.actor?.organizationId || PRIMARY_ORG_ID,
      teamId: params.actor?.teamId,
      actionType: params.actionType,
      entityType: params.entityType,
      entityId: params.entityId,
      summary: params.summary,
      beforeValue: params.beforeValue,
      afterValue: params.afterValue,
    };
    this.state.store.auditEvents.unshift(ev);
    return ev;
  }

  public authorize(
    token: string | undefined,
    requiredPermission?: PermissionAction,
    targetOrganizationId?: string
  ): {
    ok: boolean;
    status: number;
    error?: string;
    user?: User;
    effectiveOrgId?: string;
  } {
    if (!token) {
      return { ok: false, status: 401, error: 'Authentication required (401 Unauthorized).' };
    }
    const cleanToken = token.replace(/^Bearer\s+/i, '').trim();
    const verified = this.verifySignedToken(cleanToken);
    if (!verified.ok || !verified.user) {
      return {
        ok: false,
        status: verified.status || 401,
        error: verified.error || 'Authentication failed.',
      };
    }

    const user = verified.user;
    const isSuperAdmin = normalizeUserRole(user.role) === UserRole.SUPER_ADMIN;
    const userOrgId = user.organizationId || PRIMARY_ORG_ID;

    // Enforce tenant boundary before anything else
    if (targetOrganizationId && !isSuperAdmin && targetOrganizationId !== userOrgId) {
      this.appendAuditEvent({
        actor: user,
        actionType: 'AUTH_UNAUTHORIZED_ATTEMPT',
        entityType: 'Security',
        entityId: targetOrganizationId,
        organizationId: userOrgId,
        summary: `Blocked cross-organization access attempt by ${user.email} (${userOrgId}) targeting tenant ${targetOrganizationId}.`,
      });
      this.persistToDisk();
      return {
        ok: false,
        status: 403,
        error: `Cross-organization access denied: your account is scoped to ${userOrgId}.`,
      };
    }

    if (requiredPermission && !hasPermission(user.role, requiredPermission)) {
      this.appendAuditEvent({
        actor: user,
        actionType: 'AUTH_UNAUTHORIZED_ATTEMPT',
        entityType: 'Security',
        entityId: requiredPermission,
        organizationId: userOrgId,
        summary: `RBAC denied action '${requiredPermission}' for role '${user.role}' (${user.email}).`,
      });
      this.persistToDisk();
      return {
        ok: false,
        status: 403,
        error: `Insufficient permissions: role '${user.role}' is not authorized for '${requiredPermission}'.`,
      };
    }

    return {
      ok: true,
      status: 200,
      user,
      effectiveOrgId: targetOrganizationId && isSuperAdmin ? targetOrganizationId : userOrgId,
    };
  }

  // ============================================================================
  // 1. AUTHENTICATION, SESSIONS, INVITATIONS & PASSWORD RESET
  // ============================================================================

  public signIn(
    identifier: string,
    password: string,
    options?: { customTtlMs?: number }
  ): {
    ok: boolean;
    status: number;
    error?: string;
    token?: string;
    user?: User;
    expiresAt?: string;
  } {
    const cleanId = (identifier || '').trim().toLowerCase();
    if (!cleanId || !password) {
      return { ok: false, status: 400, error: 'Username/email and password are required.' };
    }

    const user = this.state.store.users.find(
      (u) => u.email.toLowerCase() === cleanId || u.username.toLowerCase() === cleanId
    );

    if (!user) {
      this.appendAuditEvent({
        actionType: 'AUTH_FAILED_SIGN_IN',
        entityType: 'Security',
        entityId: cleanId,
        summary: `Failed sign-in attempt for unknown identifier '${cleanId}'.`,
      });
      this.persistToDisk();
      return { ok: false, status: 401, error: 'Invalid operator identifier or password.' };
    }

    if (!user.active || user.accountStatus === 'Suspended' || user.accountStatus === 'Inactive') {
      this.appendAuditEvent({
        actor: user,
        actionType: 'AUTH_FAILED_SIGN_IN',
        entityType: 'Security',
        entityId: user.id,
        summary: `Blocked sign-in for ${user.accountStatus || 'Suspended'} account ${user.email}.`,
      });
      this.persistToDisk();
      return {
        ok: false,
        status: 403,
        error: `Account '${user.email}' is currently ${user.accountStatus || 'Suspended'}. Contact your Organization Administrator.`,
      };
    }

    const cred = this.state.credentials[user.id];
    if (!cred || !verifyPasswordScrypt(password, cred)) {
      this.appendAuditEvent({
        actor: user,
        actionType: 'AUTH_FAILED_SIGN_IN',
        entityType: 'Security',
        entityId: user.id,
        summary: `Invalid password supplied for account ${user.email}.`,
      });
      this.persistToDisk();
      return { ok: false, status: 401, error: 'Invalid operator identifier or password.' };
    }

    const ttlMs = options?.customTtlMs ?? 8 * 60 * 60 * 1000; // 8 hours default
    const nowMs = Date.now();
    const expMs = nowMs + ttlMs;
    const sessionId = `SES-${nowMs}-${crypto.randomBytes(6).toString('hex')}`;

    const sessionRecord: ServerSessionRecord = {
      sessionId,
      userId: user.id,
      organizationId: user.organizationId || PRIMARY_ORG_ID,
      role: normalizeUserRole(user.role),
      createdAtMs: nowMs,
      expiresAtMs: expMs,
      revoked: false,
    };
    this.state.sessions[sessionId] = sessionRecord;

    user.lastLoginAt = new Date(nowMs).toISOString();
    const token = this.signToken({
      sessionId,
      userId: user.id,
      organizationId: sessionRecord.organizationId,
      role: sessionRecord.role,
      exp: expMs,
    });

    this.appendAuditEvent({
      actor: user,
      actionType: 'AUTH_SIGN_IN',
      entityType: 'Security',
      entityId: user.id,
      summary: `Authenticated session established for ${user.fullName} (${user.role}) in organization ${sessionRecord.organizationId}.`,
    });
    this.persistToDisk();

    return {
      ok: true,
      status: 200,
      token,
      user: structuredClone(user),
      expiresAt: new Date(expMs).toISOString(),
    };
  }

  public signOut(token: string | undefined): { ok: boolean } {
    if (!token) return { ok: true };
    const cleanToken = token.replace(/^Bearer\s+/i, '').trim();
    const verified = this.verifySignedToken(cleanToken);
    if (verified.session) {
      verified.session.revoked = true;
      this.appendAuditEvent({
        actor: verified.user,
        actionType: 'AUTH_SIGN_OUT',
        entityType: 'Security',
        entityId: verified.user?.id || 'SESSION',
        summary: `Operator ${verified.user?.email} signed out and revoked session ${verified.session.sessionId}.`,
      });
      this.persistToDisk();
    }
    return { ok: true };
  }

  public requestPasswordReset(email: string): {
    ok: boolean;
    status: number;
    message: string;
    simulatedResetToken?: string;
  } {
    const cleanEmail = (email || '').trim().toLowerCase();
    const user = this.state.store.users.find((u) => u.email.toLowerCase() === cleanEmail);
    if (!user) {
      // Do not leak user enumeration; return generic confirmation
      return {
        ok: true,
        status: 200,
        message: 'If that corporate email is registered, a password reset token has been generated.',
      };
    }

    const resetToken = `RST-${crypto.randomBytes(12).toString('hex').toUpperCase()}`;
    this.state.resetTokens[resetToken] = {
      token: resetToken,
      userId: user.id,
      email: user.email,
      expiresAtMs: Date.now() + 30 * 60 * 1000, // 30 mins
      used: false,
    };

    this.appendAuditEvent({
      actor: user,
      actionType: 'AUTH_PASSWORD_RESET_REQUESTED',
      entityType: 'Security',
      entityId: user.id,
      summary: `Password reset workflow initiated for ${user.email} (SMTP in development fallback mode).`,
    });
    this.persistToDisk();

    return {
      ok: true,
      status: 200,
      message:
        'Password reset token generated. Because external SMTP relay is in Development Fallback mode, the verification token is returned below for testing.',
      simulatedResetToken: resetToken,
    };
  }

  public confirmPasswordReset(
    resetToken: string,
    newPassword: string
  ): { ok: boolean; status: number; error?: string } {
    if (!newPassword || newPassword.length < 8) {
      return {
        ok: false,
        status: 400,
        error: 'New password must be at least 8 characters long.',
      };
    }
    const rec = this.state.resetTokens[resetToken];
    if (!rec || rec.used || Date.now() > rec.expiresAtMs) {
      return {
        ok: false,
        status: 400,
        error: 'Invalid, expired, or already-used password reset token.',
      };
    }

    const user = this.state.store.users.find((u) => u.id === rec.userId);
    if (!user) {
      return { ok: false, status: 404, error: 'User account not found.' };
    }

    const { saltHex, hashHex } = hashPasswordScrypt(newPassword);
    this.state.credentials[user.id] = {
      userId: user.id,
      saltHex,
      hashHex,
      updatedAt: new Date().toISOString(),
    };
    rec.used = true;

    // Revoke existing sessions on password change
    Object.values(this.state.sessions).forEach((s) => {
      if (s.userId === user.id) s.revoked = true;
    });

    this.appendAuditEvent({
      actor: user,
      actionType: 'AUTH_PASSWORD_CHANGED',
      entityType: 'Security',
      entityId: user.id,
      summary: `Password reset completed and prior sessions revoked for ${user.email}.`,
    });
    this.persistToDisk();

    return { ok: true, status: 200 };
  }

  // ============================================================================
  // 2. TENANT-ISOLATED DATA ACCESS & QUERIES
  // ============================================================================

  public getScopedStoreForUser(token: string | undefined, requestedOrgId?: string): {
    ok: boolean;
    status: number;
    error?: string;
    store?: TelecomDataStore;
    user?: User;
  } {
    const auth = this.authorize(token);
    if (!auth.ok || !auth.user) {
      return { ok: false, status: auth.status, error: auth.error };
    }

    const user = auth.user;
    const isSuperAdmin = normalizeUserRole(user.role) === UserRole.SUPER_ADMIN;
    const userOrgId = user.organizationId || PRIMARY_ORG_ID;

    if (requestedOrgId && !isSuperAdmin && requestedOrgId !== userOrgId) {
      this.appendAuditEvent({
        actor: user,
        actionType: 'AUTH_UNAUTHORIZED_ATTEMPT',
        entityType: 'Security',
        entityId: requestedOrgId,
        summary: `Rejected cross-organization store query from ${user.email} (${userOrgId}) for ${requestedOrgId}.`,
      });
      this.persistToDisk();
      return {
        ok: false,
        status: 403,
        error: `Cross-organization query rejected: you do not have access to organization '${requestedOrgId}'.`,
      };
    }

    const activeOrgId =
      requestedOrgId && isSuperAdmin
        ? requestedOrgId
        : this.state.store.activeOrganizationId && isSuperAdmin
        ? this.state.store.activeOrganizationId
        : userOrgId;

    const filterByOrg = <T extends { organizationId?: string }>(items: T[]): T[] =>
      items.filter((item) => (item.organizationId || PRIMARY_ORG_ID) === activeOrgId);

    const canViewAudit = hasPermission(user.role, 'audit:view');
    const canViewContacts = hasPermission(user.role, 'user:view_contact_details');
    const canViewSensitiveAccess = hasPermission(user.role, 'site:view_sensitive_access');

    const scoped: TelecomDataStore = {
      ...this.state.store,
      activeOrganizationId: activeOrgId,
      organizations: isSuperAdmin
        ? structuredClone(this.state.store.organizations || [])
        : (this.state.store.organizations || []).filter((o) => o.id === userOrgId),
      operatorProjects: filterByOrg(this.state.store.operatorProjects || []),
      invitations: filterByOrg(this.state.store.invitations || []),
      integrationConnectors: filterByOrg(this.state.store.integrationConnectors || []),
      backupSnapshots: filterByOrg(this.state.store.backupSnapshots || []),
      migrationReports: filterByOrg(this.state.store.migrationReports || []),
      users: filterByOrg(this.state.store.users).map((u) => ({
        ...u,
        phone: canViewContacts ? u.phone : '[Restricted by Role]',
      })),
      teams: filterByOrg(this.state.store.teams),
      sites: filterByOrg(this.state.store.sites).map((s) => ({
        ...s,
        accessInstructions: canViewSensitiveAccess
          ? s.accessInstructions
          : '[Restricted Site Vault Access Code Masked]',
      })),
      equipment: filterByOrg(this.state.store.equipment),
      alarms: filterByOrg(this.state.store.alarms),
      incidents: filterByOrg(this.state.store.incidents),
      workOrders: filterByOrg(this.state.store.workOrders),
      workCases: filterByOrg(this.state.store.workCases || []),
      workTypeTaxonomy: this.state.store.workTypeTaxonomy || [],
      siteVisits: filterByOrg(this.state.store.siteVisits),
      maintenanceReports: filterByOrg(this.state.store.maintenanceReports),
      photoAssets: filterByOrg(this.state.store.photoAssets),
      gisFeatures: filterByOrg(this.state.store.gisFeatures),
      auditEvents: canViewAudit
        ? filterByOrg(this.state.store.auditEvents)
        : filterByOrg(this.state.store.auditEvents).slice(0, 15),
    };

    return { ok: true, status: 200, store: scoped, user };
  }

  public getEntityByIdScoped<
    T extends { id: string; organizationId?: string }
  >(
    token: string | undefined,
    collectionName:
      | 'sites'
      | 'incidents'
      | 'workOrders'
      | 'workCases'
      | 'siteVisits'
      | 'photoAssets'
      | 'maintenanceReports',
    entityId: string
  ): { ok: boolean; status: number; error?: string; record?: T } {
    const auth = this.authorize(token);
    if (!auth.ok || !auth.user) {
      return { ok: false, status: auth.status, error: auth.error };
    }
    const list = (this.state.store[collectionName] as unknown as T[]) || [];
    const found = list.find((item) => item.id === entityId);
    if (!found) {
      return { ok: false, status: 404, error: `Record '${entityId}' not found.` };
    }

    const recordOrg = found.organizationId || PRIMARY_ORG_ID;
    const orgCheck = this.authorize(token, undefined, recordOrg);
    if (!orgCheck.ok) {
      return { ok: false, status: orgCheck.status, error: orgCheck.error };
    }

    return { ok: true, status: 200, record: structuredClone(found) };
  }

  // ============================================================================
  // 3. USER ADMINISTRATION, INVITATIONS, SUSPENSION & ROLE MANAGEMENT
  // ============================================================================

  public createInvitation(
    token: string | undefined,
    input: {
      email: string;
      fullName: string;
      role: UserRole;
      teamId: string;
      region: string;
      isExternalContractor?: boolean;
      contractorCompany?: string;
    }
  ): { ok: boolean; status: number; error?: string; invitation?: UserInvitation } {
    const auth = this.authorize(token, 'users:invite');
    if (!auth.ok || !auth.user) {
      return { ok: false, status: auth.status, error: auth.error };
    }

    const email = (input.email || '').trim().toLowerCase();
    if (!email || !email.includes('@') || !input.fullName?.trim()) {
      return { ok: false, status: 400, error: 'Valid email and full name are required.' };
    }

    // Prevent non-Super-Admin from inviting a Super Administrator
    if (
      normalizeUserRole(input.role) === UserRole.SUPER_ADMIN &&
      normalizeUserRole(auth.user.role) !== UserRole.SUPER_ADMIN
    ) {
      return {
        ok: false,
        status: 403,
        error: 'Only a Super Administrator can provision another Super Administrator.',
      };
    }

    const invitation: UserInvitation = {
      id: `INV-${Date.now()}`,
      organizationId: auth.effectiveOrgId || PRIMARY_ORG_ID,
      email,
      fullName: input.fullName.trim(),
      role: normalizeUserRole(input.role),
      teamId: input.teamId || 'TEAM-NOC-01',
      region: input.region || 'North Metro',
      isExternalContractor: Boolean(input.isExternalContractor),
      contractorCompany: input.contractorCompany?.trim() || undefined,
      invitedByUserId: auth.user.id,
      invitedByName: auth.user.fullName,
      inviteCode: `INV-${crypto.randomBytes(4).toString('hex').toUpperCase()}`,
      status: 'Pending',
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    };

    this.state.store.invitations = [invitation, ...(this.state.store.invitations || [])];
    this.appendAuditEvent({
      actor: auth.user,
      actionType: 'USER_INVITED',
      entityType: 'User',
      entityId: invitation.id,
      summary: `Issued operator invitation ${invitation.inviteCode} for ${invitation.email} (${invitation.role}).`,
    });
    this.persistToDisk();

    return { ok: true, status: 201, invitation };
  }

  public acceptInvitation(input: {
    inviteCode: string;
    username: string;
    password: string;
    phone?: string;
  }): { ok: boolean; status: number; error?: string; user?: User } {
    const inv = (this.state.store.invitations || []).find(
      (i) => i.inviteCode === input.inviteCode && i.status === 'Pending'
    );
    if (!inv) {
      return { ok: false, status: 404, error: 'Invitation code is invalid or no longer pending.' };
    }
    if (!input.password || input.password.length < 8) {
      return { ok: false, status: 400, error: 'Password must be at least 8 characters.' };
    }
    if (
      this.state.store.users.some(
        (u) =>
          u.email.toLowerCase() === inv.email.toLowerCase() ||
          u.username.toLowerCase() === (input.username || '').trim().toLowerCase()
      )
    ) {
      return { ok: false, status: 409, error: 'Username or email is already registered.' };
    }

    const newUser: User = {
      id: `USR-${Date.now().toString().slice(-4)}`,
      username: (input.username || inv.email.split('@')[0]).trim(),
      email: inv.email,
      fullName: inv.fullName,
      role: inv.role,
      organizationId: inv.organizationId,
      teamId: inv.teamId,
      region: inv.region,
      title: inv.isExternalContractor
        ? `Contractor (${inv.contractorCompany || 'External'})`
        : `${inv.role}`,
      phone: input.phone || '+213 550 00 00 99',
      active: true,
      accountStatus: 'Active',
      emailVerified: true,
      isExternalContractor: inv.isExternalContractor,
      contractorCompany: inv.contractorCompany,
      shiftSchedule: 'Standard Shift (08:00–17:00 UTC)',
      onCallStatus: 'Standard Shift',
      specialties: ['Field Inspection', 'Preventive Maintenance'],
      availabilityStatus: 'Available',
      certifications: ['Telecom Safety Verified'],
      version: 1,
      updatedAt: new Date().toISOString(),
    };

    const { saltHex, hashHex } = hashPasswordScrypt(input.password);
    this.state.credentials[newUser.id] = {
      userId: newUser.id,
      saltHex,
      hashHex,
      updatedAt: new Date().toISOString(),
    };

    inv.status = 'Accepted';
    inv.acceptedAt = new Date().toISOString();
    this.state.store.users.push(newUser);

    this.appendAuditEvent({
      actor: newUser,
      actionType: 'USER_CREATED',
      entityType: 'User',
      entityId: newUser.id,
      organizationId: newUser.organizationId,
      summary: `Provisioned operator account ${newUser.email} (${newUser.role}) via approved invitation ${inv.inviteCode}.`,
    });
    this.persistToDisk();

    return { ok: true, status: 201, user: structuredClone(newUser) };
  }

  public updateUserAccountStatusAndRole(
    token: string | undefined,
    targetUserId: string,
    updates: {
      accountStatus?: UserAccountStatus;
      role?: UserRole;
      region?: string;
      teamId?: string;
      shiftSchedule?: string;
      onCallStatus?: User['onCallStatus'];
    }
  ): { ok: boolean; status: number; error?: string; user?: User } {
    const auth = this.authorize(token, 'users:manage');
    if (!auth.ok || !auth.user) {
      return { ok: false, status: auth.status, error: auth.error };
    }

    const target = this.state.store.users.find((u) => u.id === targetUserId);
    if (!target) {
      return { ok: false, status: 404, error: 'Target user not found.' };
    }

    const orgCheck = this.authorize(token, 'users:manage', target.organizationId);
    if (!orgCheck.ok) {
      return { ok: false, status: orgCheck.status, error: orgCheck.error };
    }

    const beforeSnapshot = `${target.role} | ${target.accountStatus || 'Active'}`;

    if (updates.role) {
      const normalizedNewRole = normalizeUserRole(updates.role);
      if (
        normalizedNewRole === UserRole.SUPER_ADMIN &&
        normalizeUserRole(auth.user.role) !== UserRole.SUPER_ADMIN
      ) {
        return {
          ok: false,
          status: 403,
          error: 'Only a Super Administrator can grant Super Administrator privileges.',
        };
      }
      target.role = normalizedNewRole;
    }

    if (updates.accountStatus) {
      target.accountStatus = updates.accountStatus;
      target.active = updates.accountStatus === 'Active';
      if (updates.accountStatus !== 'Active') {
        // Immediately revoke active sessions for suspended/inactive users
        Object.values(this.state.sessions).forEach((s) => {
          if (s.userId === target.id) s.revoked = true;
        });
      }
    }

    if (updates.region) target.region = updates.region;
    if (updates.teamId) target.teamId = updates.teamId;
    if (updates.shiftSchedule !== undefined) target.shiftSchedule = updates.shiftSchedule;
    if (updates.onCallStatus) target.onCallStatus = updates.onCallStatus;
    target.version = (target.version || 1) + 1;
    target.updatedAt = new Date().toISOString();

    const afterSnapshot = `${target.role} | ${target.accountStatus || 'Active'}`;
    this.appendAuditEvent({
      actor: auth.user,
      actionType: updates.accountStatus ? 'USER_STATUS_CHANGED' : 'USER_ROLE_CHANGED',
      entityType: 'User',
      entityId: target.id,
      organizationId: target.organizationId,
      beforeValue: beforeSnapshot,
      afterValue: afterSnapshot,
      summary: `Updated user ${target.email}: ${beforeSnapshot} -> ${afterSnapshot}.`,
    });
    this.persistToDisk();

    return { ok: true, status: 200, user: structuredClone(target) };
  }

  // ============================================================================
  // 4. WORKFLOW VALIDATION & OPTIMISTIC CONCURRENCY CONTROL (409 CONFLICT)
  // ============================================================================

  public updateIncidentWithValidation(
    token: string | undefined,
    incidentId: string,
    payload: {
      newStatus?: IncidentStatus;
      expectedVersion?: number;
      title?: string;
      confirmedRootCause?: string;
      correctiveAction?: string;
      resolutionSummary?: string;
      serviceRestored?: boolean;
      reopenReason?: string;
    }
  ): { ok: boolean; status: number; error?: string; incident?: Incident } {
    const requiredPerm: PermissionAction =
      payload.newStatus === 'Closed'
        ? 'incident:close'
        : payload.newStatus === 'Resolved'
        ? 'incident:verify_resolve'
        : 'incident:update_status';

    const auth = this.authorize(token, requiredPerm);
    if (!auth.ok || !auth.user) {
      return { ok: false, status: auth.status, error: auth.error };
    }

    const incident = this.state.store.incidents.find((i) => i.id === incidentId);
    if (!incident) {
      return { ok: false, status: 404, error: `Incident '${incidentId}' not found.` };
    }

    const tenantAuth = this.authorize(token, requiredPerm, incident.organizationId);
    if (!tenantAuth.ok) {
      return { ok: false, status: tenantAuth.status, error: tenantAuth.error };
    }

    const currentVersion = incident.version || 1;
    if (
      payload.expectedVersion !== undefined &&
      payload.expectedVersion !== currentVersion
    ) {
      return {
        ok: false,
        status: 409,
        error: `Concurrency conflict (409): Incident ${incident.id} was modified by another operator (current version ${currentVersion}, your submitted version ${payload.expectedVersion}). Refresh before saving.`,
      };
    }

    const prevStatus = incident.status;
    if (payload.newStatus && payload.newStatus !== prevStatus) {
      const allowedNext = VALID_INCIDENT_TRANSITIONS[prevStatus] || [];
      if (!allowedNext.includes(payload.newStatus)) {
        return {
          ok: false,
          status: 422,
          error: `Invalid workflow transition: cannot move Incident ${incident.id} directly from '${prevStatus}' to '${payload.newStatus}'.`,
        };
      }

      if (prevStatus === 'Closed' && !hasPermission(auth.user.role, 'incident:reopen')) {
        return {
          ok: false,
          status: 403,
          error: 'Reopening a Closed incident requires incident:reopen permission.',
        };
      }

      if (payload.newStatus === 'Closed' && prevStatus !== 'Resolved') {
        return {
          ok: false,
          status: 422,
          error: 'Incident must be verified in Resolved status before transitioning to Closed.',
        };
      }

      incident.status = payload.newStatus;
      if (payload.newStatus === 'Resolved') {
        incident.resolvedAt = new Date().toISOString();
        incident.resolutionVerifiedBy = auth.user.fullName;
      }
      if (payload.newStatus === 'Closed') {
        incident.closedAt = new Date().toISOString();
        incident.reviewedAndApprovedBy = auth.user.fullName;
      }
    }

    if (payload.title !== undefined) incident.title = payload.title;
    if (payload.confirmedRootCause !== undefined) {
      incident.confirmedRootCause = payload.confirmedRootCause;
    }
    if (payload.correctiveAction !== undefined) {
      incident.correctiveAction = payload.correctiveAction;
    }
    if (payload.resolutionSummary !== undefined) {
      incident.resolutionSummary = payload.resolutionSummary;
    }
    if (payload.serviceRestored) {
      incident.serviceRestoredAt = new Date().toISOString();
    }

    incident.version = currentVersion + 1;
    incident.updatedAt = new Date().toISOString();

    this.appendAuditEvent({
      actor: auth.user,
      actionType: 'INCIDENT_STATUS_CHANGED',
      entityType: 'Incident',
      entityId: incident.id,
      organizationId: incident.organizationId,
      beforeValue: `${prevStatus} (v${currentVersion})`,
      afterValue: `${incident.status} (v${incident.version})`,
      summary: `Updated Incident ${incident.id}: ${prevStatus} -> ${incident.status} (v${incident.version}).`,
    });
    this.persistToDisk();

    return { ok: true, status: 200, incident: structuredClone(incident) };
  }

  // ============================================================================
  // 5. SECURE PHOTO & DOCUMENT STORAGE VALIDATION
  // ============================================================================

  public uploadOrAnnotatePhoto(
    token: string | undefined,
    input: {
      photoId?: string;
      siteId: string;
      incidentId?: string;
      workOrderId?: string;
      visitId?: string;
      title: string;
      caption?: string;
      mimeType: string;
      fileSizeKb: number;
      originalDataUrl?: string;
      annotatedDataUrl?: string;
      expectedVersion?: number;
    }
  ): { ok: boolean; status: number; error?: string; photo?: PhotoAsset } {
    const isUpdate = Boolean(input.photoId);
    const perm: PermissionAction = isUpdate ? 'photo:annotate' : 'photo:upload';
    const auth = this.authorize(token, perm);
    if (!auth.ok || !auth.user) {
      return { ok: false, status: auth.status, error: auth.error };
    }

    if (!VALID_PHOTO_MIMES.has(input.mimeType)) {
      return {
        ok: false,
        status: 400,
        error: `Rejected file upload: unsupported MIME type '${input.mimeType}'. Only JPEG, PNG, WebP, and SVG technical images are permitted.`,
      };
    }

    if (input.fileSizeKb <= 0 || input.fileSizeKb > 10240) {
      return {
        ok: false,
        status: 400,
        error: `Rejected file upload: file size (${input.fileSizeKb} KB) exceeds maximum 10 MB limit or is empty.`,
      };
    }

    const site = this.state.store.sites.find((s) => s.id === input.siteId);
    if (!site) {
      return { ok: false, status: 404, error: `Linked site '${input.siteId}' not found.` };
    }

    const siteTenantCheck = this.authorize(token, perm, site.organizationId);
    if (!siteTenantCheck.ok) {
      return { ok: false, status: siteTenantCheck.status, error: siteTenantCheck.error };
    }

    if (isUpdate && input.photoId) {
      const existing = this.state.store.photoAssets.find((p) => p.id === input.photoId);
      if (!existing) {
        return { ok: false, status: 404, error: `Photo '${input.photoId}' not found.` };
      }
      const photoTenantCheck = this.authorize(token, perm, existing.organizationId);
      if (!photoTenantCheck.ok) {
        return { ok: false, status: photoTenantCheck.status, error: photoTenantCheck.error };
      }

      const currentVer = existing.version || 1;
      if (input.expectedVersion !== undefined && input.expectedVersion !== currentVer) {
        return {
          ok: false,
          status: 409,
          error: `Concurrency conflict (409) on Photo ${existing.id}: current version is ${currentVer}.`,
        };
      }

      // Preserve originalDataUrl untouched while updating annotatedDataUrl!
      if (input.annotatedDataUrl) {
        existing.annotatedDataUrl = input.annotatedDataUrl;
        existing.isAnnotated = true;
      }
      if (input.title) existing.title = input.title;
      if (input.caption !== undefined) existing.caption = input.caption;
      existing.version = currentVer + 1;
      existing.revisionHistory.unshift({
        id: `PREV-${Date.now()}`,
        revisionNumber: existing.revisionHistory.length + 1,
        timestamp: new Date().toISOString(),
        editorName: auth.user.fullName,
        editorRole: auth.user.role,
        summary: 'Saved server-validated annotation layer while preserving original image.',
        annotationCount: existing.annotations.length,
        stampEnabled: existing.stampConfig.enabled,
      });

      this.appendAuditEvent({
        actor: auth.user,
        actionType: 'PHOTO_ANNOTATED',
        entityType: 'PhotoAsset',
        entityId: existing.id,
        organizationId: existing.organizationId,
        summary: `Updated annotated overlay for photo ${existing.id} (v${existing.version}). Original photograph preserved unchanged.`,
      });
      this.persistToDisk();
      return { ok: true, status: 200, photo: structuredClone(existing) };
    }

    const newPhoto: PhotoAsset = {
      id: `PHO-2026-${Date.now().toString().slice(-4)}`,
      title: input.title.trim(),
      caption: input.caption || '',
      classification: 'Inspection',
      equipmentOrArea: 'Field Equipment',
      tags: ['Server-Verified Upload'],
      siteId: site.id,
      siteCode: site.siteCode,
      siteName: site.siteName,
      siteAddress: site.address,
      region: site.region,
      incidentId: input.incidentId,
      workOrderId: input.workOrderId,
      visitId: input.visitId,
      originalDataUrl: input.originalDataUrl || 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
      annotatedDataUrl: input.annotatedDataUrl,
      isAnnotated: Boolean(input.annotatedDataUrl),
      mimeType: input.mimeType as PhotoAsset['mimeType'],
      width: 1280,
      height: 860,
      fileSizeKb: input.fileSizeKb,
      captureTimestampSource: 'Not Recorded',
      uploadTimestamp: new Date().toISOString(),
      uploadedBy: auth.user.fullName,
      gpsCoordinates: {
        latitude: site.latitude,
        longitude: site.longitude,
        source: 'Site Registry',
      },
      annotations: [],
      stampConfig: {
        enabled: true,
        position: 'bottom-bar',
        layoutStyle: 'two-column-grid',
        fontSize: 'medium',
        backgroundOpacity: 0.85,
        visibleFields: ['organizationName', 'siteCode', 'siteName', 'uploadTimestamp', 'engineerName'],
        organizationName: 'National Carrier Operations Group — Alpha',
      },
      revisionHistory: [
        {
          id: `PREV-${Date.now()}`,
          revisionNumber: 1,
          timestamp: new Date().toISOString(),
          editorName: auth.user.fullName,
          editorRole: auth.user.role,
          summary: 'Initial server-validated photograph upload.',
          annotationCount: 0,
          stampEnabled: true,
        },
      ],
      organizationId: site.organizationId || PRIMARY_ORG_ID,
      version: 1,
    };

    this.state.store.photoAssets.unshift(newPhoto);
    this.appendAuditEvent({
      actor: auth.user,
      actionType: 'PHOTO_UPLOADED',
      entityType: 'PhotoAsset',
      entityId: newPhoto.id,
      organizationId: newPhoto.organizationId,
      summary: `Uploaded verified field photograph ${newPhoto.id} (${newPhoto.mimeType}, ${newPhoto.fileSizeKb} KB) for site ${site.siteCode}.`,
    });
    this.persistToDisk();

    return { ok: true, status: 201, photo: structuredClone(newPhoto) };
  }

  // ============================================================================
  // 6. SAFE CLIENT DEMO-DATA MIGRATION & BACKUP / RESTORE
  // ============================================================================

  public migrateLegacyStore(
    token: string | undefined,
    legacyPayload: Partial<TelecomDataStore>
  ): { ok: boolean; status: number; error?: string; report?: MigrationReport } {
    const auth = this.authorize(token, 'system:migrate_data');
    if (!auth.ok || !auth.user) {
      return { ok: false, status: auth.status, error: auth.error };
    }

    if (this.state.store.environmentMode === 'production-enforced') {
      return {
        ok: false,
        status: 403,
        error:
          'Demo data migration is blocked while environmentMode is set to production-enforced to prevent contaminating live operational records.',
      };
    }

    const validationErrors: string[] = [];
    const warnings: string[] = [];
    let duplicatesSkipped = 0;
    const migratedCounts: Record<string, number> = {
      sites: 0,
      incidents: 0,
      workOrders: 0,
      siteVisits: 0,
      reports: 0,
    };

    const targetOrgId = auth.effectiveOrgId || PRIMARY_ORG_ID;

    for (const s of legacyPayload.sites || []) {
      if (!s.id || !s.siteCode || !s.siteName) {
        validationErrors.push(`Skipped invalid Site record missing id/siteCode/siteName.`);
        continue;
      }
      if (this.state.store.sites.some((ex) => ex.id === s.id)) {
        duplicatesSkipped++;
        continue;
      }
      this.state.store.sites.push({
        ...s,
        organizationId: s.organizationId || targetOrgId,
        version: s.version || 1,
      });
      migratedCounts.sites++;
    }

    for (const inc of legacyPayload.incidents || []) {
      if (!inc.id || !inc.siteId) {
        validationErrors.push(`Skipped invalid Incident record '${inc.id || 'UNKNOWN'}' missing siteId.`);
        continue;
      }
      if (!this.state.store.sites.some((s) => s.id === inc.siteId)) {
        validationErrors.push(
          `Skipped Incident '${inc.id}': referenced Site '${inc.siteId}' does not exist.`
        );
        continue;
      }
      if (this.state.store.incidents.some((ex) => ex.id === inc.id)) {
        duplicatesSkipped++;
        continue;
      }
      this.state.store.incidents.push({
        ...inc,
        organizationId: inc.organizationId || targetOrgId,
        version: inc.version || 1,
      });
      migratedCounts.incidents++;
    }

    const report: MigrationReport = {
      migrationId: `MIG-${Date.now()}`,
      executedAt: new Date().toISOString(),
      executedBy: auth.user.fullName,
      organizationId: targetOrgId,
      sourceSchemaVersion: legacyPayload.schemaVersion || '4.0.0-localStorage',
      targetSchemaVersion: '5.0.0',
      status: validationErrors.length > 0 ? 'Completed with Warnings' : 'Success',
      migratedCounts,
      duplicatesSkipped,
      validationErrors,
      warnings,
    };

    this.state.store.migrationReports = [report, ...(this.state.store.migrationReports || [])];
    this.appendAuditEvent({
      actor: auth.user,
      actionType: 'DATA_MIGRATION_EXECUTED',
      entityType: 'System',
      entityId: report.migrationId,
      organizationId: targetOrgId,
      summary: `Executed schema migration ${report.migrationId}: status=${report.status}, duplicatesSkipped=${duplicatesSkipped}, validationErrors=${validationErrors.length}.`,
    });
    this.persistToDisk();

    return { ok: true, status: 200, report };
  }

  public createBackupSnapshot(
    token: string | undefined,
    label: string
  ): { ok: boolean; status: number; error?: string; backup?: BackupSnapshotMetadata } {
    const auth = this.authorize(token, 'backup:manage');
    if (!auth.ok || !auth.user) {
      return { ok: false, status: auth.status, error: auth.error };
    }

    const snapshotClone = structuredClone(this.state.store);
    const serialized = JSON.stringify(snapshotClone);
    const meta: BackupSnapshotMetadata = {
      id: `BKP-${Date.now()}`,
      organizationId: auth.effectiveOrgId || PRIMARY_ORG_ID,
      label: (label || 'Scheduled Operational Snapshot').trim(),
      schemaVersion: '5.0.0',
      createdAt: new Date().toISOString(),
      createdBy: auth.user.fullName,
      recordCounts: {
        users: snapshotClone.users.length,
        teams: snapshotClone.teams.length,
        sites: snapshotClone.sites.length,
        equipment: snapshotClone.equipment.length,
        alarms: snapshotClone.alarms.length,
        incidents: snapshotClone.incidents.length,
        workOrders: snapshotClone.workOrders.length,
        siteVisits: snapshotClone.siteVisits.length,
        reports: snapshotClone.maintenanceReports.length,
        photoAssets: snapshotClone.photoAssets.length,
        auditEvents: snapshotClone.auditEvents.length,
      },
      sizeBytes: Buffer.byteLength(serialized, 'utf-8'),
    };

    this.state.backups[meta.id] = { meta, snapshot: snapshotClone };
    this.state.store.backupSnapshots = [meta, ...(this.state.store.backupSnapshots || [])];

    this.appendAuditEvent({
      actor: auth.user,
      actionType: 'BACKUP_CREATED',
      entityType: 'System',
      entityId: meta.id,
      summary: `Created database backup snapshot ${meta.id} (${meta.label}, ${Math.round(meta.sizeBytes / 1024)} KB).`,
    });
    this.persistToDisk();

    return { ok: true, status: 201, backup: meta };
  }

  public restoreBackupSnapshot(
    token: string | undefined,
    backupId: string
  ): { ok: boolean; status: number; error?: string } {
    const auth = this.authorize(token, 'backup:manage');
    if (!auth.ok || !auth.user) {
      return { ok: false, status: auth.status, error: auth.error };
    }

    const entry = this.state.backups[backupId];
    if (!entry) {
      return { ok: false, status: 404, error: `Backup snapshot '${backupId}' not found.` };
    }

    // Preserve append-only audit trail across restores
    const existingAudits = structuredClone(this.state.store.auditEvents);
    this.state.store = structuredClone(entry.snapshot);
    this.state.store.auditEvents = existingAudits;
    this.state.store.backupSnapshots = Object.values(this.state.backups).map((b) => b.meta);

    this.appendAuditEvent({
      actor: auth.user,
      actionType: 'BACKUP_RESTORED',
      entityType: 'System',
      entityId: backupId,
      summary: `Restored operational database from snapshot ${backupId} (${entry.meta.label}). Append-only audit log preserved.`,
    });
    this.persistToDisk();

    return { ok: true, status: 200 };
  }

  public syncClientStoreAuthorized(
    token: string | undefined,
    incomingStore: TelecomDataStore
  ): { ok: boolean; status: number; error?: string } {
    const auth = this.authorize(token);
    if (!auth.ok || !auth.user) {
      return { ok: false, status: auth.status, error: auth.error };
    }

    if (normalizeUserRole(auth.user.role) === UserRole.AUDITOR) {
      return {
        ok: false,
        status: 403,
        error: 'Read-Only Auditors cannot modify operational records.',
      };
    }

    const userOrgId = auth.effectiveOrgId || PRIMARY_ORG_ID;
    const isSuperAdmin = normalizeUserRole(auth.user.role) === UserRole.SUPER_ADMIN;

    // Merge only records belonging to the authenticated user's organization so tenant B records can never be overwritten or deleted by tenant A
    const mergeTenantScoped = <T extends { id: string; organizationId?: string }>(
      serverList: T[],
      clientList: T[] | undefined
    ): T[] => {
      if (!Array.isArray(clientList)) return serverList;
      if (isSuperAdmin) return clientList;
      const otherTenantRecords = serverList.filter(
        (item) => (item.organizationId || PRIMARY_ORG_ID) !== userOrgId
      );
      const sanitizedClientRecords = clientList.map((item) => ({
        ...item,
        organizationId: userOrgId,
      }));
      return [...sanitizedClientRecords, ...otherTenantRecords];
    };

    this.state.store.sites = mergeTenantScoped(this.state.store.sites, incomingStore.sites);
    this.state.store.equipment = mergeTenantScoped(
      this.state.store.equipment,
      incomingStore.equipment
    );
    this.state.store.alarms = mergeTenantScoped(this.state.store.alarms, incomingStore.alarms);
    this.state.store.incidents = mergeTenantScoped(
      this.state.store.incidents,
      incomingStore.incidents
    );
    this.state.store.workOrders = mergeTenantScoped(
      this.state.store.workOrders,
      incomingStore.workOrders
    );
    this.state.store.workCases = mergeTenantScoped(
      this.state.store.workCases || [],
      incomingStore.workCases
    );
    if (incomingStore.workTypeTaxonomy && Array.isArray(incomingStore.workTypeTaxonomy)) {
      this.state.store.workTypeTaxonomy = incomingStore.workTypeTaxonomy;
    }
    this.state.store.siteVisits = mergeTenantScoped(
      this.state.store.siteVisits,
      incomingStore.siteVisits
    );
    this.state.store.maintenanceReports = mergeTenantScoped(
      this.state.store.maintenanceReports,
      incomingStore.maintenanceReports
    );
    this.state.store.photoAssets = mergeTenantScoped(
      this.state.store.photoAssets,
      incomingStore.photoAssets
    );
    this.state.store.gisFeatures = mergeTenantScoped(
      this.state.store.gisFeatures,
      incomingStore.gisFeatures
    );

    // Append-only audit protection: keep all server audit events and prepend any new client audit events
    const existingAuditIds = new Set(this.state.store.auditEvents.map((a) => a.id));
    const newAuditEvents = (incomingStore.auditEvents || [])
      .filter((a) => !existingAuditIds.has(a.id))
      .map((a) => ({
        ...a,
        actorId: auth.user!.id,
        actorName: auth.user!.fullName,
        actorRole: auth.user!.role,
        organizationId: userOrgId,
      }));
    this.state.store.auditEvents = [...newAuditEvents, ...this.state.store.auditEvents];
    this.state.store.lastUpdatedAt = new Date().toISOString();

    this.persistToDisk();
    return { ok: true, status: 200 };
  }

  public setEnvironmentMode(
    token: string | undefined,
    mode: 'development-demo' | 'production-enforced'
  ): { ok: boolean; status: number; error?: string } {
    const auth = this.authorize(token, 'org:manage_settings');
    if (!auth.ok || !auth.user) {
      return { ok: false, status: auth.status, error: auth.error };
    }
    const prev = this.state.store.environmentMode || 'development-demo';
    this.state.store.environmentMode = mode;
    this.appendAuditEvent({
      actor: auth.user,
      actionType: 'ORGANIZATION_UPDATED',
      entityType: 'Security',
      entityId: 'ENV-MODE',
      beforeValue: prev,
      afterValue: mode,
      summary: `Switched platform security enforcement mode from '${prev}' to '${mode}'.`,
    });
    this.persistToDisk();
    return { ok: true, status: 200 };
  }

  public getHealthStatus(): BackendHealthStatus {
    return {
      status: 'online',
      environmentMode: this.state.store.environmentMode || 'development-demo',
      schemaVersion: this.state.schemaVersion || '5.0.0',
      serverTimeUtc: new Date().toISOString(),
      storageEngine: this.dataFilePath
        ? 'Persistent Atomic JSON + File Repository (.data/telecomops360_backend_db.json)'
        : 'In-Memory Isolated Test Engine',
      activeOrganizationId: this.state.store.activeOrganizationId || PRIMARY_ORG_ID,
      tenantIsolationEnforced: true,
      rbacEnforced: true,
      uptimeSeconds: Math.floor((Date.now() - this.startedAtMs) / 1000),
    };
  }
}

export const backendEngine = new TelecomBackendEngine();
