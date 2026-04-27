import { ok, fail } from "@/lib/api/response";
import { createClient } from "@/lib/supabase/server";
import { normalizeTier, tierHasFeature } from "@/lib/plans";
import { executeAgent } from "@/lib/ai/orchestrator";

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return fail("UNAUTHORIZED", "Unauthorized", 401);

    const { data: profile } = await supabase
      .from("obrtnik_profiles")
      .select("subscription_tier")
      .eq("id", user.id)
      .maybeSingle();

    const tier = normalizeTier(profile?.subscription_tier);
    if (!tierHasFeature(tier, "insights")) {
      return fail("TIER_REQUIRED", "PRO paket obvezen.", 403);
    }

    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const { data: offers } = await supabase
      .from("ponudbe")
      .select("id, status, created_at, price_estimate")
      .eq("obrtnik_id", user.id)
      .gte("created_at", since);

    const sent = (offers || []).length;
    const accepted = (offers || []).filter(
      (o) => o.status === "sprejeta",
    ).length;
    const conversion = sent > 0 ? Math.round((accepted / sent) * 100) : 0;
    const avgPrice =
      sent > 0
        ? Math.round(
            (offers || []).reduce((s, o) => s + (o.price_estimate || 0), 0) /
              sent,
          )
        : 0;

    const ai = await executeAgent({
      userId: user.id,
      agentType: "general_chat",
      userMessage: `Na podlagi metrike pripravi 4 personalizirane poslovne nasvete v slovenščini za obrtnika. Metrike: poslane=${sent}, sprejete=${accepted}, konverzija=${conversion}%, povprecna_cena=${avgPrice} EUR. Vrni seznam v markdown bullet obliki.`,
      useRAG: false,
      useTools: false,
    });

    const periodStart = new Date(
      Date.now() - 30 * 24 * 60 * 60 * 1000,
    ).toISOString();
    const periodEnd = new Date().toISOString();
    await supabase.from("partner_insights" as any).upsert(
      {
        partner_id: user.id,
        period_start: periodStart,
        period_end: periodEnd,
        metrics: { sent, accepted, conversion, avgPrice },
        recommendations: ai.response,
      },
      { onConflict: "partner_id,period_start,period_end" },
    );

    return ok({
      metrics: { sent, accepted, conversion, avgPrice },
      recommendations: ai.response,
    });
  } catch (error) {
    console.error("[partner-insights] error:", error);
    return fail("INSIGHTS_FETCH_FAILED", "Napaka pri pridobivanju uvidov", 500);
  }
}
