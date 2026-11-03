import { getSummary } from "@/lib/db";
import { isValidDay, kstDay } from "@/lib/time";

export async function GET(req: Request) {
  const date = new URL(req.url).searchParams.get("date") ?? kstDay();
  if (!isValidDay(date)) return Response.json({ error: "date는 YYYY-MM-DD 형식이어야 합니다" }, { status: 400 });
  return Response.json(getSummary(date));
}
