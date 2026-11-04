import { applyAction, type Action } from "@/lib/actions";
import { requireUser } from "@/lib/auth";
import { updateDb } from "@/lib/store";

export async function POST(request: Request) {
  const user = await requireUser();
  if (user instanceof Response) return user;
  const action = (await request.json()) as Action;
  try {
    const db = await updateDb(user.id, (db) => applyAction(db, action));
    return Response.json({ db });
  } catch (err) {
    return Response.json({ error: (err as Error).message }, { status: 400 });
  }
}
