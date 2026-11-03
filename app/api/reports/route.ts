import { listReports, saveReport } from "@/lib/db";
import { hashUser, maskText } from "@/lib/mask";
import { inJeju } from "@/lib/rules";
import { kstDay, isValidDay } from "@/lib/time";
import { MAX_ACCURACY_M, MAX_TEXT_LENGTH, ODOR_TYPES, type OdorType } from "@/lib/constants";

const bad = (error: string, status = 400) => Response.json({ error }, { status });

export async function POST(req: Request) {
  const b = await req.json().catch(() => null);
  if (!b || typeof b !== "object") return bad("잘못된 요청입니다");

  const lat = Number(b.lat);
  const lng = Number(b.lng);
  if (b.lat == null || b.lng == null || !Number.isFinite(lat) || !Number.isFinite(lng)) {
    return bad("위치 좌표가 필요합니다");
  }
  if (!inJeju(lat, lng)) return bad("제주도 밖의 위치는 접수할 수 없습니다");
  if (b.accuracy != null && Number(b.accuracy) > MAX_ACCURACY_M) return bad("위치 정확도가 낮습니다. 다시 시도해 주세요");

  const clientId = typeof b.client_id === "string" ? b.client_id : "";
  if (clientId.length < 8 || clientId.length > 100) return bad("클라이언트 식별자가 올바르지 않습니다");

  const text = typeof b.text === "string" ? b.text.trim() : "";
  if (!text || text.length > MAX_TEXT_LENGTH) return bad("제보 문장이 올바르지 않습니다");

  const intensity = Number(b.intensity);
  if (!Number.isInteger(intensity) || intensity < 1 || intensity > 5) return bad("강도는 1~5 사이여야 합니다");
  const intensity_src = b.intensity_src === "ai" ? "ai" : "button";
  const odor_type: OdorType = ODOR_TYPES.includes(b.odor_type) ? b.odor_type : "알 수 없음";
  const symptoms = Array.isArray(b.symptoms)
    ? b.symptoms.filter((s: unknown): s is string => typeof s === "string").map(maskText).slice(0, 10)
    : [];
  const confidence = typeof b.confidence === "number" ? b.confidence : null;
  const is_demo = b.is_demo === true && process.env.DEMO_MODE === "true";

  const result = saveReport({
    user_hash: hashUser(clientId),
    text_masked: maskText(text),
    intensity,
    intensity_src,
    odor_type,
    symptoms,
    confidence,
    lat,
    lng,
    is_demo,
  });

  return Response.json({
    id: result.id,
    merged: result.merged,
    needs_review: result.needs_review,
    today_nearby_count: result.today_nearby_count,
  });
}

export async function GET(req: Request) {
  const date = new URL(req.url).searchParams.get("date") ?? kstDay();
  if (!isValidDay(date)) return bad("date는 YYYY-MM-DD 형식이어야 합니다");
  return Response.json({ date, reports: listReports(date) });
}
