import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export const Route = createFileRoute("/api/public/share/$token")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const token = params.token;
        if (!token || token.length < 10) {
          return new Response(JSON.stringify({ error: "Invalid token" }), {
            status: 400,
            headers: { "Content-Type": "application/json" },
          });
        }

        const { data: link } = await supabaseAdmin
          .from("share_links")
          .select("*")
          .eq("token", token)
          .gt("expires_at", new Date().toISOString())
          .maybeSingle();

        if (!link) {
          return new Response(JSON.stringify({ error: "Link not found or expired" }), {
            status: 404,
            headers: { "Content-Type": "application/json" },
          });
        }

        const { data: profile } = await supabaseAdmin
          .from("profiles")
          .select("full_name, avatar_url, goal")
          .eq("user_id", link.user_id)
          .maybeSingle();

        const { data: checkins } = await supabaseAdmin
          .from("checkins")
          .select("id, weight, notes, created_at, photo_front, photo_side, photo_back")
          .eq("user_id", link.user_id)
          .order("created_at", { ascending: true });

        const list = checkins ?? [];
        const photoUrls: Record<string, string> = {};

        if (link.include_photos) {
          const paths = list.flatMap((c) =>
            [c.photo_front, c.photo_side, c.photo_back].filter(Boolean) as string[],
          );
          await Promise.all(
            paths.map(async (p) => {
              const { data } = await supabaseAdmin.storage
                .from("photos")
                .createSignedUrl(p, 60 * 60 * 24);
              if (data?.signedUrl) photoUrls[p] = data.signedUrl;
            }),
          );
        }

        const sanitized = list.map((c) => ({
          id: c.id,
          weight: c.weight,
          notes: link.include_notes ? c.notes : null,
          created_at: c.created_at,
          photo_front: link.include_photos ? c.photo_front : null,
          photo_side: link.include_photos ? c.photo_side : null,
          photo_back: link.include_photos ? c.photo_back : null,
        }));

        await supabaseAdmin
          .from("share_links")
          .update({ views: (link.views ?? 0) + 1 })
          .eq("id", link.id);

        return new Response(
          JSON.stringify({
            title: link.title,
            athlete: {
              name: profile?.full_name ?? "Atleta",
              avatar: profile?.avatar_url ?? null,
              goal: profile?.goal ?? null,
            },
            include_photos: link.include_photos,
            include_notes: link.include_notes,
            checkins: sanitized,
            photo_urls: photoUrls,
            expires_at: link.expires_at,
          }),
          {
            status: 200,
            headers: {
              "Content-Type": "application/json",
              "Cache-Control": "public, max-age=60",
            },
          },
        );
      },
    },
  },
});