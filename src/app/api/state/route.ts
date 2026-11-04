import { toPublicUser } from "@/lib/accounts";
import { requireUser } from "@/lib/auth";
import { getProvider } from "@/lib/llm";
import { readDb } from "@/lib/store";

export async function GET() {
  const user = await requireUser();
  if (user instanceof Response) return user;
  return Response.json({ user: toPublicUser(user), db: await readDb(user.id), provider: getProvider().name });
}
