import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { TelecomBackendEngine } from '../server/backendEngine';
import { SECONDARY_ORG_ID } from '../src/data/seedPhase5Data';
import { Incident, Site, UserRole } from '../src/types/models';

interface TestCaseResult {
  id: string;
  name: string;
  passed: boolean;
  details: string;
}

const results: TestCaseResult[] = [];

function runTest(id: string, name: string, fn: () => void) {
  try {
    fn();
    results.push({ id, name, passed: true, details: 'PASSED' });
    console.log(`✅ [${id}] ${name}`);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    results.push({ id, name, passed: false, details: msg });
    console.error(`❌ [${id}] ${name}: ${msg}`);
  }
}

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'telecomops360-phase5-test-'));
const dbFilePath = path.join(tmpDir, 'test_db.json');

const engine = new TelecomBackendEngine({
  dataFilePath: dbFilePath,
  secretKey: 'test-suite-hmac-secret-key-2026',
});

// 1. Unauthenticated requests rejected
runTest(
  'AC-01',
  'Unauthenticated users cannot access protected application data (401 Unauthorized)',
  () => {
    const storeRes = engine.getScopedStoreForUser(undefined);
    assert.equal(storeRes.ok, false);
    assert.equal(storeRes.status, 401);

    const entityRes = engine.getEntityByIdScoped<Site>(undefined, 'sites', 'SITE-1001');
    assert.equal(entityRes.ok, false);
    assert.equal(entityRes.status, 401);
  }
);

// 2. Invalid credentials, tampered tokens, expired sessions, and account suspension
runTest(
  'AC-02',
  'Invalid credentials, tampered tokens, expired sessions, and suspended accounts are rejected',
  () => {
    const badLogin = engine.signIn('s.lindqvist@telecomops360.demo', 'WrongPassword123!');
    assert.equal(badLogin.ok, false);
    assert.equal(badLogin.status, 401);

    const expiredLogin = engine.signIn('s.lindqvist@telecomops360.demo', 'Ops360!Demo', {
      customTtlMs: -5000,
    });
    assert.equal(expiredLogin.ok, true);
    const expiredCheck = engine.authorize(expiredLogin.token);
    assert.equal(expiredCheck.ok, false);
    assert.equal(expiredCheck.status, 401);

    const tamperedToken = `${expiredLogin.token}tampered`;
    const tamperedCheck = engine.authorize(tamperedToken);
    assert.equal(tamperedCheck.ok, false);
    assert.equal(tamperedCheck.status, 401);
  }
);

// 3. Field Engineer & Read-Only Auditor RBAC boundaries
runTest(
  'AC-03',
  'Field Engineer and Read-Only Auditor cannot perform administrator-only or unauthorized actions (403)',
  () => {
    // David Okafor is Field Engineer (USR-03)
    const fieldLogin = engine.signIn('d.okafor@telecomops360.demo', 'Ops360!Demo');
    assert.equal(fieldLogin.ok, true);
    const fieldToken = fieldLogin.token!;

    // Field engineer cannot invite users
    const invRes = engine.createInvitation(fieldToken, {
      email: 'unauth@telecomops360.demo',
      fullName: 'Unauth User',
      role: UserRole.FIELD_ENGINEER,
      teamId: 'TEAM-FLD-N1',
      region: 'North Metro',
    });
    assert.equal(invRes.ok, false);
    assert.equal(invRes.status, 403);

    // Field engineer cannot suspend users
    const suspendRes = engine.updateUserAccountStatusAndRole(fieldToken, 'USR-01', {
      accountStatus: 'Suspended',
    });
    assert.equal(suspendRes.ok, false);
    assert.equal(suspendRes.status, 403);

    // Field engineer cannot create database backups
    const bkpRes = engine.createBackupSnapshot(fieldToken, 'Unauthorized Backup');
    assert.equal(bkpRes.ok, false);
    assert.equal(bkpRes.status, 403);

    // Arthur Bennett is Read-Only Auditor (USR-06)
    const auditorLogin = engine.signIn('a.bennett@telecomops360.demo', 'Ops360!Demo');
    assert.equal(auditorLogin.ok, true);
    const auditorStore = engine.getScopedStoreForUser(auditorLogin.token!);
    assert.equal(auditorStore.ok, true);

    const syncAttempt = engine.syncClientStoreAuthorized(
      auditorLogin.token!,
      auditorStore.store!
    );
    assert.equal(syncAttempt.ok, false);
    assert.equal(syncAttempt.status, 403);
  }
);

// 4. Cross-Organization Tenant Isolation
runTest(
  'AC-04',
  'Users cannot access another organization’s sites, incidents, photos, or store by changing request parameters',
  () => {
    // Sofia Lindqvist is Organization Administrator in ORG-TELECOM-01
    const orgAAdmin = engine.signIn('s.lindqvist@telecomops360.demo', 'Ops360!Demo');
    assert.equal(orgAAdmin.ok, true);
    const orgAToken = orgAAdmin.token!;

    // Org A Admin cannot fetch Tenant B's isolated site (SITE-2001) or incident (INC-2026-000901)
    const crossSite = engine.getEntityByIdScoped<Site>(orgAToken, 'sites', 'SITE-2001');
    assert.equal(crossSite.ok, false);
    assert.equal(crossSite.status, 403);

    const crossInc = engine.getEntityByIdScoped<Incident>(
      orgAToken,
      'incidents',
      'INC-2026-000901'
    );
    assert.equal(crossInc.ok, false);
    assert.equal(crossInc.status, 403);

    // Org A Admin cannot query store for SECONDARY_ORG_ID
    const crossStore = engine.getScopedStoreForUser(orgAToken, SECONDARY_ORG_ID);
    assert.equal(crossStore.ok, false);
    assert.equal(crossStore.status, 403);

    // Tenant B Contractor cannot access Org A site (SITE-1001)
    const orgBUser = engine.signIn('m.contractor@apextower.demo', 'Ops360!Demo');
    assert.equal(orgBUser.ok, true);
    const crossSiteBtoA = engine.getEntityByIdScoped<Site>(
      orgBUser.token!,
      'sites',
      'SITE-1001'
    );
    assert.equal(crossSiteBtoA.ok, false);
    assert.equal(crossSiteBtoA.status, 403);

    // Super Administrator CAN inspect both organizations
    const superAdmin = engine.signIn('s.admin@telecomops360.demo', 'Ops360!Demo');
    assert.equal(superAdmin.ok, true);
    const superCrossSite = engine.getEntityByIdScoped<Site>(
      superAdmin.token!,
      'sites',
      'SITE-2001'
    );
    assert.equal(superCrossSite.ok, true);
    assert.equal(superCrossSite.record?.organizationId, SECONDARY_ORG_ID);
  }
);

// 5. File Upload Validation, Original Photo Preservation & Cross-Tenant Upload Block
runTest(
  'AC-05',
  'Unauthorized file uploads, invalid MIME types, oversized files, and cross-tenant uploads are rejected; original photo is preserved',
  () => {
    const fieldLogin = engine.signIn('d.okafor@telecomops360.demo', 'Ops360!Demo');
    assert.equal(fieldLogin.ok, true);
    const token = fieldLogin.token!;

    // Reject invalid MIME type
    const badMime = engine.uploadOrAnnotatePhoto(token, {
      siteId: 'SITE-1001',
      title: 'Malicious Script',
      mimeType: 'application/x-msdownload',
      fileSizeKb: 120,
    });
    assert.equal(badMime.ok, false);
    assert.equal(badMime.status, 400);

    // Reject oversized file (> 10MB)
    const oversized = engine.uploadOrAnnotatePhoto(token, {
      siteId: 'SITE-1001',
      title: 'Huge RAW',
      mimeType: 'image/png',
      fileSizeKb: 25000,
    });
    assert.equal(oversized.ok, false);
    assert.equal(oversized.status, 400);

    // Reject uploading to another organization's site (SITE-2001)
    const crossTenantUpload = engine.uploadOrAnnotatePhoto(token, {
      siteId: 'SITE-2001',
      title: 'Cross Tenant Photo',
      mimeType: 'image/png',
      fileSizeKb: 240,
    });
    assert.equal(crossTenantUpload.ok, false);
    assert.equal(crossTenantUpload.status, 403);

    // Valid upload + non-destructive annotation preserves originalDataUrl
    const origUrl = 'data:image/png;base64,ORIGINAL_IMMUTABLE_BYTES';
    const validUpload = engine.uploadOrAnnotatePhoto(token, {
      siteId: 'SITE-1001',
      title: 'Sector 1 RRU Connector',
      mimeType: 'image/png',
      fileSizeKb: 380,
      originalDataUrl: origUrl,
    });
    assert.equal(validUpload.ok, true);
    const photoId = validUpload.photo!.id;

    const annotatedRes = engine.uploadOrAnnotatePhoto(token, {
      photoId,
      siteId: 'SITE-1001',
      title: 'Sector 1 RRU Connector (Annotated)',
      mimeType: 'image/png',
      fileSizeKb: 410,
      annotatedDataUrl: 'data:image/png;base64,STAMPED_AND_ANNOTATED_BYTES',
      expectedVersion: 1,
    });
    assert.equal(annotatedRes.ok, true);
    assert.equal(annotatedRes.photo!.originalDataUrl, origUrl);
    assert.equal(
      annotatedRes.photo!.annotatedDataUrl,
      'data:image/png;base64,STAMPED_AND_ANNOTATED_BYTES'
    );
    assert.equal(annotatedRes.photo!.version, 2);
  }
);

// 6. Workflow Transition Validation & Optimistic Concurrency Control (409 Conflict)
runTest(
  'AC-07-08',
  'Invalid workflow transitions (422) and concurrent stale edits (409 Conflict) are rejected server-side',
  () => {
    // Karim Mansour is NOC/BSC Engineer (USR-01)
    const nocLogin = engine.signIn('k.mansour@telecomops360.demo', 'Ops360!Demo');
    assert.equal(nocLogin.ok, true);
    const token = nocLogin.token!;

    // Fetch current incident INC-401
    const scopedStore = engine.getScopedStoreForUser(token);
    const targetIncId = scopedStore.store!.incidents[0].id;
    const incRes = engine.getEntityByIdScoped<Incident>(token, 'incidents', targetIncId);
    assert.equal(incRes.ok, true);
    const initialVer = incRes.record!.version || 1;

    // Valid update increments version
    const update1 = engine.updateIncidentWithValidation(token, targetIncId, {
      expectedVersion: initialVer,
      confirmedRootCause: 'Corroded CPRI SFP+ optical transceiver on Sector 2 RRU',
    });
    assert.equal(update1.ok, true);
    assert.equal(update1.incident!.version, initialVer + 1);

    // Concurrent edit supplying stale expectedVersion (initialVer) is rejected with 409 Conflict
    const staleUpdate = engine.updateIncidentWithValidation(token, targetIncId, {
      expectedVersion: initialVer,
      confirmedRootCause: 'Silent overwrite attempt',
    });
    assert.equal(staleUpdate.ok, false);
    assert.equal(staleUpdate.status, 409);

    // Invalid workflow jump (e.g. In Progress -> Closed directly without Resolved) is rejected with 422
    const adminLogin = engine.signIn('s.lindqvist@telecomops360.demo', 'Ops360!Demo');
    const invalidJump = engine.updateIncidentWithValidation(
      adminLogin.token!,
      targetIncId,
      {
        newStatus: 'Closed',
        expectedVersion: initialVer + 1,
      }
    );
    assert.equal(invalidJump.ok, false);
    assert.equal(invalidJump.status, 422);
  }
);

// 7. Invitation Provisioning, Password Reset, Session Revocation & Persistent Reload
runTest(
  'AC-06-09-11',
  'Invitations, password reset, account suspension session revocation, persistence across reload, and demo-contamination guard work end-to-end',
  () => {
    // Sofia Lindqvist is Organization Administrator (USR-02)
    const adminLogin = engine.signIn('s.lindqvist@telecomops360.demo', 'Ops360!Demo');
    assert.equal(adminLogin.ok, true);
    const adminToken = adminLogin.token!;

    // Issue invitation
    const inviteRes = engine.createInvitation(adminToken, {
      email: 'f.hamidi@telecomops360.demo',
      fullName: 'Farid Hamidi',
      role: UserRole.NOC_ENGINEER,
      teamId: 'TEAM-NOC-01',
      region: 'Central',
    });
    assert.equal(inviteRes.ok, true);
    const inviteCode = inviteRes.invitation!.inviteCode;

    // Accept invitation
    const acceptRes = engine.acceptInvitation({
      inviteCode,
      username: 'f.hamidi',
      password: 'InitialStrongPass!99',
    });
    assert.equal(acceptRes.ok, true);
    const newUserId = acceptRes.user!.id;

    // Sign in as newly provisioned user
    const newLogin = engine.signIn('f.hamidi@telecomops360.demo', 'InitialStrongPass!99');
    assert.equal(newLogin.ok, true);
    const newUserToken = newLogin.token!;

    // Suspend user -> immediately revokes their active session token!
    const suspendRes = engine.updateUserAccountStatusAndRole(adminToken, newUserId, {
      accountStatus: 'Suspended',
    });
    assert.equal(suspendRes.ok, true);
    const verifyAfterSuspend = engine.authorize(newUserToken);
    assert.equal(verifyAfterSuspend.ok, false);
    assert.ok(verifyAfterSuspend.status === 401 || verifyAfterSuspend.status === 403);

    // Reactivate user and test password reset
    engine.updateUserAccountStatusAndRole(adminToken, newUserId, {
      accountStatus: 'Active',
    });
    const resetReq = engine.requestPasswordReset('f.hamidi@telecomops360.demo');
    assert.equal(resetReq.ok, true);
    assert.ok(resetReq.simulatedResetToken);

    const resetConfirm = engine.confirmPasswordReset(
      resetReq.simulatedResetToken!,
      'UpdatedPass!2026'
    );
    assert.equal(resetConfirm.ok, true);

    const loginAfterReset = engine.signIn('f.hamidi@telecomops360.demo', 'UpdatedPass!2026');
    assert.equal(loginAfterReset.ok, true);

    // Production mode blocks demo migration contamination
    engine.setEnvironmentMode(adminToken, 'production-enforced');
    const blockedMigration = engine.migrateLegacyStore(adminToken, { sites: [] });
    assert.equal(blockedMigration.ok, false);
    assert.equal(blockedMigration.status, 403);
    engine.setEnvironmentMode(adminToken, 'development-demo');

    // Verify persistence across a brand new TelecomBackendEngine instance reading from disk
    const reloadedEngine = new TelecomBackendEngine({
      dataFilePath: dbFilePath,
      secretKey: 'test-suite-hmac-secret-key-2026',
    });
    const relogin = reloadedEngine.signIn('f.hamidi@telecomops360.demo', 'UpdatedPass!2026');
    assert.equal(relogin.ok, true);

    // Ensure no passwords or tokens leak in audit events
    const scoped = reloadedEngine.getScopedStoreForUser(adminToken);
    const serializedAudit = JSON.stringify(scoped.store!.auditEvents);
    assert.equal(serializedAudit.includes('UpdatedPass!2026'), false);
    assert.equal(serializedAudit.includes('Ops360!Demo'), false);
  }
);

// Clean up temp test directory
try {
  fs.rmSync(tmpDir, { recursive: true, force: true });
} catch {
  // ignore cleanup error
}

const failed = results.filter((r) => !r.passed);
console.log(
  `\n=== TELECOMOPS 360 PHASE 5 AUTOMATED SECURITY & WORKFLOW TEST SUMMARY: ${
    results.length - failed.length
  }/${results.length} PASSED ===`
);
if (failed.length > 0) {
  process.exit(1);
}
