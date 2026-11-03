import { randomBytes } from "node:crypto";
import { extractReport } from "@/lib/claude";
import { MAX_TEXT_LENGTH } from "@/lib/constants";
import { createPending } from "@/lib/db";
import {
  basicCard,
  classifyUtterance,
  kakaoUserId,
  quickReply,
  simpleText,
  skillResponse,
  webLink,
  type KakaoSkillRequest,
} from "@/lib/kakao";
import { hashUser, maskText } from "@/lib/mask";

/** 오픈빌더 스킬 응답 제한(약 5초) 안에 답하도록 AI 호출은 3초로 자른다. 넘기면 확인 페이지에서 다시 시도한다. */
const SKILL_EXTRACT_TIMEOUT_MS = 3000;

const MAP_REPLY = quickReply("오늘 지도");
const HELP_REPLY = quickReply("사용법");

function baseUrl(req: Request): string {
  if (process.env.PUBLIC_BASE_URL) return process.env.PUBLIC_BASE_URL.replace(/\/$/, "");
  const h = req.headers;
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

const ok = (body: unknown) => Response.json(body);

export async function POST(req: Request) {
  const secret = process.env.KAKAO_SKILL_SECRET;
  if (secret && new URL(req.url).searchParams.get("key") !== secret && req.headers.get("x-skill-key") !== secret) {
    return Response.json({ error: "forbidden" }, { status: 403 });
  }

  const body = (await req.json().catch(() => null)) as KakaoSkillRequest | null;
  const text = body?.userRequest?.utterance?.trim() ?? "";
  const userId = body ? kakaoUserId(body) : null;
  const base = baseUrl(req);

  // 오픈빌더는 200 + 규격 JSON이 아니면 사용자에게 오류를 보여주므로, 실패도 말풍선으로 답한다
  if (!userId) return ok(skillResponse([simpleText("사용자 정보를 확인할 수 없어요. 잠시 후 다시 보내 주세요.")]));

  const command = classifyUtterance(text);
  if (command === "map") {
    return ok(
      skillResponse(
        [basicCard("오늘의 악취 지도", "어느 동네에서 악취가 났는지 지도로 확인하세요.", [webLink("지도 보기", `${base}/map`)])],
        [HELP_REPLY],
      ),
    );
  }
  if (command === "help" || !text) {
    return ok(
      skillResponse(
        [
          simpleText(
            "안녕하세요, 제주숨결봇이에요.\n냄새가 날 때 한 문장으로 보내 주세요.\n\n예) 축사 냄새 때문에 창문을 못 열겠어요\n\n이름·전화번호는 받지 않아요.",
          ),
        ],
        [quickReply("냄새가 나요", "냄새가 납니다"), MAP_REPLY],
      ),
    );
  }
  if (text.length > MAX_TEXT_LENGTH) {
    return ok(skillResponse([simpleText(`${MAX_TEXT_LENGTH}자 이내로 줄여서 다시 보내 주세요.`)]));
  }

  const extraction = await extractReport(text, SKILL_EXTRACT_TIMEOUT_MS);
  const token = randomBytes(16).toString("base64url");
  createPending({ token, user_hash: hashUser(`kakao:${userId}`), text_masked: maskText(text), extraction });

  return ok(
    skillResponse(
      [
        simpleText("알려주셔서 고마워요.\n어디서 나는 냄새인지 기록하려면 위치 확인이 꼭 필요해요."),
        basicCard(
          "📍 위치 확인하고 접수하기",
          "아래 버튼을 누르고 ‘위치 허용’을 해 주세요. 위치는 약 200m 범위로만 표시되고, 위치를 확인하지 못하면 제보는 저장되지 않아요. (1시간 안에 눌러 주세요)",
          [webLink("위치 확인하고 접수", `${base}/k/${token}`)],
        ),
      ],
      [MAP_REPLY],
    ),
  );
}
