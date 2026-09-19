import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getMessaging, type BatchResponse } from "firebase-admin/messaging";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

type DueMessage = {
  id: string;
  relationship_id: string;
  title: string;
  dueAt: string;
};

type NotificationDevice = {
  id: string;
  token: string;
  user_id: string;
};

type NotificationPreference = {
  user_id: string;
  personal_messages_enabled: boolean;
  personal_messages_time: string | null;
  personal_messages_timezone: string | null;
};

const DEFAULT_REMINDER_TIME = "09:00";
const DEFAULT_TIMEZONE = "UTC";

function validTimezone(value: string | null | undefined) {
  if (!value) return DEFAULT_TIMEZONE;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: value }).format();
    return value;
  } catch {
    return DEFAULT_TIMEZONE;
  }
}

function reminderMinutes(value: string | null | undefined) {
  const match = value?.match(/^(\d{2}):(\d{2})/);
  if (!match) return 9 * 60;
  return Number(match[1]) * 60 + Number(match[2]);
}

function zonedParts(value: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(value);
  const result = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return {
    date: `${result.year}-${result.month}-${result.day}`,
    minutes: Number(result.hour) * 60 + Number(result.minute),
  };
}

export function isNotificationReminderDue(
  messageDueAt: string,
  reminderTime: string | null | undefined,
  timezone: string | null | undefined,
  now = new Date(),
) {
  const dueAt = new Date(messageDueAt);
  if (Number.isNaN(dueAt.getTime()) || now < dueAt) return false;

  const safeTimezone = validTimezone(timezone);
  const dueParts = zonedParts(dueAt, safeTimezone);
  const nowParts = zonedParts(now, safeTimezone);
  if (nowParts.date > dueParts.date) return true;
  if (nowParts.date < dueParts.date) return false;
  return nowParts.minutes >= reminderMinutes(reminderTime);
}

type DeliveryResult = {
  messagesProcessed: number;
  notificationsSent: number;
  invalidTokensRemoved: number;
};

function getAdminSupabase(): SupabaseClient {
  const supabaseUrl = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Scheduled notification storage is not configured.");
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

function getFirebaseMessaging() {
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error("Scheduled notification delivery is not configured.");
  }

  const app =
    getApps()[0] ??
    initializeApp({
      credential: cert({ projectId, clientEmail, privateKey }),
    });

  return getMessaging(app);
}

async function loadDueMessages(supabase: SupabaseClient, now: string) {
  const [publishedResult, scheduledResult] = await Promise.all([
    supabase
      .from("personal_messages")
      .select("id, relationship_id, title, published_at, scheduled_for")
      .eq("status", "published")
      .not("published_at", "is", null)
      .lte("published_at", now),
    supabase
      .from("personal_messages")
      .select("id, relationship_id, title, published_at, scheduled_for")
      .eq("status", "scheduled")
      .not("scheduled_for", "is", null)
      .lte("scheduled_for", now),
  ]);

  if (publishedResult.error || scheduledResult.error) {
    throw new Error("Due personal messages could not be loaded.");
  }

  return [...(publishedResult.data ?? []), ...(scheduledResult.data ?? [])].map((message) => ({
    id: message.id,
    relationship_id: message.relationship_id,
    title: message.title,
    dueAt: message.published_at ?? message.scheduled_for,
  })).filter((message): message is DueMessage => Boolean(message.dueAt));
}

async function loadRecipientDevices(
  supabase: SupabaseClient,
  relationshipId: string,
  message: DueMessage,
  now: Date,
): Promise<NotificationDevice[]> {
  const { data: members, error: membersError } = await supabase
    .from("relationship_members")
    .select("user_id")
    .eq("relationship_id", relationshipId)
    .eq("role", "recipient");

  if (membersError) {
    throw new Error("Relationship recipients could not be loaded.");
  }

  const recipientIds = (members ?? []).map((member) => member.user_id);
  if (recipientIds.length === 0) {
    return [];
  }

  const [devicesResult, preferencesResult] = await Promise.all([
    supabase
      .from("notification_devices")
      .select("id, token, user_id")
      .eq("relationship_id", relationshipId)
      .eq("platform", "web")
      .eq("enabled", true)
      .in("user_id", recipientIds),
    supabase
      .from("notification_preferences")
      .select("user_id, personal_messages_enabled, personal_messages_time, personal_messages_timezone")
      .eq("relationship_id", relationshipId)
      .in("user_id", recipientIds),
  ]);

  if (devicesResult.error || preferencesResult.error) {
    throw new Error("Recipient notification settings could not be loaded.");
  }

  const preferencesByUser = new Map(
    ((preferencesResult.data ?? []) as NotificationPreference[]).map((preference) => [preference.user_id, preference]),
  );

  return ((devicesResult.data ?? []) as NotificationDevice[]).filter((device) => {
    const preference = preferencesByUser.get(device.user_id);
    return Boolean(preference?.personal_messages_enabled ?? true)
      && isNotificationReminderDue(
        message.dueAt,
        preference?.personal_messages_time ?? DEFAULT_REMINDER_TIME,
        preference?.personal_messages_timezone ?? DEFAULT_TIMEZONE,
        now,
      );
  });
}

async function loadUndeliveredDevices(
  supabase: SupabaseClient,
  messageId: string,
  devices: NotificationDevice[],
) {
  if (devices.length === 0) {
    return [];
  }

  const { data: deliveries, error } = await supabase
    .from("personal_message_deliveries")
    .select("notification_device_id")
    .eq("personal_message_id", messageId)
    .in(
      "notification_device_id",
      devices.map((device) => device.id),
    );

  if (error) {
    throw new Error("Personal message delivery history could not be loaded.");
  }

  const deliveredIds = new Set((deliveries ?? []).map((delivery) => delivery.notification_device_id));
  return devices.filter((device) => !deliveredIds.has(device.id));
}

async function sendToDevices(
  messaging: ReturnType<typeof getMessaging>,
  devices: NotificationDevice[],
  messageId: string,
  relationshipId: string,
) {
  let notificationsSent = 0;
  const invalidDeviceIds: string[] = [];
  const deliveryRows: Array<{ personal_message_id: string; notification_device_id: string }> = [];

  for (let index = 0; index < devices.length; index += 500) {
    const chunk = devices.slice(index, index + 500);
    const response: BatchResponse = await messaging.sendEachForMulticast({
      tokens: chunk.map((device) => device.token),
      data: {
        type: "personal_message_ready",
        relationshipId,
        messageId,
      },
    });

    response.responses.forEach((result, responseIndex) => {
      const device = chunk[responseIndex];
      if (result.success) {
        notificationsSent += 1;
        deliveryRows.push({
          personal_message_id: messageId,
          notification_device_id: device.id,
        });
      } else if (
        result.error?.code === "messaging/registration-token-not-registered" ||
        result.error?.code === "messaging/invalid-registration-token"
      ) {
        invalidDeviceIds.push(device.id);
      }
    });
  }

  return { notificationsSent, invalidDeviceIds, deliveryRows };
}

export async function processDuePersonalMessageNotifications(): Promise<DeliveryResult> {
  const supabase = getAdminSupabase();
  const messaging = getFirebaseMessaging();
  const now = new Date();
  const dueMessages = await loadDueMessages(supabase, now.toISOString());
  let notificationsSent = 0;
  let invalidTokensRemoved = 0;

  for (const message of dueMessages) {
    const devices = await loadRecipientDevices(supabase, message.relationship_id, message, now);
    const undeliveredDevices = await loadUndeliveredDevices(supabase, message.id, devices);
    const result = await sendToDevices(
      messaging,
      undeliveredDevices,
      message.id,
      message.relationship_id,
    );

    if (result.deliveryRows.length > 0) {
      const { error } = await supabase
        .from("personal_message_deliveries")
        .upsert(result.deliveryRows, {
          onConflict: "personal_message_id,notification_device_id",
        });
      if (error) {
        throw new Error("Personal message delivery history could not be saved.");
      }
    }

    if (result.invalidDeviceIds.length > 0) {
      const { error } = await supabase
        .from("notification_devices")
        .update({ enabled: false, updated_at: new Date().toISOString() })
        .in("id", result.invalidDeviceIds);
      if (error) {
        throw new Error("Invalid notification devices could not be disabled.");
      }
      invalidTokensRemoved += result.invalidDeviceIds.length;
    }

    notificationsSent += result.notificationsSent;
  }

  return {
    messagesProcessed: dueMessages.length,
    notificationsSent,
    invalidTokensRemoved,
  };
}
