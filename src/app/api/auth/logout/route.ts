import { logOut } from "@/lib/auth";

export async function POST() {
  await logOut();
  return Response.json({ ok: true });
}
