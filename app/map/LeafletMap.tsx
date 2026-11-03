"use client";

import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { useEffect, useRef } from "react";
import { REVIEW_COLOR, intensityInfo } from "@/lib/constants";
import { timeOf, type MapReport } from "./types";

const AEWOL_CENTER: L.LatLngExpression = [33.445, 126.33];
const TILE_ERROR_LIMIT = 3;

const escapeHtml = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

function popupHtml(r: MapReport) {
  const info = intensityInfo(r.intensity);
  const badge = r.needs_review
    ? `<span class="badge badge-review">확인 필요</span>`
    : `<span class="badge" style="background:${info.color};color:${info.text}">${info.short}</span>`;
  return `
    <div>
      ${badge} ${r.is_demo ? '<span class="badge badge-demo">시연</span>' : ""}
      <div style="margin-top:6px"><b>${escapeHtml(r.odor_type)}</b> · ${timeOf(r.reported_at)}${
        r.merged_count > 1 ? ` · ${r.merged_count}회` : ""
      }</div>
      ${r.symptoms.length ? `<div>증상: ${escapeHtml(r.symptoms.join(", "))}</div>` : ""}
      <div style="color:#475569;margin-top:4px">“${escapeHtml(r.text_masked)}”</div>
    </div>`;
}

export default function LeafletMap({ reports, onTileError }: { reports: MapReport[]; onTileError: () => void }) {
  const el = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const layer = useRef<L.LayerGroup | null>(null);
  const fittedKey = useRef<string>("");

  useEffect(() => {
    if (!el.current || map.current) return;
    const m = L.map(el.current, { center: AEWOL_CENTER, zoom: 13, zoomControl: true });
    let errors = 0;
    let loaded = 0;
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 18,
      attribution: "&copy; OpenStreetMap contributors",
    })
      .on("tileload", () => loaded++)
      .on("tileerror", () => {
        errors++;
        if (errors >= TILE_ERROR_LIMIT && loaded === 0) onTileError();
      })
      .addTo(m);
    layer.current = L.layerGroup().addTo(m);
    map.current = m;
    if (typeof navigator !== "undefined" && !navigator.onLine) onTileError();
    return () => {
      m.remove();
      map.current = null;
    };
  }, [onTileError]);

  useEffect(() => {
    const m = map.current;
    const g = layer.current;
    if (!m || !g) return;
    g.clearLayers();
    // 확인 필요(회색) 마커를 먼저 그려 정상 마커 아래에 깔리게 한다
    const ordered = [...reports].sort((a, b) => Number(b.needs_review) - Number(a.needs_review) || a.intensity - b.intensity);
    for (const r of ordered) {
      const info = intensityInfo(r.intensity);
      L.circleMarker([r.grid_lat, r.grid_lng], {
        radius: 9 + r.intensity * 2 + Math.min(r.merged_count - 1, 3) * 2,
        color: "#ffffff",
        weight: 2,
        fillColor: r.needs_review ? REVIEW_COLOR : info.color,
        fillOpacity: r.needs_review ? 0.6 : 0.85,
      })
        .bindPopup(popupHtml(r))
        .bindTooltip(`${r.needs_review ? "확인 필요" : info.short} · ${timeOf(r.reported_at)}`)
        .addTo(g);
    }
    // 날짜(데이터 집합)가 바뀌었을 때만 화면을 맞춘다 - 10초 갱신 때마다 줌이 튀지 않도록
    const key = reports.length ? reports[0].reported_at.slice(0, 10) : "";
    if (reports.length && key !== fittedKey.current) {
      fittedKey.current = key;
      m.fitBounds(L.latLngBounds(reports.map((r) => [r.grid_lat, r.grid_lng])), { padding: [40, 40], maxZoom: 14 });
    }
  }, [reports]);

  return <div ref={el} className="map" role="region" aria-label="악취 제보 지도" />;
}
