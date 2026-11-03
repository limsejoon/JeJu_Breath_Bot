import Link from "next/link";
import MapViewer from "./MapViewer";

export default function MapPage() {
  return (
    <main className="shell">
      <header className="topbar">
        <Link href="/" aria-label="처음으로">←</Link>
        <h1>날짜별 악취 지도</h1>
        <Link href="/report">제보하기</Link>
      </header>
      <MapViewer />
    </main>
  );
}
