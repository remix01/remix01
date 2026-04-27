import { ok, fail } from "@/lib/api/response";
import { createClient } from "@/lib/supabase/server";
import type { CreateOfferPayload } from "@/lib/types/offer";

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return fail("UNAUTHORIZED", "Unauthorized", 401);
  }

  const body: CreateOfferPayload = await req.json();
  const {
    povprasevanje_id,
    title,
    message,
    price_estimate,
    price_type,
    available_date,
  } = body;

  if (!povprasevanje_id) {
    return fail("MISSING_INQUIRY_ID", "Povpraševanje je obvezno.", 400);
  }
  if (!message?.trim()) {
    return fail("MISSING_MESSAGE", "Sporočilo je obvezno.", 400);
  }
  if (!Number.isFinite(price_estimate) || price_estimate <= 0) {
    return fail("INVALID_PRICE", "Cena mora biti večja od 0.", 400);
  }

  // Prevent duplicate offers for the same inquiry
  const { data: existing } = await supabase
    .from("ponudbe")
    .select("id")
    .eq("povprasevanje_id", povprasevanje_id)
    .eq("obrtnik_id", user.id)
    .maybeSingle();

  if (existing) {
    return fail(
      "DUPLICATE_OFFER",
      "Za to povpraševanje ste že oddali ponudbo.",
      409,
    );
  }

  const { data, error } = await supabase
    .from("ponudbe")
    .insert({
      povprasevanje_id,
      obrtnik_id: user.id,
      title: title?.trim() ?? null,
      message: message.trim(),
      price_estimate,
      price_type: price_type ?? "ocena",
      status: "poslana",
      available_date: available_date ?? null,
    })
    .select("*")
    .single();

  if (error) {
    console.error("[POST /api/partner/offers] insert error:", error.message);
    return fail("OFFER_CREATE_FAILED", error.message, 500);
  }

  return ok(data, undefined, 201);
}
