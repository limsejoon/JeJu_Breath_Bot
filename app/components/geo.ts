import { JEJU_BBOX, MAX_ACCURACY_M } from "@/lib/constants";

export interface Coords {
  lat: number;
  lng: number;
  accuracy: number | null;
  demo: boolean;
}

export type GeoFailReason = "denied" | "unavailable" | "timeout" | "outside" | "inaccurate";
export type GeoResult = { ok: true; coords: Coords } | { ok: false; reason: GeoFailReason; accuracy?: number };

export function getPosition(): Promise<GeoResult> {
  return new Promise((resolve) => {
    if (!("geolocation" in navigator)) return resolve({ ok: false, reason: "unavailable" });
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude: lat, longitude: lng, accuracy } = pos.coords;
        if (lat < JEJU_BBOX.minLat || lat > JEJU_BBOX.maxLat || lng < JEJU_BBOX.minLng || lng > JEJU_BBOX.maxLng) {
          return resolve({ ok: false, reason: "outside" });
        }
        if (accuracy > MAX_ACCURACY_M) return resolve({ ok: false, reason: "inaccurate", accuracy });
        resolve({ ok: true, coords: { lat, lng, accuracy, demo: false } });
      },
      (err) =>
        resolve({
          ok: false,
          reason: err.code === err.PERMISSION_DENIED ? "denied" : err.code === err.TIMEOUT ? "timeout" : "unavailable",
        }),
      { enableHighAccuracy: true, timeout: 10_000, maximumAge: 0 },
    );
  });
}

export const FAIL_MESSAGES: Record<GeoFailReason, string> = {
  denied: "위치 권한이 거부되어 제보를 저장하지 않았어요.",
  unavailable: "위치를 확인할 수 없어 제보를 저장하지 않았어요.",
  timeout: "위치 확인 시간이 초과되어 제보를 저장하지 않았어요.",
  outside: "제주도 밖의 위치로 확인되어 제보를 저장하지 않았어요.",
  inaccurate: "위치 정확도가 낮아요.",
};

export const LOCATION_FAIL_NOTICE =
  "위치 없이 받은 제보는 지도를 왜곡할 수 있어 저장하지 않아요. 대신 ‘위치 실패’ 횟수만 익명으로 집계했어요.";
