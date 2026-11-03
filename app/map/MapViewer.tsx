"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useState } from "react";
import { INTENSITY_LEVELS, REVIEW_COLOR, intensityInfo } from "@/lib/constants";
import { kstDay } from "@/lib/time";
import { timeOf, type MapReport, type Summary } from "./types";

const LeafletMap = dynamic(() => import("./LeafletMap"), {
  ssr: false,
  loading: () => <div className="empty">지도를 불러오는 중…</div>,
});

const REFRESH_MS = 10_000;

function shiftDay(day: string, delta: number) {
  const d = new Date(`${day}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + delta);
  return d.toISOString().slice(0, 10);
}

export default function MapViewer() {
  const [date, setDate] = useState(() => kstDay());
  const [tab, setTab] = useState<"map" | "list">("map");
  const [reports, setReports] = useState<MapReport[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [tileFailed, setTileFailed] = useState(false);
  const [loadError, setLoadError] = useState(false);

  const load = useCallback(async () => {
    try {
      const [r, s] = await Promise.all([
        fetch(`/api/reports?date=${date}`, { cache: "no-store" }).then((x) => x.json()),
        fetch(`/api/summary?date=${date}`, { cache: "no-store" }).then((x) => x.json()),
      ]);
      setReports(r.reports ?? []);
      setSummary(s);
      setLoadError(false);
    } catch {
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, [date]);

  useEffect(() => {
    setLoading(true);
    void load();
    const t = setInterval(load, REFRESH_MS);
    return () => clearInterval(t);
  }, [load]);

  const onTileError = useCallback(() => {
    setTileFailed(true);
    setTab("list");
  }, []);

  const isToday = date === kstDay();

  return (
    <>
      <section className="map-controls">
        <div className="date-row">
          <button aria-label="전날" onClick={() => setDate((d) => shiftDay(d, -1))}>
            ‹
          </button>
          <label htmlFor="date" className="sr-only">
            날짜
          </label>
          <input id="date" type="date" value={date} onChange={(e) => e.target.value && setDate(e.target.value)} />
          <button aria-label="다음날" onClick={() => setDate((d) => shiftDay(d, 1))}>
            ›
          </button>
          {!isToday && (
            <button onClick={() => setDate(kstDay())} style={{ fontSize: 15, padding: "0 10px" }}>
              오늘
            </button>
          )}
        </div>
        <div className="stats" aria-live="polite">
          <div className="stat">
            <b>{summary?.total ?? "–"}</b>
            <span>전체 제보</span>
          </div>
          <div className="stat">
            <b style={{ color: "#dc2626" }}>{summary?.high_intensity_count ?? "–"}</b>
            <span>강도 4 이상</span>
          </div>
          <div className="stat fail">
            <b>{summary?.location_failures ?? "–"}</b>
            <span>위치 실패</span>
          </div>
        </div>
        <div className="tabs" role="tablist">
          <button role="tab" aria-selected={tab === "map"} onClick={() => setTab("map")}>
            지도
          </button>
          <button role="tab" aria-selected={tab === "list"} onClick={() => setTab("list")}>
            목록 ({reports.length})
          </button>
        </div>
      </section>

      {tileFailed && <p className="banner">지도 타일을 불러오지 못해 목록으로 전환했어요.</p>}
      {loadError && <p className="banner">데이터를 불러오지 못했어요. 잠시 후 자동으로 다시 시도합니다.</p>}

      {tab === "map" ? (
        <>
          <div className="map-wrap">
            <LeafletMap reports={reports} onTileError={onTileError} />
          </div>
          <Legend />
        </>
      ) : (
        <ReportList reports={reports} loading={loading} />
      )}
    </>
  );
}

function Legend() {
  return (
    <div className="legend" aria-label="범례">
      {INTENSITY_LEVELS.map((l) => (
        <span key={l.level} className="badge" style={{ background: l.color, color: l.text }}>
          {l.short}
        </span>
      ))}
      <span className="badge" style={{ background: REVIEW_COLOR, color: "#fff" }}>
        확인 필요
      </span>
    </div>
  );
}

function ReportList({ reports, loading }: { reports: MapReport[]; loading: boolean }) {
  if (loading) return <div className="empty">불러오는 중…</div>;
  if (reports.length === 0) return <div className="empty">이 날짜에는 제보가 없어요.</div>;
  const sorted = [...reports].sort((a, b) => b.reported_at.localeCompare(a.reported_at));
  return (
    <ul className="list" style={{ listStyle: "none", margin: 0 }}>
      {sorted.map((r) => {
        const info = intensityInfo(r.intensity);
        return (
          <li key={r.id} className="card list-item">
            <div
              className="dot"
              style={{ background: r.needs_review ? REVIEW_COLOR : info.color, color: r.needs_review ? "#fff" : info.text }}
              aria-label={`강도 ${r.intensity}`}
            >
              {r.intensity}
            </div>
            <div>
              <p>
                <b>{info.label}</b> · {r.odor_type}{" "}
                {r.is_demo && <span className="badge badge-demo">시연</span>}{" "}
                {r.needs_review && <span className="badge badge-review">확인 필요</span>}
              </p>
              <p className="meta">
                {timeOf(r.reported_at)} · 격자 {r.grid_lat.toFixed(4)}, {r.grid_lng.toFixed(4)}
                {r.merged_count > 1 ? ` · ${r.merged_count}회 제보` : ""}
              </p>
              {r.symptoms.length > 0 && <p className="meta">증상: {r.symptoms.join(", ")}</p>}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
