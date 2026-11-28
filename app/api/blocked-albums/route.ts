import { z } from "zod";
import { database } from "../../../lib/db";
import { setAlbumBlocked } from "../../../lib/blocked-albums";
import { sameOrigin, session } from "../../../lib/session";

const change = z.object({
  key: z
    .string()
    .max(17)
    .regex(/^[mr][1-9][0-9]*$/),
  blocked: z.boolean(),
});

export async function PUT(request: Request) {
  if (!sameOrigin(request))
    return Response.json(
      { error: "Open Backspin to try again." },
      { status: 403 },
    );
  const account = await session();
  if (!account)
    return Response.json(
      { error: "Connect Discogs in Settings first." },
      { status: 401 },
    );

  const input = change.safeParse(await request.json().catch(() => null));
  if (!input.success)
    return Response.json(
      { error: "Invalid album preference." },
      { status: 400 },
    );

  setAlbumBlocked(
    database(),
    account.userId,
    input.data.key,
    input.data.blocked,
  );
  return new Response(null, { status: 204 });
}
