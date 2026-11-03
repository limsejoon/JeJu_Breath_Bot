import Link from "next/link";

export default function Home() {
  return (
    <main className="shell">
      <header className="topbar">
        <h1>제주숨결봇</h1>
        <Link href="/map">오늘 지도</Link>
      </header>
      <section className="hero">
        <h2>
          악취, 참지 말고
          <br />한 문장으로 알려주세요.
        </h2>
        <p>가입도, 앱 설치도 필요 없어요. 냄새가 날 때 그대로 적어 보내면 위치·시간·강도가 자동으로 기록됩니다.</p>
      </section>
      <div className="cta">
        <Link className="btn btn-primary btn-big" href="/report">
          지금 냄새 제보하기
        </Link>
        <Link className="btn btn-outline" href="/map">
          오늘 우리 동네 악취 지도 보기
        </Link>
      </div>
      <ol className="steps card">
        <li>“축사 냄새 때문에 창문을 못 열겠어요”처럼 편하게 적어요.</li>
        <li>큰 <b>위치 허용</b> 버튼을 한 번 눌러요.</li>
        <li>접수 완료! 오늘 지도에서 바로 확인해요.</li>
      </ol>
      <p className="footnote">
        이름·전화번호는 받지 않습니다. 위치는 약 200m 격자로 뭉뚱그려 표시하며, 냄새의 원인 사업장을 지목하지 않습니다.
        위치를 확인할 수 없으면 제보는 저장되지 않고, 실패 횟수만 익명으로 집계됩니다.
      </p>
    </main>
  );
}
