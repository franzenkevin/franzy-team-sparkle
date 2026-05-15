import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import satori from "satori";
import { initWasm, Resvg } from "@resvg/resvg-wasm";
// @ts-expect-error - vite handles ?url for wasm
import resvgWasmUrl from "@resvg/resvg-wasm/index_bg.wasm?url";

let wasmReady: Promise<void> | null = null;
async function ensureWasm() {
  if (!wasmReady) {
    wasmReady = (async () => {
      const res = await fetch(resvgWasmUrl);
      const buf = await res.arrayBuffer();
      await initWasm(buf);
    })();
  }
  return wasmReady;
}

let fontCache: ArrayBuffer | null = null;
async function loadFont() {
  if (fontCache) return fontCache;
  const res = await fetch(
    "https://fonts.gstatic.com/s/inter/v18/UcCO3FwrK3iLTeHuS_nVMrMxCp50ojIw2boKoduKmMEVuLyfMZhrib2Bg-4.ttf",
  );
  fontCache = await res.arrayBuffer();
  return fontCache;
}

function svgPath(points: Array<{ x: number; y: number }>): string {
  if (points.length === 0) return "";
  return points.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
}

function buildChart(weights: number[], width: number, height: number) {
  if (weights.length < 2) return null;
  const min = Math.min(...weights);
  const max = Math.max(...weights);
  const range = max - min || 1;
  const stepX = width / (weights.length - 1);
  const points = weights.map((w, i) => ({
    x: i * stepX,
    y: height - ((w - min) / range) * height,
  }));
  return { line: svgPath(points), area: `${svgPath(points)} L${width},${height} L0,${height} Z` };
}

export const Route = createFileRoute("/api/public/share-og/$token")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const token = params.token;
        if (!token || token.length < 10) {
          return new Response("Invalid token", { status: 400 });
        }

        const { data: link } = await supabaseAdmin
          .from("share_links")
          .select("user_id, title, expires_at")
          .eq("token", token)
          .gt("expires_at", new Date().toISOString())
          .maybeSingle();

        if (!link) return new Response("Not found", { status: 404 });

        const { data: profile } = await supabaseAdmin
          .from("profiles")
          .select("full_name, goal")
          .eq("user_id", link.user_id)
          .maybeSingle();

        const { data: checkins } = await supabaseAdmin
          .from("checkins")
          .select("weight, created_at")
          .eq("user_id", link.user_id)
          .not("weight", "is", null)
          .order("created_at", { ascending: true });

        const weights = (checkins ?? [])
          .map((c) => Number(c.weight))
          .filter((n) => Number.isFinite(n));
        const first = weights[0];
        const last = weights[weights.length - 1];
        const delta = first != null && last != null ? last - first : null;
        const chart = buildChart(weights, 1000, 240);

        const title = link.title || `Progresso de ${profile?.full_name ?? "Atleta"}`;
        const subtitle = profile?.goal ? `Objetivo: ${profile.goal}` : "Franzen Team";

        const fontData = await loadFont();

        const svg = await satori(
          {
            type: "div",
            props: {
              style: {
                width: "1200px",
                height: "630px",
                display: "flex",
                flexDirection: "column",
                background: "linear-gradient(135deg, #0a0a0a 0%, #1a1a1a 100%)",
                color: "#fafafa",
                padding: "60px",
                fontFamily: "Inter",
              },
              children: [
                {
                  type: "div",
                  props: {
                    style: {
                      display: "flex",
                      alignItems: "center",
                      gap: "12px",
                      color: "#f59e0b",
                      fontSize: "22px",
                      fontWeight: 700,
                      letterSpacing: "0.15em",
                    },
                    children: "FRANZEN TEAM",
                  },
                },
                {
                  type: "div",
                  props: {
                    style: {
                      fontSize: "60px",
                      fontWeight: 700,
                      marginTop: "20px",
                      lineHeight: 1.1,
                      maxWidth: "1080px",
                    },
                    children: title,
                  },
                },
                {
                  type: "div",
                  props: {
                    style: {
                      fontSize: "26px",
                      color: "#a3a3a3",
                      marginTop: "10px",
                      textTransform: "capitalize",
                    },
                    children: subtitle,
                  },
                },
                {
                  type: "div",
                  props: {
                    style: { display: "flex", marginTop: "auto", gap: "40px", alignItems: "flex-end" },
                    children: [
                      {
                        type: "div",
                        props: {
                          style: { display: "flex", flexDirection: "column" },
                          children: [
                            {
                              type: "div",
                              props: { style: { fontSize: "20px", color: "#a3a3a3" }, children: "Check-ins" },
                            },
                            {
                              type: "div",
                              props: {
                                style: { fontSize: "56px", fontWeight: 700 },
                                children: String(weights.length),
                              },
                            },
                          ],
                        },
                      },
                      last != null && {
                        type: "div",
                        props: {
                          style: { display: "flex", flexDirection: "column" },
                          children: [
                            {
                              type: "div",
                              props: { style: { fontSize: "20px", color: "#a3a3a3" }, children: "Peso atual" },
                            },
                            {
                              type: "div",
                              props: {
                                style: { fontSize: "56px", fontWeight: 700 },
                                children: `${last.toFixed(1)} kg`,
                              },
                            },
                          ],
                        },
                      },
                      delta != null && {
                        type: "div",
                        props: {
                          style: { display: "flex", flexDirection: "column" },
                          children: [
                            {
                              type: "div",
                              props: { style: { fontSize: "20px", color: "#a3a3a3" }, children: "Variação" },
                            },
                            {
                              type: "div",
                              props: {
                                style: {
                                  fontSize: "56px",
                                  fontWeight: 700,
                                  color: delta < 0 ? "#10b981" : delta > 0 ? "#f59e0b" : "#fafafa",
                                },
                                children: `${delta > 0 ? "+" : ""}${delta.toFixed(1)} kg`,
                              },
                            },
                          ],
                        },
                      },
                      chart && {
                        type: "div",
                        props: {
                          style: {
                            display: "flex",
                            marginLeft: "auto",
                            width: "500px",
                            height: "120px",
                          },
                          children: {
                            type: "svg",
                            props: {
                              width: "500",
                              height: "120",
                              viewBox: "0 0 1000 240",
                              children: [
                                {
                                  type: "path",
                                  props: { d: chart.area, fill: "rgba(245, 158, 11, 0.15)" },
                                },
                                {
                                  type: "path",
                                  props: {
                                    d: chart.line,
                                    fill: "none",
                                    stroke: "#f59e0b",
                                    "stroke-width": "6",
                                    "stroke-linecap": "round",
                                    "stroke-linejoin": "round",
                                  },
                                },
                              ],
                            },
                          },
                        },
                      },
                    ].filter(Boolean),
                  },
                },
              ],
            },
          } as never,
          {
            width: 1200,
            height: 630,
            fonts: [{ name: "Inter", data: fontData, weight: 700, style: "normal" }],
          },
        );

        try {
          await ensureWasm();
          const resvg = new Resvg(svg, { fitTo: { mode: "width", value: 1200 } });
          const png = resvg.render().asPng();
          return new Response(png, {
            status: 200,
            headers: {
              "Content-Type": "image/png",
              "Cache-Control": "public, max-age=300",
            },
          });
        } catch (err) {
          console.error("OG png render failed, falling back to svg", err);
          return new Response(svg, {
            status: 200,
            headers: {
              "Content-Type": "image/svg+xml",
              "Cache-Control": "public, max-age=300",
            },
          });
        }
      },
    },
  },
});