"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { DEMO_PRESETS, MAX_TEXT_LENGTH, intensityInfo } from "@/lib/constants";
import { getPosition, FAIL_MESSAGES, LOCATION_FAIL_NOTICE, type Coords, type GeoResult } from "@/app/components/geo";
import { DemoPanel, IntensityButtons, Receipt, type Extraction, type SaveResponse } from "@/app/components/ReportParts";

type Phase =
  | "compose"
  | "askLocation"
  | "locating"
  | "locFailed"
  | "extracting"
  | "askIntensity"
  | "saving"
  | "saveFailed"
  | "done";




interface Msg {
  id: number;
  from: "bot" | "user";
  text: string;
  error?: boolean;
}

const CHIPS = ["축사 냄새 때문에 창문을 못 열겠어요", "냄새가 납니다", "돼지 냄새가 살짝 나요"];
const CLIENT_ID_KEY = "jbb_client_id";
const FALLBACK_TIMEOUT_MS = 6500;

function getClientId(): string {
  let id = localStorage.getItem(CLIENT_ID_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(CLIENT_ID_KEY, id);
  }
  return id;
}

function fallbackExtraction(): Extraction {
  return { intensity: null, odor_type: "알 수 없음", symptoms: [], confidence: 0, needs_question: true, fallback: true };
}

async function requestExtraction(text: string): Promise<Extraction> {
  const timeout = new Promise<Extraction>((resolve) => setTimeout(() => resolve(fallbackExtraction()), FALLBACK_TIMEOUT_MS));
  const call = fetch("/api/reports/extract", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text }),
  })
    .then((r) => (r.ok ? (r.json() as Promise<Extraction>) : fallbackExtraction()))
    .catch(fallbackExtraction);
  return Promise.race([call, timeout]);
}

export default function ReportChat({ demoMode }: { demoMode: boolean }) {
  const [phase, setPhase] = useState<Phase>("compose");
  const [messages, setMessages] = useState<Msg[]>([
    {
      id: 0,
      from: "bot",
      text: "안녕하세요, 제주숨결봇이에요.\n지금 어떤 냄새가 나는지 편하게 한 문장으로 알려주세요.",
    },
  ]);
  const [draft, setDraft] = useState("");
  const [reportText, setReportText] = useState("");
  const [extraction, setExtraction] = useState<Extraction | null>(null);
  const [coords, setCoords] = useState<Coords | null>(null);
  const [result, setResult] = useState<{ save: SaveResponse; intensity: number; src: "ai" | "button" } | null>(null);
  const [useDemoCoords, setUseDemoCoords] = useState(demoMode);
  const [presetIdx, setPresetIdx] = useState(0);
  const extractionRef = useRef<Promise<Extraction> | null>(null);
  const msgId = useRef(1);
  const lastAttempt = useRef<{ intensity: number; src: "ai" | "button" } | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, phase]);

  const say = (from: Msg["from"], text: string, error = false) =>
    setMessages((m) => [...m, { id: msgId.current++, from, text, error }]);

  const trimmed = draft.trim();
  const tooLong = draft.length > MAX_TEXT_LENGTH;

  function submitText(text: string) {
    const t = text.trim();
    if (!t || t.length > MAX_TEXT_LENGTH) return;
    setReportText(t);
    setDraft("");
    say("user", t);
    say("bot", "알려주셔서 고마워요.\n어디서 나는 냄새인지 기록하려면 위치 확인이 꼭 필요해요. 아래 버튼을 눌러 주세요.");
    // 위치 확인을 기다리는 동안 AI 추출을 미리 시작한다
    extractionRef.current = requestExtraction(t);
    setPhase("askLocation");
  }

  async function handleLocation(simulateDeny = false) {
    setPhase("locating");
    let geo: GeoResult;
    if (simulateDeny) {
      geo = { ok: false, reason: "denied" };
    } else if (demoMode && useDemoCoords) {
      const p = DEMO_PRESETS[presetIdx];
      geo = { ok: true, coords: { lat: p.lat, lng: p.lng, accuracy: 10, demo: true } };
    } else {
      geo = await getPosition();
    }

    if (!geo.ok) {
      if (geo.reason === "inaccurate") {
        say("bot", `위치 정확도가 낮아요(약 ${Math.round(geo.accuracy ?? 0)}m).\n창가나 바깥에서 다시 시도해 주세요.`, true);
      } else {
        await fetch("/api/location-failures", { method: "POST" }).catch(() => undefined);
        say(
          "bot",
          `${FAIL_MESSAGES[geo.reason]}\n${LOCATION_FAIL_NOTICE}\n\n위치를 허용하신 뒤 다시 시도해 주세요.`,
          true,
        );
      }
      setPhase("locFailed");
      return;
    }

    setCoords(geo.coords);
    say("bot", geo.coords.demo ? `📍 시연 위치(${DEMO_PRESETS[presetIdx].name})로 확인했어요.` : "📍 위치를 확인했어요.");
    setPhase("extracting");
    const ex = (await extractionRef.current) ?? fallbackExtraction();
    setExtraction(ex);

    if (ex.needs_question || ex.intensity === null) {
      say(
        "bot",
        ex.fallback
          ? "지금 자동 분석이 늦어지고 있어요. 냄새가 얼마나 심한지 직접 골라 주세요."
          : "냄새가 얼마나 심한지 골라 주시겠어요?",
      );
      setPhase("askIntensity");
      return;
    }
    await save(geo.coords, ex, ex.intensity, "ai");
  }

  async function save(c: Coords, ex: Extraction, intensity: number, src: "ai" | "button") {
    setPhase("saving");
    lastAttempt.current = { intensity, src };
    try {
      const res = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          client_id: getClientId(),
          text: reportText,
          intensity,
          intensity_src: src,
          odor_type: ex.odor_type,
          symptoms: ex.symptoms,
          confidence: src === "ai" ? ex.confidence : null,
          lat: c.lat,
          lng: c.lng,
          accuracy: c.accuracy,
          is_demo: c.demo,
        }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "저장 실패");
      setResult({ save: body, intensity, src });
      setPhase("done");
    } catch (e) {
      say("bot", `접수 중 문제가 생겼어요: ${(e as Error).message}`, true);
      setPhase("saveFailed");
    }
  }

  function pickIntensity(level: number) {
    if (!coords || !extraction) return;
    say("user", intensityInfo(level).short);
    void save(coords, extraction, level, "button");
  }

  function restart() {
    setPhase("compose");
    setReportText("");
    setExtraction(null);
    setCoords(null);
    setResult(null);
    extractionRef.current = null;
    say("bot", "새 제보를 알려주세요.");
  }

  function newResident() {
    localStorage.removeItem(CLIENT_ID_KEY);
    setPresetIdx((i) => (i + 1) % DEMO_PRESETS.length);
    say("bot", "🔄 시연용: 새 주민 식별자로 바꿨어요.");
  }

  return (
    <>
      <div className="chat" aria-live="polite">
        {messages.map((m) => (
          <div key={m.id} className={`msg ${m.from === "bot" ? "msg-bot" : "msg-user"} ${m.error ? "msg-error" : ""}`}>
            {m.text}
          </div>
        ))}

        {(phase === "locating" || phase === "extracting" || phase === "saving") && (
          <div className="msg msg-bot" role="status">
            <span className="typing" aria-hidden>
              <span />
              <span />
              <span />
            </span>{" "}
            {phase === "locating" ? "위치를 확인하고 있어요…" : phase === "extracting" ? "말씀하신 내용을 정리하고 있어요…" : "접수하고 있어요…"}
          </div>
        )}

        {phase === "askLocation" && (
          <div className="actions">
            <button className="btn btn-primary btn-big" onClick={() => handleLocation()}>
              📍 위치 허용하고 제보하기
            </button>
            {demoMode && (
              <DemoPanel
                useDemo={useDemoCoords}
                setUseDemo={setUseDemoCoords}
                presetIdx={presetIdx}
                setPresetIdx={setPresetIdx}
                onDeny={() => handleLocation(true)}
                onNewResident={newResident}
              />
            )}
          </div>
        )}

        {phase === "locFailed" && (
          <div className="actions">
            <button className="btn btn-primary" onClick={() => handleLocation()}>
              📍 위치 다시 확인하기
            </button>
            {demoMode && (
              <DemoPanel
                useDemo={useDemoCoords}
                setUseDemo={setUseDemoCoords}
                presetIdx={presetIdx}
                setPresetIdx={setPresetIdx}
                onDeny={() => handleLocation(true)}
                onNewResident={newResident}
              />
            )}
            <Link className="btn btn-outline" href="/map">
              오늘 지도 보기
            </Link>
            <button className="btn btn-ghost" onClick={restart}>
              처음부터 다시 쓰기
            </button>
          </div>
        )}

        {phase === "askIntensity" && <IntensityButtons onPick={pickIntensity} />}

        {phase === "saveFailed" && coords && extraction && lastAttempt.current && (
          <div className="actions">
            <button
              className="btn btn-primary"
              onClick={() => save(coords, extraction, lastAttempt.current!.intensity, lastAttempt.current!.src)}
            >
              다시 접수하기
            </button>
            <button className="btn btn-ghost" onClick={restart}>
              처음부터 다시 쓰기
            </button>
          </div>
        )}

        {phase === "done" && result && extraction && coords && (
          <Receipt result={result} extraction={extraction} demo={coords.demo} onRestart={restart} />
        )}
        <div ref={bottomRef} />
      </div>

      {phase === "compose" && (
        <form
          className="composer"
          onSubmit={(e) => {
            e.preventDefault();
            submitText(draft);
          }}
        >
          <div className="chips" aria-label="추천 문장">
            {CHIPS.map((c) => (
              <button type="button" key={c} className="chip" onClick={() => submitText(c)}>
                {c}
              </button>
            ))}
          </div>
          <div className="composer-row">
            <label htmlFor="report-text" className="sr-only">
              제보 문장
            </label>
            <textarea
              id="report-text"
              rows={2}
              value={draft}
              placeholder="예) 돼지 냄새 때문에 빨래를 다 걷었어요"
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                  e.preventDefault();
                  submitText(draft);
                }
              }}
            />
            <button className="btn btn-primary send" type="submit" disabled={!trimmed || tooLong}>
              보내기
            </button>
          </div>
          <div className={`counter ${tooLong ? "over" : ""}`}>
            {tooLong ? `${MAX_TEXT_LENGTH}자 이내로 줄여 주세요 · ` : ""}
            {draft.length}/{MAX_TEXT_LENGTH}
          </div>
        </form>
      )}
    </>
  );
}
