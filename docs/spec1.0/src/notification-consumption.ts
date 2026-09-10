import type { PendingNotification, PlayerPreferences, Ship, ShipName } from "./model.ts";
import { notificationOutput } from "./notification-output.ts";

// One already-selected occurrence; the caller supplies C-023 ordering.
// Returning null means remove this occurrence from Galaxy.notifications.
export function discardNotificationRecipient(notice: PendingNotification,
  recipient: ShipName): PendingNotification | null {
  const remaining = structuredClone(notice);
  remaining.pendingRecipients.delete(recipient);
  return remaining.pendingRecipients.size ? remaining : null;
}

export function consumeNotification(notice: PendingNotification,
  observer: Pick<Ship, "name" | "position" | "radio" | "deviceDamage">,
  preferences: PlayerPreferences) {
  if (!notice.pendingRecipients.has(observer.name)) {
    throw new Error("selected recipient must have a pending copy");
  }
  const output = notificationOutput(notice.facts, observer, preferences);
  return { output, remaining: discardNotificationRecipient(notice, observer.name) };
}
