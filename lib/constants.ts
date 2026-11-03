export const ODOR_TYPES = ["양돈", "계사", "우사", "퇴비", "액비", "음식물", "기타", "알 수 없음"] as const;
export type OdorType = (typeof ODOR_TYPES)[number];

export const INTENSITY_LEVELS = [
  { level: 1, label: "감지 취기", short: "1 감지 취기", color: "#fde68a", text: "#713f12", example: "살짝 냄새나요" },
  { level: 2, label: "보통 취기", short: "2 보통 취기", color: "#facc15", text: "#713f12", example: "무슨 냄새인지 알겠어요" },
  { level: 3, label: "강한 취기", short: "3 강한 취기", color: "#fb923c", text: "#ffffff", example: "냄새가 확 나요" },
  { level: 4, label: "극심한 취기", short: "4 극심한 취기", color: "#ea580c", text: "#ffffff", example: "창문 닫아야 해요" },
  { level: 5, label: "참기 어려운 취기", short: "5 참기 어려움", color: "#dc2626", text: "#ffffff", example: "숨쉬기 힘들어요" },
] as const;

export const REVIEW_COLOR = "#9ca3af";

export function intensityInfo(level: number) {
  return INTENSITY_LEVELS[Math.min(Math.max(level, 1), 5) - 1];
}

/** 제주도 바운딩 박스 [권장] */
export const JEJU_BBOX = { minLat: 33.1, maxLat: 33.6, minLng: 126.1, maxLng: 127.0 };

/** 애월읍 시연용 프리셋 좌표 (서로 300m 이상 떨어져 중복 병합되지 않음) */
export const DEMO_PRESETS = [
  { name: "애월읍 어음리", lat: 33.4362, lng: 126.3458 },
  { name: "애월읍 봉성리", lat: 33.4290, lng: 126.3220 },
  { name: "애월읍 금성리", lat: 33.4540, lng: 126.3050 },
] as const;

export const MAX_TEXT_LENGTH = 500;
export const MAX_ACCURACY_M = 200;
export const CONFIDENCE_THRESHOLD = 0.7;
export const EXTRACT_TIMEOUT_MS = 5000;
