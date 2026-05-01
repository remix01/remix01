import { getAuthenticatedPartner } from "@/lib/partner/resolver";
import { canonicalPartnerService } from "@/lib/partner/service";
import { ok, fail } from "@/lib/api/response";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { sendTemplatedEmail } from "@/lib/email/resend-utils";

/**
 * GET — partner profile (dual-read: obrtnik_profiles first, fallback partners)
 */
export async function GET() {
  const partner = await getAuthenticatedPartner();
  if (!partner) return fail("UNAUTHORIZED", "Unauthorized", 401);

  return ok({
    ...partner.profile,
    user_id: partner.userId,
    partner_id: partner.partnerId,
  });
}

/**
 * PATCH — update partner profile (single-write canonical: obrtnik_profiles only)
 */
export async function PATCH(req: Request) {
  const partner = await getAuthenticatedPartner();
  if (!partner) return fail("UNAUTHORIZED", "Unauthorized", 401);

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return fail("INVALID_JSON", "Invalid JSON", 400);
  }

  const allowed = [
    // legacy field names (mapped internally)
    "bio",
    "podjetje",
    "leta_izkusenj",
    // canonical field names
    "description",
    "business_name",
    "years_experience",
    "hourly_rate",
    "tagline",
    "website_url",
    "facebook_url",
    "instagram_url",
    "service_radius_km",
  ];

  const filtered: Record<string, unknown> = {};
  for (const key of allowed) {
    if (body[key] !== undefined) filtered[key] = body[key];
  }

  try {
    const data = await canonicalPartnerService.updateProfile(
      partner.partnerId,
      filtered,
    );

    // Send partner_updated notification email (fire-and-forget)
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("email, full_name, first_name")
      .eq("id", partner.userId)
      .maybeSingle();

    if (profile?.email) {
      const displayName = profile.full_name || profile.first_name || profile.email;
      sendTemplatedEmail({
        to: profile.email,
        template: {
          subject: "LiftGO - Profil posodobljen",
          html: `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
            body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;line-height:1.6;color:#1f2937;background:#f3f4f6;margin:0;padding:20px}
            .container{max-width:600px;margin:0 auto;background:white;border-radius:12px;overflow:hidden}
            .header{background:linear-gradient(135deg,#2563eb 0%,#1d4ed8 100%);color:white;padding:32px 30px;text-align:center}
            .logo{font-size:28px;font-weight:800;letter-spacing:2px}
            .content{padding:32px 30px}
            .footer{background:#f9fafb;padding:20px 30px;text-align:center;font-size:13px;color:#6b7280}
          </style></head><body>
          <div class="container">
            <div class="header"><div class="logo">LIFTGO</div></div>
            <div class="content">
              <p>Pozdravljeni, <strong>${displayName}</strong>!</p>
              <p>Vaš partnerski profil je bil uspešno posodobljen.</p>
              <p>Če niste zahtevali te spremembe, nas takoj kontaktirajte na
                <a href="mailto:support@liftgo.net">support@liftgo.net</a>.
              </p>
            </div>
            <div class="footer">&copy; 2026 LiftGO. Vse pravice pridržane.</div>
          </div></body></html>`,
        },
        eventType: "partner-updated",
        entityId: partner.userId,
      }).catch((err) =>
        console.error("[partner-profil] partner_updated email failed:", err)
      );
    }

    return ok({
      ...data,
      user_id: partner.userId,
      partner_id: partner.partnerId,
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Update failed";
    return fail("PROFILE_UPDATE_FAILED", msg, 500);
  }
}
