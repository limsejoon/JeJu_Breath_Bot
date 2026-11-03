import fs from "node:fs";
import os from "node:os";
import path from "node:path";

/** 실행 파일 찾기: 환경변수 → ~/bin (맥에서 직접 설치한 경우) → PATH (윈도우 winget 설치 등) */
export function findBin(name: string, envVar: string): string {
  const fromEnv = process.env[envVar];
  if (fromEnv) return fromEnv;
  const home = path.join(os.homedir(), "bin", process.platform === "win32" ? `${name}.exe` : name);
  if (fs.existsSync(home)) return home;
  return name;
}

export const isWindows = process.platform === "win32";
