import { extractReport } from "@/lib/claude";
import { MAX_TEXT_LENGTH } from "@/lib/constants";

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const text = typeof body?.text === "string" ? body.text.trim() : "";
  if (!text) return Response.json({ error: "제보 문장이 비어 있습니다" }, { status: 400 });
  if (text.length > MAX_TEXT_LENGTH) {
    return Response.json({ error: `${MAX_TEXT_LENGTH}자 이내로 입력해 주세요` }, { status: 400 });
  }
  return Response.json(await extractReport(text));
}
