import "server-only";
import { sql } from "@/lib/db";
import type { Role } from "@/lib/roles";

// Typed data-access helpers. All run server-side only.

export type DbUser = {
  id: string;
  name: string;
  email: string;
  role: Role;
};

export type DbRun = {
  id: string;
  role: Role;
  season: string | null;
  division: string | null;
  mode: "automation" | "manual";
  status: string;
  state: Record<string, unknown>;
  updated_at: string;
};

export type DbApproval = {
  id: string;
  step: string;
  seq: number;
  status: string;
  actor: string | null;
  decided_at: string | null;
};

export async function getUserByRole(role: Role): Promise<DbUser | null> {
  const rows = (await sql`
    SELECT id, name, email, role FROM users WHERE role = ${role} LIMIT 1
  `) as DbUser[];
  return rows[0] ?? null;
}

export async function getRunByRole(role: Role): Promise<DbRun | null> {
  const rows = (await sql`
    SELECT id, role, season, division, mode, status, state, updated_at
    FROM runs WHERE role = ${role} LIMIT 1
  `) as DbRun[];
  return rows[0] ?? null;
}

// Merge a partial state patch into the role's run and stamp updated_at.
export async function patchRunState(
  role: Role,
  patch: Record<string, unknown>,
): Promise<DbRun | null> {
  const rows = (await sql`
    UPDATE runs
    SET state = state || ${JSON.stringify(patch)}::jsonb,
        mode = COALESCE(${(patch.mode as string) ?? null}, mode),
        updated_at = now()
    WHERE role = ${role}
    RETURNING id, role, season, division, mode, status, state, updated_at
  `) as DbRun[];
  return rows[0] ?? null;
}

export async function getApprovals(runId: string): Promise<DbApproval[]> {
  return (await sql`
    SELECT id, step, seq, status, actor, decided_at
    FROM approvals WHERE run_id = ${runId} ORDER BY seq ASC
  `) as DbApproval[];
}

export async function decideApproval(
  runId: string,
  step: string,
  status: string,
  actor: string,
): Promise<DbApproval | null> {
  const rows = (await sql`
    UPDATE approvals
    SET status = ${status}, actor = ${actor}, decided_at = now()
    WHERE run_id = ${runId} AND step = ${step}
    RETURNING id, step, seq, status, actor, decided_at
  `) as DbApproval[];
  return rows[0] ?? null;
}

export async function addUpload(
  runId: string,
  upload: {
    filename: string;
    size: number;
    rowCount: number;
    readyCount: number;
    raw?: unknown;
  },
) {
  const rows = (await sql`
    INSERT INTO uploads (run_id, filename, size, row_count, ready_count, raw)
    VALUES (${runId}, ${upload.filename}, ${upload.size}, ${upload.rowCount},
            ${upload.readyCount}, ${JSON.stringify(upload.raw ?? null)}::jsonb)
    RETURNING id, filename, size, row_count, ready_count, created_at
  `) as Array<Record<string, unknown>>;
  return rows[0] ?? null;
}

export async function addAudit(
  runId: string | null,
  actor: string,
  action: string,
  detail?: unknown,
) {
  await sql`
    INSERT INTO audit_log (run_id, actor, action, detail)
    VALUES (${runId}, ${actor}, ${action}, ${JSON.stringify(detail ?? null)}::jsonb)
  `;
}

export async function getAudit(runId: string) {
  return (await sql`
    SELECT id, actor, action, detail, at
    FROM audit_log WHERE run_id = ${runId} ORDER BY at DESC LIMIT 200
  `) as Array<Record<string, unknown>>;
}
