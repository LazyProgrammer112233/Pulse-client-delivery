import "server-only";
import { db, schema } from "@/db";
import type { ProjectStatus } from "./status";

export async function logEvent(input: {
  projectId: string;
  actorId: string | null;
  type: string;
  message: string;
  fromStatus?: ProjectStatus | null;
  toStatus?: ProjectStatus | null;
  data?: Record<string, unknown>;
}) {
  await db.insert(schema.events).values({
    projectId: input.projectId,
    actorId: input.actorId,
    type: input.type,
    message: input.message,
    fromStatus: input.fromStatus ?? null,
    toStatus: input.toStatus ?? null,
    data: input.data ?? {},
  });
}
