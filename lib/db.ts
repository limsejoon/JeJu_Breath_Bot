import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";
import { findMergeTarget, isAnomalous, toGrid, distanceM, type PriorReport } from "./rules";
import { kstDay, nextDay, toKstIso } from "./time";
import type { OdorType } from "./constants";
import type { Extraction } from "./claude";

const SCHEMA = `
CREATE TABLE IF NOT EXISTS reports (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  user_hash     TEXT NOT NULL,
  text_masked   TEXT NOT NULL,
  intensity     INTEGER NOT NULL CHECK (intensity BETWEEN 1 AND 5),
  intensity_src TEXT NOT NULL CHECK (intensity_src IN ('ai', 'button')),
  odor_type     TEXT NOT NULL,
  symptoms      TEXT NOT NULL DEFAULT '[]',
  confidence    REAL,
  grid_lat      REAL NOT NULL,
  grid_lng      REAL NOT NULL,
  raw_lat       REAL,
  raw_lng       REAL,
  needs_review  INTEGER NOT NULL DEFAULT 0,
  merged_count  INTEGER NOT NULL DEFAULT 1,
  is_demo       INTEGER NOT NULL DEFAULT 0,
  reported_at   TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_reports_date ON reports (reported_at);
CREATE INDEX IF NOT EXISTS idx_reports_user ON reports (user_hash, reported_at);
-- 카카오톡 제보 대기열: 카톡에서 받은 문장을 위치 확인 페이지(/k/{token})로 넘기기 위한 임시 저장소
CREATE TABLE IF NOT EXISTS pending_reports (
  token       TEXT PRIMARY KEY,
  user_hash   TEXT NOT NULL,
  text_masked TEXT NOT NULL,
  extraction  TEXT NOT NULL,          -- Extraction JSON
  source      TEXT NOT NULL DEFAULT 'kakao',
  created_at  TEXT NOT NULL,
  report_id   INTEGER                 -- 접수 완료 시 reports.id
);
CREATE TABLE IF NOT EXISTS location_failures (
  day   TEXT PRIMARY KEY,
  count INTEGER NOT NULL DEFAULT 0
);
`;

const globalForDb = globalThis as unknown as { __jejuDb?: Database.Database };

export function openDb(file: string): Database.Database {
  if (file !== ":memory:") fs.mkdirSync(path.dirname(file), { recursive: true });
  const db = new Database(file);
  db.pragma("journal_mode = WAL");
  db.exec(SCHEMA);
  return db;
}

export function getDb(): Database.Database {
  const file = process.env.DB_PATH ?? "data/jeju-breath.db";
  globalForDb.__jejuDb ??= openDb(file === ":memory:" ? file : path.resolve(/*turbopackIgnore: true*/ file));
  return globalForDb.__jejuDb;
}

export interface NewReport {
  user_hash: string;
  text_masked: string;
  intensity: number;
  intensity_src: "ai" | "button";
  odor_type: OdorType;
  symptoms: string[];
  confidence: number | null;
  lat: number;
  lng: number;
  is_demo?: boolean;
  now?: Date;
}

export interface SaveResult {
  id: number;
  merged: boolean;
  needs_review: boolean;
  today_nearby_count: number;
  grid_lat: number;
  grid_lng: number;
}

const NEARBY_RADIUS_M = 1000;

/** 중복 병합·이상 판정 후 저장. 원시 좌표는 판정에만 쓰고 DB에는 남기지 않는다(raw_lat/raw_lng = NULL). */
export function saveReport(input: NewReport, db = getDb()): SaveResult {
  const now = input.now ?? new Date();
  const nowIso = toKstIso(now);
  const raw = { lat: input.lat, lng: input.lng };
  const grid = toGrid(input.lat, input.lng);

  const tx = db.transaction((): SaveResult => {
    const since = toKstIso(new Date(now.getTime() - 60 * 60 * 1000));
    const prior = db
      .prepare(
        `SELECT id, grid_lat, grid_lng, merged_count, reported_at FROM reports
         WHERE user_hash = ? AND reported_at >= ? ORDER BY reported_at DESC`,
      )
      .all(input.user_hash, since) as PriorReport[];

    const anomalous = isAnomalous(prior, raw, now);
    const mergeId = findMergeTarget(prior, raw, now);
    const fields = {
      text_masked: input.text_masked,
      intensity: input.intensity,
      intensity_src: input.intensity_src,
      odor_type: input.odor_type,
      symptoms: JSON.stringify(input.symptoms),
      confidence: input.confidence,
    };

    let id: number;
    let needsReview = anomalous;
    let gridOut = grid;
    if (mergeId !== null) {
      const existing = db.prepare(`SELECT needs_review, grid_lat, grid_lng FROM reports WHERE id = ?`).get(mergeId) as {
        needs_review: number;
        grid_lat: number;
        grid_lng: number;
      };
      needsReview = anomalous || existing.needs_review === 1;
      gridOut = { lat: existing.grid_lat, lng: existing.grid_lng };
      db.prepare(
        `UPDATE reports SET text_masked=@text_masked, intensity=@intensity, intensity_src=@intensity_src,
           odor_type=@odor_type, symptoms=@symptoms, confidence=@confidence,
           needs_review=@needs_review, merged_count = merged_count + 1
         WHERE id=@id`,
      ).run({ ...fields, needs_review: needsReview ? 1 : 0, id: mergeId });
      id = mergeId;
    } else {
      const info = db
        .prepare(
          `INSERT INTO reports (user_hash, text_masked, intensity, intensity_src, odor_type, symptoms, confidence,
             grid_lat, grid_lng, raw_lat, raw_lng, needs_review, merged_count, is_demo, reported_at)
           VALUES (@user_hash, @text_masked, @intensity, @intensity_src, @odor_type, @symptoms, @confidence,
             @grid_lat, @grid_lng, NULL, NULL, @needs_review, 1, @is_demo, @reported_at)`,
        )
        .run({
          ...fields,
          user_hash: input.user_hash,
          grid_lat: grid.lat,
          grid_lng: grid.lng,
          needs_review: anomalous ? 1 : 0,
          is_demo: input.is_demo ? 1 : 0,
          reported_at: nowIso,
        });
      id = Number(info.lastInsertRowid);
    }

    const today = listReports(kstDay(now), db).filter((r) => !r.needs_review);
    const today_nearby_count = today.filter(
      (r) => distanceM(gridOut, { lat: r.grid_lat, lng: r.grid_lng }) <= NEARBY_RADIUS_M,
    ).length;

    return { id, merged: mergeId !== null, needs_review: needsReview, today_nearby_count, grid_lat: gridOut.lat, grid_lng: gridOut.lng };
  });

  return tx();
}

export interface PublicReport {
  id: number;
  text_masked: string;
  intensity: number;
  intensity_src: "ai" | "button";
  odor_type: string;
  symptoms: string[];
  grid_lat: number;
  grid_lng: number;
  needs_review: boolean;
  merged_count: number;
  is_demo: boolean;
  reported_at: string;
}

/** 해당 일자의 공개용 제보 목록 (user_hash, raw 좌표 제외) */
export function listReports(day: string, db = getDb()): PublicReport[] {
  const rows = db
    .prepare(
      `SELECT id, text_masked, intensity, intensity_src, odor_type, symptoms, grid_lat, grid_lng,
              needs_review, merged_count, is_demo, reported_at
       FROM reports WHERE reported_at >= ? AND reported_at < ? ORDER BY reported_at ASC`,
    )
    .all(day, nextDay(day)) as (Omit<PublicReport, "symptoms" | "needs_review" | "is_demo"> & {
    symptoms: string;
    needs_review: number;
    is_demo: number;
  })[];
  return rows.map((r) => ({
    ...r,
    symptoms: safeParseArray(r.symptoms),
    needs_review: r.needs_review === 1,
    is_demo: r.is_demo === 1,
  }));
}

export function incrementLocationFailure(day = kstDay(), db = getDb()): number {
  db.prepare(
    `INSERT INTO location_failures (day, count) VALUES (?, 1)
     ON CONFLICT(day) DO UPDATE SET count = count + 1`,
  ).run(day);
  return getLocationFailures(day, db);
}

export function getLocationFailures(day: string, db = getDb()): number {
  const row = db.prepare(`SELECT count FROM location_failures WHERE day = ?`).get(day) as { count: number } | undefined;
  return row?.count ?? 0;
}

/** 공개 집계: 이상 의심(needs_review) 제보는 제외 */
export function getSummary(day: string, db = getDb()) {
  const row = db
    .prepare(
      `SELECT COUNT(*) AS total, COALESCE(SUM(CASE WHEN intensity >= 4 THEN 1 ELSE 0 END), 0) AS high
       FROM reports WHERE reported_at >= ? AND reported_at < ? AND needs_review = 0`,
    )
    .get(day, nextDay(day)) as { total: number; high: number };
  return { total: row.total, high_intensity_count: row.high, location_failures: getLocationFailures(day, db) };
}

function safeParseArray(s: string): string[] {
  try {
    const v = JSON.parse(s);
    return Array.isArray(v) ? v.map(String) : [];
  } catch {
    return [];
  }
}

/* ---------- 카카오톡 제보 대기열 ---------- */

export const PENDING_TTL_MS = 60 * 60 * 1000;

export interface PendingReport {
  token: string;
  user_hash: string;
  text_masked: string;
  extraction: Extraction;
  created_at: string;
  report_id: number | null;
}

export function createPending(
  p: { token: string; user_hash: string; text_masked: string; extraction: Extraction; now?: Date },
  db = getDb(),
) {
  const now = p.now ?? new Date();
  // 하루 지난 대기열은 정리한다
  db.prepare(`DELETE FROM pending_reports WHERE created_at < ?`).run(toKstIso(new Date(now.getTime() - 24 * 3600_000)));
  db.prepare(
    `INSERT INTO pending_reports (token, user_hash, text_masked, extraction, created_at) VALUES (?, ?, ?, ?, ?)`,
  ).run(p.token, p.user_hash, p.text_masked, JSON.stringify(p.extraction), toKstIso(now));
}

export type PendingLookup =
  | { status: "ok"; pending: PendingReport }
  | { status: "missing" }
  | { status: "expired" }
  | { status: "done"; pending: PendingReport };

export function getPending(token: string, now = new Date(), db = getDb()): PendingLookup {
  const row = db.prepare(`SELECT * FROM pending_reports WHERE token = ?`).get(token) as
    | (Omit<PendingReport, "extraction"> & { extraction: string })
    | undefined;
  if (!row) return { status: "missing" };
  const pending: PendingReport = { ...row, extraction: JSON.parse(row.extraction) };
  if (pending.report_id !== null) return { status: "done", pending };
  if (now.getTime() - new Date(row.created_at).getTime() > PENDING_TTL_MS) return { status: "expired" };
  return { status: "ok", pending };
}

export function updatePendingExtraction(token: string, extraction: Extraction, db = getDb()) {
  db.prepare(`UPDATE pending_reports SET extraction = ? WHERE token = ?`).run(JSON.stringify(extraction), token);
}

/**
 * 대기 제보를 실제 제보로 접수한다. 토큰 선점과 저장을 한 트랜잭션으로 묶어 두 번 눌러도 한 번만 저장된다.
 * 이미 접수된 토큰이면 null.
 */
export function confirmPending(token: string, report: NewReport, db = getDb()): SaveResult | null {
  return db.transaction(() => {
    const row = db.prepare(`SELECT report_id FROM pending_reports WHERE token = ?`).get(token) as
      | { report_id: number | null }
      | undefined;
    if (!row || row.report_id !== null) return null;
    const result = saveReport(report, db);
    db.prepare(`UPDATE pending_reports SET report_id = ? WHERE token = ?`).run(result.id, token);
    return result;
  })();
}
