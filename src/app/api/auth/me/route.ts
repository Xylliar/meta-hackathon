import { toPublicUser } from "@/lib/accounts";
import { requireUser, updateCurrentUser } from "@/lib/auth";
import { isTheme } from "@/lib/theme";

/** Updates the logged-in user's preferences (for now: the theme). */
export async function PATCH(request: Request) {
  const user = await requireUser();
  if (user instanceof Response) return user;
  const body = (await request.json().catch(() => ({}))) as { theme?: unknown };
  if (!isTheme(body.theme)) return Response.json({ error: "Thème inconnu." }, { status: 400 });
  const updated = await updateCurrentUser(user.id, { theme: body.theme });
  return Response.json({ user: updated && toPublicUser(updated) });
}
