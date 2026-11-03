import { beforeEach, describe, expect, it } from "vitest";
import type Database from "better-sqlite3";
import { getSummary, incrementLocationFailure, listReports, openDb, saveReport, type NewReport } from "./db";

let db: Database.Database;
const t0 = new Date("2026-11-04T07:00:00+09:00");
const at = (min: number) => new Date(t0.getTime() + min * 60_000);

const base = (over: Partial<NewReport> = {}): NewReport => ({
  user_hash: "user-a",
  text_masked: "냄새가 나요",
  intensity: 3,
  intensity_src: "ai",
  odor_type: "양돈",
  symptoms: [],
  confidence: 0.9,
  lat: 33.4362,
  lng: 126.3458,
  now: t0,
  ...over,
});

beforeEach(() => {
  db = openDb(":memory:");
});

describe("saveReport", () => {
  it("원시 좌표는 저장하지 않고 격자 좌표만 남긴다", () => {
    saveReport(base(), db);
    const row = db.prepare("SELECT raw_lat, raw_lng, grid_lat, grid_lng FROM reports").get() as Record<string, number | null>;
    expect(row.raw_lat).toBeNull();
    expect(row.raw_lng).toBeNull();
    expect(row.grid_lat).not.toBe(33.4362);
  });

  it("30분 내 같은 반경 재제보는 1건으로 통합되고 나중 강도가 적용된다", () => {
    const first = saveReport(base(), db);
    const second = saveReport(base({ intensity: 5, intensity_src: "button", now: at(20), lat: 33.4370 }), db);
    expect(second.merged).toBe(true);
    expect(second.id).toBe(first.id);
    const rows = listReports("2026-11-04", db);
    expect(rows).toHaveLength(1);
    expect(rows[0].intensity).toBe(5);
    expect(rows[0].merged_count).toBe(2);
  });

  it("다른 사용자는 병합하지 않는다", () => {
    saveReport(base(), db);
    const r = saveReport(base({ user_hash: "user-b", now: at(5) }), db);
    expect(r.merged).toBe(false);
    expect(listReports("2026-11-04", db)).toHaveLength(2);
    expect(r.today_nearby_count).toBe(2);
  });

  it("순간 이동 제보는 needs_review로 저장되고 공개 집계에서 빠진다", () => {
    saveReport(base({ intensity: 4 }), db);
    const r = saveReport(base({ intensity: 5, now: at(5), lat: 33.5, lng: 126.53 }), db);
    expect(r.needs_review).toBe(true);
    expect(getSummary("2026-11-04", db)).toEqual({ total: 1, high_intensity_count: 1, location_failures: 0 });
  });

  it("목록 응답에는 사용자 해시가 없다", () => {
    saveReport(base(), db);
    expect(listReports("2026-11-04", db)[0]).not.toHaveProperty("user_hash");
  });

  it("날짜별로 조회된다", () => {
    saveReport(base(), db);
    expect(listReports("2026-11-03", db)).toHaveLength(0);
    expect(listReports("2026-11-05", db)).toHaveLength(0);
  });
});

describe("location failures", () => {
  it("실패 카운트만 +1, 제보 레코드는 생기지 않는다", () => {
    incrementLocationFailure("2026-11-04", db);
    incrementLocationFailure("2026-11-04", db);
    expect(getSummary("2026-11-04", db).location_failures).toBe(2);
    expect(listReports("2026-11-04", db)).toHaveLength(0);
  });
});
