import Link from "next/link";
import { getPending } from "@/lib/db";
import KakaoConfirm from "./KakaoConfirm";

export const dynamic = "force-dynamic";

export default async function KakaoConfirmPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const lookup = getPending(token);
  const demoMode = process.env.DEMO_MODE === "true";

  return (
    <main className="shell">
      <header className="topbar">
        <h1>제주숨결봇 · 위치 확인</h1>
        {demoMode && <span className="badge badge-demo">시연 모드</span>}
      </header>
      {lookup.status === "ok" ? (
        <KakaoConfirm token={token} text={lookup.pending.text_masked} demoMode={demoMode} />
      ) : (
        <div className="chat">
          <div className="msg msg-bot msg-error">
            {lookup.status === "done"
              ? "이미 접수된 제보예요. 고맙습니다!"
              : lookup.status === "expired"
                ? "1시간이 지나 이 링크가 만료되었어요.\n카카오톡에서 냄새를 다시 알려주세요."
                : "제보를 찾을 수 없어요.\n카카오톡에서 냄새를 다시 알려주세요."}
          </div>
          <Link className="btn btn-outline" href="/map">
            오늘 지도 보기
          </Link>
        </div>
      )}
    </main>
  );
}
