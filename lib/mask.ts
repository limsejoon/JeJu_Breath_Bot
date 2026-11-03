import { createHash } from "node:crypto";

const PATTERNS: [RegExp, string | ((...m: string[]) => string)][] = [
  // 이메일
  [/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g, "[이메일]"],
  // 주민등록번호 (휴대전화보다 먼저)
  [/\b\d{6}\s?-\s?[1-4]\d{6}\b/g, "[주민번호]"],
  // 휴대전화/일반전화
  [/\b01[016789][\s.-]?\d{3,4}[\s.-]?\d{4}\b/g, "[전화번호]"],
  [/\b0(2|[3-6][1-5]|64)[\s.-]?\d{3,4}[\s.-]?\d{4}\b/g, "[전화번호]"],
  // 성명: "이름은 홍길동", "저는 홍길동입니다", "홍길동 드림"
  [/(이름은|이름:|성함은)\s*[가-힣]{2,4}/g, (_m, p1) => `${p1} [성명]`],
  [/(저는|제가)\s*[가-힣]{2,4}(?=(입니다|이에요|예요|이고|라고))/g, (_m, p1) => `${p1} [성명]`],
  [/[가-힣]{2,4}(?=\s*(드림|올림))/g, "[성명]"],
];

export function maskText(text: string): string {
  let out = text;
  for (const [re, rep] of PATTERNS) out = out.replace(re, rep as never);
  return out;
}

export function hashUser(clientId: string, salt = process.env.USER_HASH_SALT ?? ""): string {
  if (!salt) throw new Error("USER_HASH_SALT 환경변수가 필요합니다");
  return createHash("sha256").update(salt + clientId).digest("hex");
}
