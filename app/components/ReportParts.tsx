"use client";

import Link from "next/link";
import { DEMO_PRESETS, INTENSITY_LEVELS, intensityInfo } from "@/lib/constants";

export interface Extraction {
  intensity: number | null;
  odor_type: string;
  symptoms: string[];
  confidence: number;
  needs_question: boolean;
  fallback: boolean;
}

export interface SaveResponse {
  id: number;
  merged: boolean;
  needs_review: boolean;
  today_nearby_count: number;
}

export function IntensityButtons({ onPick, disabled }: { onPick: (level: number) => void; disabled?: boolean }) {
  return (
    <div className="intensity-grid" role="group" aria-label="악취 강도 선택">
      {INTENSITY_LEVELS.map((l) => (
        <button
          key={l.level}
          className="intensity-btn"
          style={{ background: l.color, color: l.text }}
          onClick={() => onPick(l.level)}
          disabled={disabled}
        >
          <span>{l.short}</span>
          <small>“{l.example}”</small>
        </button>
      ))}
    </div>
  );
}

export function DemoPanel(props: {
  useDemo: boolean;
  setUseDemo: (v: boolean) => void;
  presetIdx: number;
  setPresetIdx: (v: number) => void;
  onDeny: () => void;
  onNewResident?: () => void;
}) {
  return (
    <div className="demo-panel">
      <label>
        <input type="checkbox" checked={props.useDemo} onChange={(e) => props.setUseDemo(e.target.checked)} />
        시연 모드: 애월읍 가상 좌표 사용
      </label>
      {props.useDemo && (
        <select value={props.presetIdx} onChange={(e) => props.setPresetIdx(Number(e.target.value))} aria-label="시연 위치">
          {DEMO_PRESETS.map((p, i) => (
            <option key={p.name} value={i}>
              {p.name}
            </option>
          ))}
        </select>
      )}
      <div className="demo-row">
        {props.onNewResident && (
          <button type="button" onClick={props.onNewResident}>
            새 주민으로 전환
          </button>
        )}
        <button type="button" onClick={props.onDeny}>
          위치 거부 시뮬레이션
        </button>
      </div>
    </div>
  );
}

export function Receipt({
  result,
  extraction,
  demo,
  onRestart,
  footer,
}: {
  result: { save: SaveResponse; intensity: number; src: "ai" | "button" };
  extraction: Pick<Extraction, "odor_type" | "symptoms">;
  demo: boolean;
  onRestart?: () => void;
  footer?: React.ReactNode;
}) {
  const info = intensityInfo(result.intensity);
  const time = new Date().toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Seoul" });
  return (
    <div className="receipt card">
      <strong style={{ fontSize: 20 }}>✅ 제보가 접수되었어요</strong>
      {demo && (
        <>
          {" "}
          <span className="badge badge-demo">시연 데이터</span>
        </>
      )}
      <dl>
        <dt>강도</dt>
        <dd>
          <span className="badge" style={{ background: info.color, color: info.text }}>
            {info.short}
          </span>{" "}
          <span className="meta">{result.src === "ai" ? "(자동 분석)" : "(직접 선택)"}</span>
        </dd>
        <dt>냄새 종류</dt>
        <dd>{extraction.odor_type}</dd>
        {extraction.symptoms.length > 0 && (
          <>
            <dt>증상</dt>
            <dd>{extraction.symptoms.join(", ")}</dd>
          </>
        )}
        <dt>시각</dt>
        <dd>{time}</dd>
      </dl>
      {result.save.merged && (
        <p className="notice">30분 안에 같은 곳에서 다시 알려주셔서 앞선 제보와 하나로 합치고, 최신 강도로 바꿨어요.</p>
      )}
      {result.save.needs_review && (
        <p className="notice">짧은 시간에 제보가 많거나 위치가 크게 바뀌어 ‘확인 필요’로 표시되었어요. 공개 집계에서는 잠시 제외됩니다.</p>
      )}
      <p>
        오늘 이 근처(1km)에서 <b>{result.save.today_nearby_count}건</b>의 제보가 모였어요.
      </p>
      <p className="notice">
        두통·구역질·호흡 곤란이 있으면 창문을 닫고 냄새가 덜한 곳으로 옮겨 쉬세요. 증상이 심하면 119에 연락하세요.
        정식 민원은 120 제주콜센터로 접수할 수 있어요.
      </p>
      <div className="actions">
        <Link className="btn btn-primary" href="/map">
          🗺️ 오늘 지도에서 확인하기
        </Link>
        {onRestart && (
          <button className="btn btn-ghost" onClick={onRestart}>
            다른 제보 하기
          </button>
        )}
        {footer}
      </div>
    </div>
  );
}
