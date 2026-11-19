import { isTauri } from "./platform";

let permission: boolean | null = null;

export async function ensureNotificationPermission(): Promise<boolean> {
  if (permission !== null) return permission;
  try {
    if (isTauri) {
      const n = await import("@tauri-apps/plugin-notification");
      permission = (await n.isPermissionGranted()) || (await n.requestPermission()) === "granted";
    } else if ("Notification" in window) {
      permission =
        Notification.permission === "granted" || (await Notification.requestPermission()) === "granted";
    } else {
      permission = false;
    }
  } catch (e) {
    console.warn("notification permission failed", e);
    permission = false;
  }
  return permission;
}

export async function notify(title: string, body: string) {
  if (!(await ensureNotificationPermission())) return;
  try {
    if (isTauri) {
      const n = await import("@tauri-apps/plugin-notification");
      n.sendNotification({ title, body });
    } else {
      new Notification(title, { body });
    }
  } catch (e) {
    console.warn("notification failed", e);
  }
}
