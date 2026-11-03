/**
 * 애월읍 축사 인근 아침·저녁 집중 가상 데이터 20건 (is_demo = 1)
 * 사용: npm run seed [-- --date=2026-11-04]
 */
import "./load-env";
import { getDb } from "../lib/db";
import { hashUser, maskText } from "../lib/mask";
import { toGrid } from "../lib/rules";
import { kstDay, nextDay } from "../lib/time";

const dateArg = process.argv.find((a) => a.startsWith("--date="))?.slice(7);
const day = dateArg ?? kstDay();

// [위도, 경도, 시:분, 강도, 종류, 문장, 증상]
type Row = [number, number, string, number, string, string, string[]];
const ROWS: Row[] = [
  // 아침 (06~09시) - 어음리·봉성리 양돈 밀집지 인근
  [33.4371, 126.3462, "06:12", 4, "양돈", "새벽부터 돼지 냄새 때문에 창문 닫았어요", ["창문 닫음"]],
  [33.4355, 126.3441, "06:35", 5, "양돈", "숨쉬기 힘들 정도로 냄새가 심해요", ["호흡 곤란"]],
  [33.4383, 126.3489, "06:58", 3, "양돈", "축사 냄새 진동합니다", []],
  [33.4296, 126.3228, "07:05", 4, "액비", "밭에 액비 뿌렸는지 빨래 다 걷었어요", ["빨래 걷음"]],
  [33.4310, 126.3205, "07:21", 5, "액비", "머리 아프고 구역질 나요", ["두통", "구역질"]],
  [33.4342, 126.3475, "07:40", 4, "양돈", "아이 등교시키는데 창문을 못 열겠어요", ["창문 닫음"]],
  [33.4281, 126.3247, "08:02", 3, "퇴비", "퇴비 냄새가 확 나요", []],
  [33.4398, 126.3430, "08:15", 2, "양돈", "돼지 냄새 맞네요", []],
  [33.4542, 126.3061, "08:33", 3, "계사", "닭장 냄새가 강하게 나요", []],
  [33.4365, 126.3505, "08:50", 1, "알 수 없음", "뭔가 살짝 냄새나는 것 같아요", []],
  // 저녁 (18~21시)
  [33.4360, 126.3455, "18:10", 4, "양돈", "저녁 먹는데 냄새 때문에 창문 다 닫음", ["창문 닫음"]],
  [33.4376, 126.3470, "18:32", 5, "양돈", "눈이 따갑고 머리가 아파요", ["눈 따가움", "두통"]],
  [33.4302, 126.3215, "18:47", 4, "액비", "산책 나갔다가 냄새 때문에 바로 들어왔어요", ["외출 중단"]],
  [33.4349, 126.3428, "19:05", 3, "양돈", "냄새가 확 올라와요", []],
  [33.4389, 126.3496, "19:22", 5, "양돈", "구역질 나서 잠을 못 자겠어요", ["구역질", "수면 방해"]],
  [33.4535, 126.3042, "19:40", 2, "계사", "닭 냄새인지 알겠어요", []],
  [33.4288, 126.3236, "20:03", 4, "퇴비", "빨래 널어둔 거 다 걷었어요", ["빨래 걷음"]],
  [33.4368, 126.3448, "20:25", 3, "양돈", "축사 냄새가 계속 나요", []],
  [33.4317, 126.3194, "20:48", 2, "액비", "무슨 냄새인지 알겠어요", []],
  [33.4352, 126.3482, "21:10", 4, "양돈", "창문 닫아야 할 정도예요", ["창문 닫음"]],
];

const db = getDb();
const salt = process.env.USER_HASH_SALT || "seed-salt";
const insert = db.prepare(
  `INSERT INTO reports (user_hash, text_masked, intensity, intensity_src, odor_type, symptoms, confidence,
     grid_lat, grid_lng, raw_lat, raw_lng, needs_review, merged_count, is_demo, reported_at)
   VALUES (?, ?, ?, 'ai', ?, ?, 0.9, ?, ?, NULL, NULL, 0, 1, 1, ?)`,
);

const run = db.transaction(() => {
  const removed = db
    .prepare(`DELETE FROM reports WHERE is_demo = 1 AND reported_at >= ? AND reported_at < ?`)
    .run(day, nextDay(day)).changes;
  ROWS.forEach(([lat, lng, hm, intensity, type, text, symptoms], i) => {
    const g = toGrid(lat, lng);
    insert.run(
      hashUser(`seed-resident-${i}`, salt),
      maskText(text),
      intensity,
      type,
      JSON.stringify(symptoms),
      g.lat,
      g.lng,
      `${day}T${hm}:00+09:00`,
    );
  });
  return removed;
});

const removed = run();
console.log(`✅ ${day} 시드 ${ROWS.length}건 삽입 (기존 시연 데이터 ${removed}건 교체)`);
