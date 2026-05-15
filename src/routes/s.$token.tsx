import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import logo from "@/assets/logo.png";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";

export const Route = createFileRoute("/s/$token")({
  head: ({ params }) => ({
    meta: [
      { title: "Progresso compartilhado — Franzen Team" },
      { name: "description", content: "Acompanhe a evolução deste atleta no programa Franzen Team." },
      { property: "og:title", content: "Progresso — Franzen Team" },
      { property: "og:description", content: "Acompanhe a evolução deste atleta." },
      { property: "og:type", content: "article" },
      { property: "og:image", content: `/api/public/share-og/${params.token}` },
      { property: "og:image:width", content: "1200" },
      { property: "og:image:height", content: "630" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:image", content: `/api/public/share-og/${params.token}` },
    ],
  }),
  component: SharePage,
});

type CheckinView = {
  id: string;
  weight: number | null;
  notes: string | null;
  created_at: string;
  photo_front: string | null;
  photo_side: string | null;
  photo_back: string | null;
};

type ShareData = {
  title: string | null;
  athlete: { name: string; avatar: string | null; goal: string | null };
  include_photos: boolean;
  include_notes: boolean;
  checkins: CheckinView[];
  photo_urls: Record<string, string>;
  expires_at: string;
};

function SharePage() {
  const { token } = Route.useParams();
  const [data, setData] = useState<ShareData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/public/share/${token}`)
      .then(async (r) => {
        if (!r.ok) {
          const j = await r.json().catch(() => ({}));
          throw new Error(j.error || "Link inválido ou expirado");
        }
        return r.json();
      })
      .then(setData)
      .catch((e) => setError(e.message));
  }, [token]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">Link indisponível</h1>
          <p className="text-muted-foreground">{error}</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground">Carregando…</p>
      </div>
    );
  }

  const chartData = data.checkins
    .filter((c) => c.weight != null)
    .map((c) => ({
      date: new Date(c.created_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }),
      peso: Number(c.weight),
    }));

  const first = chartData[0];
  const last = chartData[chartData.length - 1];
  const delta = first && last ? (last.peso - first.peso).toFixed(1) : null;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center gap-3">
          <img src={logo} alt="Franzen Team" className="h-8 w-8" />
          <span className="font-semibold">Franzen Team</span>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8 space-y-8">
        <section className="text-center space-y-2">
          {data.athlete.avatar && (
            <img
              src={data.athlete.avatar}
              alt={data.athlete.name}
              className="h-20 w-20 rounded-full mx-auto object-cover"
            />
          )}
          <h1 className="text-3xl font-bold">{data.title || `Progresso de ${data.athlete.name}`}</h1>
          {data.athlete.goal && (
            <p className="text-muted-foreground capitalize">Objetivo: {data.athlete.goal}</p>
          )}
        </section>

        {chartData.length >= 2 && (
          <section className="rounded-lg border border-border bg-card p-4">
            <div className="flex items-baseline justify-between mb-3">
              <h2 className="font-semibold">Evolução de peso</h2>
              {delta != null && (
                <span
                  className={`text-sm font-medium ${
                    Number(delta) < 0 ? "text-emerald-500" : "text-orange-500"
                  }`}
                >
                  {Number(delta) > 0 ? "+" : ""}
                  {delta} kg
                </span>
              )}
            </div>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                  <XAxis dataKey="date" fontSize={12} />
                  <YAxis fontSize={12} domain={["dataMin - 1", "dataMax + 1"]} />
                  <Tooltip />
                  <Line type="monotone" dataKey="peso" stroke="hsl(var(--primary))" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </section>
        )}

        {data.include_photos && (
          <section className="space-y-4">
            <h2 className="font-semibold">Fotos</h2>
            {data.checkins
              .filter((c) => c.photo_front || c.photo_side || c.photo_back)
              .map((c) => (
                <div key={c.id} className="rounded-lg border border-border bg-card p-3">
                  <div className="text-sm text-muted-foreground mb-2">
                    {new Date(c.created_at).toLocaleDateString("pt-BR")}
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {(["photo_front", "photo_side", "photo_back"] as const).map((k) => {
                      const path = c[k];
                      const url = path ? data.photo_urls[path] : null;
                      return url ? (
                        <img key={k} src={url} alt={k} className="aspect-[3/4] object-cover rounded" />
                      ) : (
                        <div key={k} className="aspect-[3/4] rounded bg-muted" />
                      );
                    })}
                  </div>
                </div>
              ))}
          </section>
        )}

        {data.include_notes && (
          <section className="space-y-3">
            <h2 className="font-semibold">Check-ins</h2>
            {data.checkins.slice().reverse().map((c) => (
              <div key={c.id} className="rounded-lg border border-border bg-card p-3">
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-muted-foreground">
                    {new Date(c.created_at).toLocaleDateString("pt-BR")}
                  </span>
                  {c.weight != null && <span className="font-medium">{c.weight} kg</span>}
                </div>
                {c.notes && <p className="text-sm whitespace-pre-wrap">{c.notes}</p>}
              </div>
            ))}
          </section>
        )}

        <footer className="text-center text-xs text-muted-foreground pt-6 border-t border-border">
          Compartilhado via Franzen Team · expira em{" "}
          {new Date(data.expires_at).toLocaleDateString("pt-BR")}
        </footer>
      </main>
    </div>
  );
}