import { incrementLocationFailure } from "@/lib/db";

export async function POST() {
  const count = incrementLocationFailure();
  return Response.json({ ok: true, count });
}
