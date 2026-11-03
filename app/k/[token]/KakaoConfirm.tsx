"use client";

import { useState } from "react";
import { DEMO_PRESETS } from "@/lib/constants";
import { FAIL_MESSAGES, LOCATION_FAIL_NOTICE, getPosition, type Coords, type GeoResult } from "@/app/components/geo";
import { DemoPanel, IntensityButtons, Receipt, type Extraction, type SaveResponse } from "@/app/components/ReportParts";

type Phase = "ready" | "locating" | "locFailed" | "saving" | "askIntensity" | "error" | "done";

interface ConfirmResponse extends Partial<SaveResponse> {
  needs_intensity: boolean;
  extraction: Extraction;
  intensity?: number;
  intensity_src?: "ai" | "button";
  error?: string;
}

/** 카카오톡 챗봇 카드의 [위치 확인하고 접수] 버튼으로 열리는 페이지 (카톡 인앱 브라우저) */
export default function KakaoConfirm({ token, text, demoMode }: { token: string; text: string; demoMode: boolean }) {
  const [phase, setPhase] = useState<Phase>("ready");
  const [notice, setNotice] = useState<string | null>(null);
  const [coords, setCoords] = useState<Coords | null>(null);
  const [done, setDone] = useState<ConfirmResponse | null>(null);
  const [useDemoCoords, setUseDemoCoords] = useState(demoMode);
  const [presetIdx, setPresetIdx] = useState(0);

  async function locate(simulateDeny = false) {
    setPhase("locating");
    setNotice(null);
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
        setNotice(`위치 정확도가 낮아요(약 ${Math.round(geo.accuracy ?? 0)}m).\n창가나 바깥에서 다시 시도해 주세요.`);
      } else {
        await fetch("/api/location-failures", { method: "POST" }).catch(() => undefined);
        setNotice(`${FAIL_MESSAGES[geo.reason]}\n${LOCATION_FAIL_NOTICE}\n\n위치를 허용하신 뒤 다시 시도해 주세요.`);
      }
      setPhase("locFailed");
      return;
    }
    setCoords(geo.coords);
    await confirm(geo.coords);
  }

  async function confirm(c: Coords, intensity?: number) {
    setPhase("saving");
    try {
      const res = await fetch("/api/kakao/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, lat: c.lat, lng: c.lng, accuracy: c.accuracy, intensity, is_demo: c.demo }),
      });
      const body = (await res.json()) as ConfirmResponse;
      if (!res.ok) throw new Error(body.error ?? "접수하지 못했어요");
      if (body.needs_intensity) {
        setPhase("askIntensity");
        return;
      }
      setDone(body);
      setPhase("done");
    } catch (e) {
      setNotice((e as Error).message);
      setPhase("error");
    }
  }

  return (
    <div className="chat" aria-live="polite">
      <div className="msg msg-bot">카카오톡으로 보내주신 제보예요.</div>
      <div className="msg msg-user">{text}</div>

      {phase === "ready" && (
        <div className="msg msg-bot">어디서 나는 냄새인지 기록하려면 위치 확인이 꼭 필요해요.{"\n"}아래 버튼을 누르고 ‘허용’을 눌러 주세요.</div>
      )}
      {notice && <div className="msg msg-bot msg-error">{notice}</div>}
      {(phase === "locating" || phase === "saving") && (
        <div className="msg msg-bot" role="status">
          <span className="typing" aria-hidden>
            <span />
            <span />
            <span />
          </span>{" "}
          {phase === "locating" ? "위치를 확인하고 있어요…" : "접수하고 있어요…"}
        </div>
      )}

      {(phase === "ready" || phase === "locFailed") && (
        <div className="actions">
          <button className="btn btn-primary btn-big" onClick={() => locate()}>
            📍 {phase === "ready" ? "위치 허용하고 접수하기" : "위치 다시 확인하기"}
          </button>
          {demoMode && (
            <DemoPanel
              useDemo={useDemoCoords}
              setUseDemo={setUseDemoCoords}
              presetIdx={presetIdx}
              setPresetIdx={setPresetIdx}
              onDeny={() => locate(true)}
            />
          )}
        </div>
      )}

      {phase === "askIntensity" && coords && (
        <>
          <div className="msg msg-bot">📍 위치를 확인했어요.{"\n"}냄새가 얼마나 심한지 골라 주시겠어요?</div>
          <IntensityButtons onPick={(level) => confirm(coords, level)} />
        </>
      )}

      {phase === "error" && coords && (
        <button className="btn btn-primary" onClick={() => confirm(coords)}>
          다시 접수하기
        </button>
      )}

      {phase === "done" && done && coords && (
        <Receipt
          result={{
            save: done as SaveResponse,
            intensity: done.intensity!,
            src: done.intensity_src!,
          }}
          extraction={done.extraction}
          demo={coords.demo}
          footer={<p className="meta" style={{ textAlign: "center", margin: 0 }}>이제 카카오톡으로 돌아가셔도 돼요.</p>}
        />
      )}
    </div>
  );
}
