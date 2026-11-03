import Link from "next/link";
import ReportChat from "./ReportChat";

export const dynamic = "force-dynamic";

export default function ReportPage() {
  const demoMode = process.env.DEMO_MODE === "true";
  return (
    <main className="shell">
      <header className="topbar">
        <Link href="/" aria-label="처음으로">←</Link>
        <h1>악취 제보</h1>
        {demoMode && <span className="badge badge-demo">시연 모드</span>}
        <Link href="/map">지도</Link>
      </header>
      <ReportChat demoMode={demoMode} />
    </main>
  );
}
