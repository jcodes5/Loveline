import { processDuePersonalMessageNotifications } from "../../server/notifications";

export default async function handler() {
  try {
    const result = await processDuePersonalMessageNotifications();
    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  } catch (error) {
    console.error("Scheduled notification delivery failed", error);
    return new Response(JSON.stringify({ error: "Scheduled notification delivery failed." }), {
      status: 500,
      headers: { "content-type": "application/json" },
    });
  }
}

export const config = {
  schedule: "0 * * * *",
};
