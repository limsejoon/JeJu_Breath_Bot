import { describe, expect, it } from "vitest";
import { distanceM, findMergeTarget, inJeju, isAnomalous, toGrid, type PriorReport } from "./rules";
import { toKstIso } from "./time";

const now = new Date("2026-11-04T08:00:00+09:00");
const ago = (min: number) => toKstIso(new Date(now.getTime() - min * 60_000));
const AEWOL = { lat: 33.4362, lng: 126.3458 };

function prior(over: Partial<PriorReport>): PriorReport {
  const g = toGrid(AEWOL.lat, AEWOL.lng);
  return { id: 1, grid_lat: g.lat, grid_lng: g.lng, merged_count: 1, reported_at: ago(5), ...over };
}

describe("toGrid", () => {
  it("가까운 두 점은 같은 격자로 스냅된다", () => {
    expect(toGrid(33.43621, 126.34581)).toEqual(toGrid(33.43625, 126.34589));
  });
  it("격자 중심은 원좌표에서 약 200m 격자 대각선의 절반 이내", () => {
    const g = toGrid(AEWOL.lat, AEWOL.lng);
    expect(distanceM(AEWOL, g)).toBeLessThan(150);
  });
  it("격자 간격은 약 200m", () => {
    const a = toGrid(33.4362, 126.3458);
    const b = toGrid(33.4362 + 0.0018, 126.3458);
    expect(distanceM(a, b)).toBeGreaterThan(180);
    expect(distanceM(a, b)).toBeLessThan(220);
  });
});

describe("inJeju", () => {
  it("애월읍은 범위 안, 서울은 범위 밖", () => {
    expect(inJeju(AEWOL.lat, AEWOL.lng)).toBe(true);
    expect(inJeju(37.5665, 126.978)).toBe(false);
  });
});

describe("findMergeTarget", () => {
  it("30분 이내 & 300m 이내 재제보는 병합", () => {
    expect(findMergeTarget([prior({ reported_at: ago(20) })], AEWOL, now)).toBe(1);
  });
  it("30분이 지나면 병합하지 않는다", () => {
    expect(findMergeTarget([prior({ reported_at: ago(31) })], AEWOL, now)).toBeNull();
  });
  it("300m를 넘으면 병합하지 않는다", () => {
    expect(findMergeTarget([prior({})], { lat: AEWOL.lat + 0.004, lng: AEWOL.lng }, now)).toBeNull();
  });
  it("여러 후보 중 가장 최근 건과 병합", () => {
    expect(findMergeTarget([prior({ id: 1, reported_at: ago(25) }), prior({ id: 2, reported_at: ago(3) })], AEWOL, now)).toBe(2);
  });
});

describe("isAnomalous", () => {
  it("정상 제보는 의심하지 않는다", () => {
    expect(isAnomalous([prior({})], AEWOL, now)).toBe(false);
  });
  it("10분 내 5km 이상 이동은 의심", () => {
    const far = toGrid(33.5, 126.53); // 제주시 쪽
    expect(isAnomalous([prior({ grid_lat: far.lat, grid_lng: far.lng, reported_at: ago(5) })], AEWOL, now)).toBe(true);
  });
  it("10분이 지난 원거리 이동은 정상", () => {
    const far = toGrid(33.5, 126.53);
    expect(isAnomalous([prior({ grid_lat: far.lat, grid_lng: far.lng, reported_at: ago(15) })], AEWOL, now)).toBe(false);
  });
  it("1시간 내 6번째 접수는 의심 (5건까지는 정상)", () => {
    const five = [1, 2, 3, 4, 5].map((i) => prior({ id: i, reported_at: ago(i * 10) }));
    expect(isAnomalous(five.slice(0, 4), AEWOL, now)).toBe(false);
    expect(isAnomalous(five, AEWOL, now)).toBe(true);
  });
  it("병합된 횟수도 접수 건수로 센다", () => {
    expect(isAnomalous([prior({ merged_count: 5 })], AEWOL, now)).toBe(true);
  });
});
