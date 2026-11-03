/**
 * 카카오 i 오픈빌더 스킬 서버 응답 규격 (version 2.0) 최소 구현
 * https://kakaobusiness.gitbook.io/main/tool/chatbot/skill_guide/answer_json_format
 */

export interface KakaoSkillRequest {
  userRequest?: {
    utterance?: string;
    user?: { id?: string; type?: string; properties?: Record<string, unknown> };
    block?: { id?: string; name?: string };
  };
  bot?: { id?: string; name?: string };
  action?: { params?: Record<string, string> };
}

type Button =
  | { action: "webLink"; label: string; webLinkUrl: string }
  | { action: "message"; label: string; messageText: string };

type Output =
  | { simpleText: { text: string } }
  | { basicCard: { title?: string; description?: string; buttons?: Button[] } };

interface QuickReply {
  label: string;
  action: "message";
  messageText: string;
}

export interface KakaoSkillResponse {
  version: "2.0";
  template: { outputs: Output[]; quickReplies?: QuickReply[] };
}

/** 카카오 제한: 버튼·바로가기 라벨 14자, 카드 설명 230자, 말풍선 1000자 */
const clip = (s: string, n: number) => (s.length > n ? s.slice(0, n - 1) + "…" : s);

export const simpleText = (text: string): Output => ({ simpleText: { text: clip(text, 1000) } });

export const basicCard = (title: string, description: string, buttons: Button[]): Output => ({
  basicCard: {
    title: clip(title, 50),
    description: clip(description, 230),
    buttons: buttons.slice(0, 3).map((b) => ({ ...b, label: clip(b.label, 14) })),
  },
});

export const webLink = (label: string, webLinkUrl: string): Button => ({ action: "webLink", label, webLinkUrl });

export const quickReply = (label: string, messageText = label): QuickReply => ({
  label: clip(label, 14),
  action: "message",
  messageText,
});

export function skillResponse(outputs: Output[], quickReplies?: QuickReply[]): KakaoSkillResponse {
  return { version: "2.0", template: { outputs: outputs.slice(0, 3), ...(quickReplies?.length ? { quickReplies } : {}) } };
}

/** 제보 문장 외의 명령어 판별 */
export type Command = "map" | "help" | "report";
export function classifyUtterance(text: string): Command {
  const t = text.replace(/\s+/g, "");
  if (/^(오늘)?(지도|악취지도|현황|오늘현황|지도보기|오늘지도보기)$/.test(t)) return "map";
  if (/^(도움말|사용법|안녕|안녕하세요|시작|처음|메뉴|\?)$/.test(t)) return "help";
  return "report";
}

export function kakaoUserId(body: KakaoSkillRequest): string | null {
  const u = body.userRequest?.user;
  const id = u?.id ?? (u?.properties?.plusfriendUserKey as string | undefined);
  return typeof id === "string" && id.length > 0 ? id : null;
}
