import { JEJU_BBOX } from "./constants";

/** 약 200m 격자 (위도 1도 ≈ 111km, 제주 위도에서 경도 1도 ≈ 92.7km) [가설] */
export const GRID_LAT_STEP = 0.0018;
export const GRID_LNG_STEP = 0.00216;

export const MERGE_WINDOW_MS = 30 * 60 * 1000;
export const MERGE_RADIUS_M = 300;
export const TELEPORT_WINDOW_MS = 10 * 60 * 1000;
export const TELEPORT_DISTANCE_M = 5000;
export const BURST_WINDOW_MS = 60 * 60 * 1000;
export const BURST_MAX = 5;

export interface Point {
  lat: number;
  lng: number;
}

export interface PriorReport {
  id: number;
  grid_lat: number;
  grid_lng: number;
  merged_count: number;
  reported_at: string;
}

/** 좌표를 격자 칸의 중심점으로 스냅한다. 같은 칸의 모든 점은 같은 좌표가 된다. */
export function toGrid(lat: number, lng: number): Point {
  const snap = (v: number, step: number) => Number(((Math.floor(v / step) + 0.5) * step).toFixed(6));
  return { lat: snap(lat, GRID_LAT_STEP), lng: snap(lng, GRID_LNG_STEP) };
}

export function distanceM(a: Point, b: Point): number {
  const R = 6371000;
  const rad = (d: number) => (d * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export function inJeju(lat: number, lng: number): boolean {
  return lat >= JEJU_BBOX.minLat && lat <= JEJU_BBOX.maxLat && lng >= JEJU_BBOX.minLng && lng <= JEJU_BBOX.maxLng;
}

const ageMs = (now: Date, iso: string) => now.getTime() - new Date(iso).getTime();

/** 같은 사용자가 30분 이내 & 300m 이내에 다시 제보하면 병합 대상(가장 최근 건) id를 돌려준다. */
export function findMergeTarget(prior: PriorReport[], point: Point, now: Date): number | null {
  const candidates = prior
    .filter((r) => ageMs(now, r.reported_at) <= MERGE_WINDOW_MS)
    .filter((r) => distanceM(point, { lat: r.grid_lat, lng: r.grid_lng }) <= MERGE_RADIUS_M)
    .sort((a, b) => b.reported_at.localeCompare(a.reported_at));
  return candidates[0]?.id ?? null;
}

/** 10분 내 5km 이상 순간 이동 또는 1시간 내 5건 초과 접수 시 이상 의심 */
export function isAnomalous(prior: PriorReport[], point: Point, now: Date): boolean {
  const teleported = prior.some(
    (r) =>
      ageMs(now, r.reported_at) <= TELEPORT_WINDOW_MS &&
      distanceM(point, { lat: r.grid_lat, lng: r.grid_lng }) >= TELEPORT_DISTANCE_M,
  );
  const lastHour = prior
    .filter((r) => ageMs(now, r.reported_at) <= BURST_WINDOW_MS)
    .reduce((sum, r) => sum + r.merged_count, 0);
  return teleported || lastHour + 1 > BURST_MAX;
}
