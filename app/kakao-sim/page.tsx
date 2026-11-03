import Link from "next/link";
import { notFound } from "next/navigation";
import KakaoSimulator from "./KakaoSimulator";

export const dynamic = "force-dynamic";

/** 오픈빌더 없이 카카오톡 대화를 흉내 내는 시연용 화면 (DEMO_MODE=true에서만 열림) */
export default function KakaoSimPage() {
  if (process.env.DEMO_MODE !== "true") notFound();
  return (
    <main className="shell kakao-shell">
      <header className="topbar kakao-topbar">
        <Link href="/" aria-label="처음으로">←</Link>
        <h1>제주숨결봇</h1>
        <span className="badge badge-demo">카톡 시뮬레이터</span>
      </header>
      <KakaoSimulator skillKey={process.env.KAKAO_SKILL_SECRET ?? ""} />
    </main>
  );
}
