import { supabase } from "@/integrations/supabase/client";

export type NotificationType =
  | "training_reminder"
  | "checkin_reminder"
  | "protocol_expiring"
  | "protocol_pending_review"
  | "protocol_approved"
  | "achievement_unlocked"
  | "new_message";

export async function notify(opts: {
  userId: string;
  type: NotificationType;
  title: string;
  body?: string;
  link?: string;
}) {
  const { error } = await supabase.from("notifications").insert({
    user_id: opts.userId,
    type: opts.type,
    title: opts.title,
    body: opts.body,
    link: opts.link,
  });
  if (error) console.error("notify failed", error);
}