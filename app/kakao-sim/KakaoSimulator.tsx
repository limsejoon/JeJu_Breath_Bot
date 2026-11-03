"use client";

import { useEffect, useRef, useState } from "react";
import type { KakaoSkillResponse } from "@/lib/kakao";

type Output = KakaoSkillResponse["template"]["outputs"][number];
type QuickReply = NonNullable<KakaoSkillResponse["template"]["quickReplies"]>[number];

type Item = { id: number; from: "user"; text: string } | { id: number; from: "bot"; outputs: Output[] };

const USER_KEY = "jbb_kakao_sim_user";

function simUserId(): string {
  let id = localStorage.getItem(USER_KEY);
  if (!id) {
    id = `sim-${crypto.randomUUID()}`;
    localStorage.setItem(USER_KEY, id);
  }
  return id;
}

/** 오픈빌더가 스킬 서버로 보내는 요청과 같은 모양 */
function skillPayload(utterance: string, userId: string) {
  return {
    intent: { id: "fallback", name: "폴백 블록" },
    userRequest: {
      timezone: "Asia/Seoul",
      utterance,
      lang: "ko",
      block: { id: "fallback", name: "폴백 블록" },
      user: { id: userId, type: "botUserKey", properties: { botUserKey: userId } },
    },
    bot: { id: "jeju-breath-bot-sim", name: "제주숨결봇" },
    action: { name: "제보 접수", params: {}, detailParams: {}, clientExtra: {} },
  };
}

export default function KakaoSimulator({ skillKey }: { skillKey: string }) {
  const [items, setItems] = useState<Item[]>([]);
  const [quick, setQuick] = useState<QuickReply[]>([
    { label: "사용법", action: "message", messageText: "사용법" },
    { label: "축사 냄새", action: "message", messageText: "축사 냄새 때문에 창문을 못 열겠어요" },
    { label: "냄새가 나요", action: "message", messageText: "냄새가 납니다" },
  ]);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const nextId = useRef(0);
  const bottom = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottom.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [items, busy]);

  async function send(text: string) {
    const t = text.trim();
    if (!t || busy) return;
    setDraft("");
    setQuick([]);
    setItems((x) => [...x, { id: nextId.current++, from: "user", text: t }]);
    setBusy(true);
    try {
      const res = await fetch(`/api/kakao/skill${skillKey ? `?key=${encodeURIComponent(skillKey)}` : ""}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(skillPayload(t, simUserId())),
      });
      const body = (await res.json()) as KakaoSkillResponse;
      setItems((x) => [...x, { id: nextId.current++, from: "bot", outputs: body.template.outputs }]);
      setQuick(body.template.quickReplies ?? []);
    } catch {
      setItems((x) => [
        ...x,
        { id: nextId.current++, from: "bot", outputs: [{ simpleText: { text: "⚠️ 스킬 서버 응답 없음" } }] },
      ]);
    } finally {
      setBusy(false);
    }
  }

  function newUser() {
    localStorage.removeItem(USER_KEY);
    setItems((x) => [...x, { id: nextId.current++, from: "bot", outputs: [{ simpleText: { text: "🔄 시연용: 새 카톡 사용자로 바꿨어요." } }] }]);
  }

  return (
    <>
      <div className="chat kakao-chat">
        <p className="kakao-hint">
          오픈빌더 폴백 블록 → 스킬 서버(<code>/api/kakao/skill</code>)와 같은 요청·응답으로 동작합니다.
        </p>
        {items.map((it) =>
          it.from === "user" ? (
            <div key={it.id} className="msg msg-user">
              {it.text}
            </div>
          ) : (
            <div key={it.id} className="kakao-bot">
              <div className="kakao-avatar" aria-hidden>
                숨
              </div>
              <div className="kakao-outputs">
                {it.outputs.map((o, i) =>
                  "simpleText" in o ? (
                    <div key={i} className="msg msg-bot">
                      {o.simpleText.text}
                    </div>
                  ) : (
                    <div key={i} className="kakao-card">
                      {o.basicCard.title && <strong>{o.basicCard.title}</strong>}
                      {o.basicCard.description && <p>{o.basicCard.description}</p>}
                      {o.basicCard.buttons?.map((b) =>
                        b.action === "webLink" ? (
                          <a key={b.label} className="kakao-card-btn" href={b.webLinkUrl}>
                            {b.label}
                          </a>
                        ) : (
                          <button key={b.label} className="kakao-card-btn" onClick={() => send(b.messageText)}>
                            {b.label}
                          </button>
                        ),
                      )}
                    </div>
                  ),
                )}
              </div>
            </div>
          ),
        )}
        {busy && (
          <div className="msg msg-bot" role="status">
            <span className="typing" aria-hidden>
              <span />
              <span />
              <span />
            </span>
          </div>
        )}
        <div ref={bottom} />
      </div>

      <form
        className="composer"
        onSubmit={(e) => {
          e.preventDefault();
          void send(draft);
        }}
      >
        {quick.length > 0 && (
          <div className="chips">
            {quick.map((q) => (
              <button type="button" key={q.label} className="chip" onClick={() => send(q.messageText)}>
                {q.label}
              </button>
            ))}
          </div>
        )}
        <div className="composer-row">
          <label htmlFor="kakao-text" className="sr-only">
            메시지
          </label>
          <textarea
            id="kakao-text"
            rows={1}
            value={draft}
            placeholder="메시지 입력"
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                e.preventDefault();
                void send(draft);
              }
            }}
          />
          <button className="btn btn-primary send" type="submit" disabled={!draft.trim() || busy}>
            전송
          </button>
        </div>
        <button type="button" className="btn btn-ghost" onClick={newUser} style={{ minHeight: 40, fontSize: 14 }}>
          새 카톡 사용자로 전환 (시연용)
        </button>
      </form>
    </>
  );
}
