import { toPublicUser } from "@/lib/accounts";
import { signUp } from "@/lib/auth";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as { name?: unknown; email?: unknown; password?: unknown };
  const result = await signUp({ name: String(body.name ?? ""), email: String(body.email ?? ""), password: String(body.password ?? "") });
  if ("error" in result) return Response.json({ error: result.error }, { status: 400 });
  return Response.json({ user: toPublicUser(result.user), adopted: result.adopted });
}
