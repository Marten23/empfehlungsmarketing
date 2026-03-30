import "server-only";

export type PendingPushEvent = {
  eventType: "new_public_contact";
  advisorId: string;
  referralId: string;
  title: string;
  body: string;
  createdAtIso: string;
};

export async function enqueuePendingPushEvent(_event: PendingPushEvent) {
  // Push is intentionally only prepared in this step.
  // This hook is the central place to wire a real push provider later.
  return;
}
