import { extractReport } from "@/lib/claude";
import { MAX_ACCURACY_M } from "@/lib/constants";
import { confirmPending, getPending, updatePendingExtraction } from "@/lib/db";
import { inJeju } from "@/lib/rules";

const bad = (error: string, status = 400) => Response.json({ error }, { status });

/**
 * 카카오톡 제보의 위치 확인 단계.
 * 문장·사용자 식별자·AI 추출 결과는 서버의 대기열에서 가져오므로 클라이언트는 좌표(와 필요 시 강도)만 보낸다.
 * - 강도가 확실하지 않으면 { needs_intensity: true }를 돌려주고, 클라이언트가 버튼으로 고른 강도와 함께 다시 보낸다.
 */
export async function POST(req: Request) {
  const b = await req.json().catch(() => null);
  const token = typeof b?.token === "string" ? b.token : "";
  if (!token) return bad("토큰이 필요합니다");

  const lookup = getPending(token);
  if (lookup.status === "missing") return bad("제보를 찾을 수 없어요. 카카오톡에서 다시 보내 주세요.", 404);
  if (lookup.status === "expired") return bad("1시간이 지나 만료되었어요. 카카오톡에서 다시 보내 주세요.", 410);
  if (lookup.status === "done") return bad("이미 접수된 제보예요.", 409);
  const pending = lookup.pending;

  const lat = Number(b.lat);
  const lng = Number(b.lng);
  if (b.lat == null || b.lng == null || !Number.isFinite(lat) || !Number.isFinite(lng)) return bad("위치 좌표가 필요합니다");
  if (!inJeju(lat, lng)) return bad("제주도 밖의 위치는 접수할 수 없습니다");
  if (b.accuracy != null && Number(b.accuracy) > MAX_ACCURACY_M) return bad("위치 정확도가 낮습니다. 다시 시도해 주세요");

  // 카톡 응답 시간 안에 AI가 끝나지 않았던 경우, 위치를 확인한 지금 한 번 더 시도한다
  let extraction = pending.extraction;
  if (extraction.fallback) {
    const retry = await extractReport(pending.text_masked);
    if (!retry.fallback) {
      extraction = retry;
      updatePendingExtraction(token, extraction);
    }
  }

  const picked = Number(b.intensity);
  const hasPick = Number.isInteger(picked) && picked >= 1 && picked <= 5;
  if (!hasPick && (extraction.needs_question || extraction.intensity === null)) {
    return Response.json({ needs_intensity: true, extraction });
  }
  const intensity = hasPick ? picked : extraction.intensity!;
  const intensity_src = hasPick ? "button" : "ai";

  const result = confirmPending(token, {
    user_hash: pending.user_hash,
    text_masked: pending.text_masked,
    intensity,
    intensity_src,
    odor_type: extraction.odor_type,
    symptoms: extraction.symptoms,
    confidence: intensity_src === "ai" ? extraction.confidence : null,
    lat,
    lng,
    is_demo: b.is_demo === true && process.env.DEMO_MODE === "true",
  });
  if (!result) return bad("이미 접수된 제보예요.", 409);

  return Response.json({
    needs_intensity: false,
    id: result.id,
    merged: result.merged,
    needs_review: result.needs_review,
    today_nearby_count: result.today_nearby_count,
    intensity,
    intensity_src,
    extraction,
  });
}
