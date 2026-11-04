import { requireUser } from "@/lib/auth";
import { demoDb } from "@/lib/demo";
import { updateDb } from "@/lib/store";
import { emptyDb, type ISODate } from "@/lib/types";

/** Replaces the user's data with the demo dataset. The client sends its local date. */
export async function POST(request: Request) {
  const user = await requireUser();
  if (user instanceof Response) return user;
  const { today } = (await request.json()) as { today: ISODate };
  return Response.json({ db: await updateDb(user.id, () => demoDb(today)) });
}

/** Wipes the user's data. */
export async function DELETE() {
  const user = await requireUser();
  if (user instanceof Response) return user;
  return Response.json({ db: await updateDb(user.id, () => emptyDb()) });
}
