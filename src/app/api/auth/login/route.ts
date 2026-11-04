import { toPublicUser } from "@/lib/accounts";
import { logIn } from "@/lib/auth";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as { email?: unknown; password?: unknown };
  const user = await logIn(String(body.email ?? ""), String(body.password ?? ""));
  if (!user) return Response.json({ error: "E-mail ou mot de passe incorrect." }, { status: 401 });
  return Response.json({ user: toPublicUser(user) });
}
