import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getMessaging, type BatchResponse } from "firebase-admin/messaging";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { generateAIDraft } from "./ai/gemini";

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
  morning_enabled?: boolean;
  morning_time?: string | null;
  night_enabled?: boolean;
  night_time?: string | null;
  special_dates_enabled?: boolean;
  special_dates_time?: string | null;
  quiet_hours_enabled?: boolean;
  quiet_hours_start?: string | null;
  quiet_hours_end?: string | null;
};

type NotificationCategory = "morning" | "night" | "special_date";

type GenericNotification = {
  key: string;
  category: NotificationCategory;
  relationship_id: string;
  dateKey: string;
  title: string;
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

export function isWithinQuietHours(
  now: Date,
  timezone: string | null | undefined,
  enabled: boolean | null | undefined,
  start: string | null | undefined,
  end: string | null | undefined,
) {
  if (!enabled) return false;
  const startMinutes = reminderMinutes(start ?? "22:00");
  const endMinutes = reminderMinutes(end ?? "07:00");
  if (startMinutes === endMinutes) return false;

  const currentMinutes = zonedParts(now, validTimezone(timezone)).minutes;
  return startMinutes < endMinutes
    ? currentMinutes >= startMinutes && currentMinutes < endMinutes
    : currentMinutes >= startMinutes || currentMinutes < endMinutes;
}

type DeliveryResult = {
  messagesProcessed: number;
  dailyContentPrepared: number;
  dailyRemindersProcessed: number;
  specialDateRemindersProcessed: number;
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

function localDateKey(date: Date, timeZone: string) {
  return zonedParts(date, timeZone).date;
}

function addDays(dateKey: string, days: number) {
  const [year, month, day] = dateKey.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day + days));
  return date.toISOString().slice(0, 10);
}

function fallbackDailyContent(relationshipId: string, contentDate: string) {
  return {
    relationship_id: relationshipId,
    content_date: contentDate,
    hero_label: "A little something for today",
    hero_title: "You are loved in the ordinary moments too.",
    hero_body: "A quiet reminder is waiting for you, exactly where you can come back to it.",
    note_body: "Take one gentle minute for yourself today. Loveline will keep the soft things close.",
    affirmation: "I can move gently and still make progress.",
    affirmation_detail: "There is no need to rush through a day that deserves to be lived.",
    quote_text: "The small things are where love learns to stay.",
    quote_author: "Loveline",
    quote_source: null,
    approval_status: "pending",
    updated_at: new Date().toISOString(),
  };
}

function estimatedTokens(value: unknown) {
  const text = typeof value === "string" ? value : JSON.stringify(value);
  return Math.max(1, Math.ceil((text?.length ?? 0) / 4));
}

async function generateDailyContentRows(
  supabase: SupabaseClient,
  relationship: { id: string; name: string; owner_id: string },
  dates: string[],
) {
  const context = {
    relationshipId: relationship.id,
    relationshipName: relationship.name,
    contentDate: dates[0],
    days: dates.length,
    themes: ["connection", "gratitude", "small moments"],
  };
  let draft: Record<string, unknown> | null = null;
  let generationError: unknown;

  try {
    const result = await generateAIDraft({ type: "batch_daily", context });
    draft = result.draft as Record<string, unknown>;
  } catch (error) {
    generationError = error;
    console.warn("Scheduled daily content generation failed:", error);
  }

  const drafts = Array.isArray(draft?.drafts) ? draft.drafts : [];
  const draftsByDate = new Map<string, Record<string, unknown>>();
  for (const entry of drafts) {
    if (entry && typeof entry === "object" && !Array.isArray(entry)) {
      const value = entry as Record<string, unknown>;
      if (typeof value.contentDate === "string") draftsByDate.set(value.contentDate, value);
    }
  }

  const rows = dates.map((date) => {
    const value = draftsByDate.get(date);
    const content = {
      hero_label: value?.heroLabel,
      hero_title: value?.heroTitle,
      hero_body: value?.heroBody,
      note_body: value?.noteBody,
      affirmation: value?.affirmation,
      affirmation_detail: value?.affirmationDetail,
      quote_text: value?.quoteText,
      quote_author: value?.quoteAuthor,
    };
    const isComplete = Object.values(content).every(
      (field) => typeof field === "string" && field.trim().length > 0,
    );
    return isComplete
      ? {
          relationship_id: relationship.id,
          content_date: date,
          ...content,
          quote_source: typeof value?.quoteSource === "string" ? value.quoteSource : null,
          approval_status: "pending",
          updated_at: new Date().toISOString(),
        }
      : fallbackDailyContent(relationship.id, date);
  });

  const promptTokens = estimatedTokens(context);
  const completionTokens = estimatedTokens(
    draft ?? (generationError instanceof Error ? generationError.message : ""),
  );
  const { error: usageError } = await supabase.from("ai_generations").insert({
    relationship_id: relationship.id,
    created_by: relationship.owner_id,
    generation_type: "batch_daily",
    prompt_tokens: promptTokens,
    completion_tokens: completionTokens,
    total_tokens: promptTokens + completionTokens,
    status: generationError ? "error" : "success",
  });
  if (usageError) console.warn("Scheduled AI usage log failed:", usageError);

  return rows;
}

async function prepareUpcomingDailyContent(supabase: SupabaseClient, now: Date) {
  const { data: relationships, error: relationshipError } = await supabase
    .from("relationships")
    .select("id, name, owner_id");
  if (relationshipError) {
    throw new Error("Relationships could not be loaded for daily content preparation.");
  }

  let created = 0;
  const today = now.toISOString().slice(0, 10);
  const firstDate = addDays(today, -1);
  const dates = Array.from({ length: 9 }, (_, index) => addDays(firstDate, index));
  for (const relationship of relationships ?? []) {
    const { data: existing, error } = await supabase
      .from("daily_content")
      .select("content_date")
      .eq("relationship_id", relationship.id)
      .in("content_date", dates);
    if (error) {
      throw new Error("Existing daily content could not be loaded.");
    }

    const existingDates = new Set((existing ?? []).map((entry) => entry.content_date));
    const missingDates = dates.filter((date) => !existingDates.has(date));
    if (missingDates.length === 0) continue;
    const generatedRows = await generateDailyContentRows(supabase, relationship, missingDates);

    const { data: insertedRows, error: insertError } = await supabase
      .from("daily_content")
      .upsert(generatedRows, { onConflict: "relationship_id,content_date", ignoreDuplicates: true })
      .select("content_date");
    if (insertError) {
      throw new Error("Fallback daily content could not be prepared.");
    }
    created += insertedRows?.length ?? 0;
  }
  return created;
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
      .select("user_id, personal_messages_enabled, personal_messages_time, personal_messages_timezone, morning_enabled, morning_time, night_enabled, night_time, special_dates_enabled, special_dates_time, quiet_hours_enabled, quiet_hours_start, quiet_hours_end")
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
    if (isWithinQuietHours(
      now,
      preference?.personal_messages_timezone,
      preference?.quiet_hours_enabled,
      preference?.quiet_hours_start,
      preference?.quiet_hours_end,
    )) return false;
    return Boolean(preference?.personal_messages_enabled ?? true)
      && isNotificationReminderDue(
        message.dueAt,
        preference?.personal_messages_time ?? DEFAULT_REMINDER_TIME,
        preference?.personal_messages_timezone ?? DEFAULT_TIMEZONE,
        now,
      );
  });
}

async function loadRecipientDevicesForGenericNotification(
  supabase: SupabaseClient,
  relationshipId: string,
  notification: GenericNotification,
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
  if (recipientIds.length === 0) return [];

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
      .select("user_id, personal_messages_timezone, morning_enabled, morning_time, night_enabled, night_time, special_dates_enabled, special_dates_time, quiet_hours_enabled, quiet_hours_start, quiet_hours_end")
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
    if (isWithinQuietHours(
      now,
      preference?.personal_messages_timezone,
      preference?.quiet_hours_enabled,
      preference?.quiet_hours_start,
      preference?.quiet_hours_end,
    )) return false;
    const timezone = preference?.personal_messages_timezone ?? DEFAULT_TIMEZONE;
    const nowParts = zonedParts(now, validTimezone(timezone));
    if (notification.category !== "special_date" && nowParts.date !== notification.dateKey) return false;

    if (notification.category === "morning") {
      return Boolean(preference?.morning_enabled ?? true)
        && nowParts.minutes >= reminderMinutes(preference?.morning_time ?? "08:00");
    }
    if (notification.category === "night") {
      return Boolean(preference?.night_enabled ?? true)
        && nowParts.minutes >= reminderMinutes(preference?.night_time ?? "21:00");
    }
    return Boolean(preference?.special_dates_enabled ?? true)
      && nowParts.minutes >= reminderMinutes(preference?.special_dates_time ?? DEFAULT_REMINDER_TIME);
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

async function loadUndeliveredGenericDevices(
  supabase: SupabaseClient,
  notification: GenericNotification,
  devices: NotificationDevice[],
) {
  if (devices.length === 0) return [];

  const { data: deliveries, error } = await supabase
    .from("notification_deliveries")
    .select("notification_device_id")
    .eq("delivery_key", notification.key)
    .in("notification_device_id", devices.map((device) => device.id));

  if (error) {
    throw new Error("Notification delivery history could not be loaded.");
  }

  const deliveredIds = new Set((deliveries ?? []).map((delivery) => delivery.notification_device_id));
  return devices.filter((device) => !deliveredIds.has(device.id));
}

async function loadDailyReminderNotifications(supabase: SupabaseClient, now: Date): Promise<GenericNotification[]> {
  const today = now.toISOString().slice(0, 10);
  const { data, error } = await supabase
    .from("daily_content")
    .select("relationship_id, content_date")
    .eq("approval_status", "approved")
    .gte("content_date", addDays(today, -1))
    .lte("content_date", addDays(today, 1));
  if (error) {
    throw new Error("Daily content reminders could not be loaded.");
  }

  return (data ?? []).flatMap((entry) => [
    {
      key: `daily:${entry.relationship_id}:${entry.content_date}:morning`,
      category: "morning" as const,
      relationship_id: entry.relationship_id,
      dateKey: entry.content_date,
      title: "A morning note is waiting",
    },
    {
      key: `daily:${entry.relationship_id}:${entry.content_date}:night`,
      category: "night" as const,
      relationship_id: entry.relationship_id,
      dateKey: entry.content_date,
      title: "A night note is waiting",
    },
  ]);
}

function nextSpecialDateOccurrence(eventDate: string, recurrence: string | null, todayKey: string) {
  if (recurrence === "none") return eventDate;
  const [, month, day] = eventDate.split("-").map(Number);
  const [todayYear, todayMonth] = todayKey.split("-").map(Number);
  const asDateKey = (year: number, targetMonth: number) => {
    const lastDay = new Date(Date.UTC(year, targetMonth, 0)).getUTCDate();
    return year + "-" + String(targetMonth).padStart(2, "0") + "-" + String(Math.min(day, lastDay)).padStart(2, "0");
  };

  if (recurrence === "monthly") {
    const currentMonth = asDateKey(todayYear, todayMonth);
    if (currentMonth >= todayKey) return currentMonth;
    const nextMonth = todayMonth === 12 ? 1 : todayMonth + 1;
    return asDateKey(todayYear + (todayMonth === 12 ? 1 : 0), nextMonth);
  }

  const thisYear = asDateKey(todayYear, month);
  return thisYear >= todayKey ? thisYear : asDateKey(todayYear + 1, month);
}

async function loadSpecialDateNotifications(supabase: SupabaseClient, now: Date): Promise<GenericNotification[]> {
  const { data, error } = await supabase
    .from("special_dates")
    .select("id, relationship_id, label, event_date, recurrence, remind_before_days, timezone")
    .eq("enabled", true);
  if (error) {
    throw new Error("Special date reminders could not be loaded.");
  }

  return (data ?? []).flatMap((date) => {
    const timezone = validTimezone(date.timezone);
    const todayKey = localDateKey(now, timezone);
    const occurrence = nextSpecialDateOccurrence(date.event_date, date.recurrence, todayKey);
    const remindStart = addDays(occurrence, -Number(date.remind_before_days ?? 0));
    if (todayKey < remindStart || todayKey > occurrence) return [];
    return [{
      key: `special-date:${date.id}:${occurrence}:${todayKey}`,
      category: "special_date" as const,
      relationship_id: date.relationship_id,
      dateKey: todayKey,
      title: "A special date is coming up",
    }];
  });
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

async function sendGenericToDevices(
  messaging: ReturnType<typeof getMessaging>,
  devices: NotificationDevice[],
  notification: GenericNotification,
) {
  let notificationsSent = 0;
  const invalidDeviceIds: string[] = [];
  const deliveryRows: Array<{
    relationship_id: string;
    user_id: string;
    notification_device_id: string;
    delivery_key: string;
    category: NotificationCategory;
  }> = [];

  for (let index = 0; index < devices.length; index += 500) {
    const chunk = devices.slice(index, index + 500);
    const response: BatchResponse = await messaging.sendEachForMulticast({
      tokens: chunk.map((device) => device.token),
      data: {
        type: notification.category,
        relationshipId: notification.relationship_id,
        deliveryKey: notification.key,
      },
      notification: {
        title: notification.title,
        body: "Something thoughtful is waiting inside Loveline.",
      },
    });

    response.responses.forEach((result, responseIndex) => {
      const device = chunk[responseIndex];
      if (result.success) {
        notificationsSent += 1;
        deliveryRows.push({
          relationship_id: notification.relationship_id,
          user_id: device.user_id,
          notification_device_id: device.id,
          delivery_key: notification.key,
          category: notification.category,
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
  const dailyContentPrepared = await prepareUpcomingDailyContent(supabase, now);
  const dueMessages = await loadDueMessages(supabase, now.toISOString());
  const dailyNotifications = await loadDailyReminderNotifications(supabase, now);
  const specialDateNotifications = await loadSpecialDateNotifications(supabase, now);
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

  let dailyRemindersProcessed = 0;
  let specialDateRemindersProcessed = 0;
  for (const notification of [...dailyNotifications, ...specialDateNotifications]) {
    const devices = await loadRecipientDevicesForGenericNotification(
      supabase,
      notification.relationship_id,
      notification,
      now,
    );
    const undeliveredDevices = await loadUndeliveredGenericDevices(supabase, notification, devices);
    const result = await sendGenericToDevices(messaging, undeliveredDevices, notification);

    if (result.deliveryRows.length > 0) {
      const { error } = await supabase
        .from("notification_deliveries")
        .upsert(result.deliveryRows, {
          onConflict: "notification_device_id,delivery_key",
        });
      if (error) {
        throw new Error("Notification delivery history could not be saved.");
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
    if (notification.category === "special_date") {
      specialDateRemindersProcessed += 1;
    } else {
      dailyRemindersProcessed += 1;
    }
  }

  return {
    messagesProcessed: dueMessages.length,
    dailyContentPrepared,
    dailyRemindersProcessed,
    specialDateRemindersProcessed,
    notificationsSent,
    invalidTokensRemoved,
  };
}
