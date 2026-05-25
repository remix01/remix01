/**
 * National Business Registry Connectors
 *
 * Connects to official registries to verify craftsman business existence.
 * Currently supported:
 *  - SI: AJPES (Agencija RS za javnopravne evidence in storitve)
 *  - DE: Handelsregister (Unternehmensregister)
 *  - HR: Sudski registar
 *  - AT: Firmenbuch (WKO)
 *
 * For registries without a public API, we return a structured
 * manual-check request for the HITL queue.
 */

export interface RegistryLookupResult {
  found:          boolean
  registryId?:    string
  businessName?:  string
  address?:       string
  registeredAt?:  string
  isActive?:      boolean
  needsManualCheck: boolean
  rawData?:       Record<string, unknown>
}

// ─────────────────────────────────────────
// SLOVENIA — AJPES
// ─────────────────────────────────────────
export async function lookupAjpes(
  taxNumber: string,                    // davčna številka (e.g. 12345678)
): Promise<RegistryLookupResult> {
  const url = `https://www.ajpes.si/api/v2/prs/search?taxNumber=${taxNumber}`

  try {
    const res = await fetch(url, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(8000),
    })

    if (!res.ok) {
      // AJPES returns 404 for unknown entities
      return { found: false, needsManualCheck: false }
    }

    const data = await res.json()
    const entity = data.items?.[0]

    if (!entity) return { found: false, needsManualCheck: false }

    return {
      found:       true,
      registryId:  entity.matisnkaStevilka ?? entity.taxNumber,
      businessName: entity.poslovnoIme,
      address:     [entity.naslov, entity.posta, entity.kraj].filter(Boolean).join(', '),
      registeredAt: entity.datumVpisa,
      isActive:    entity.statusPravneOsebe === 'V',  // 'V' = vpisan (active)
      needsManualCheck: false,
      rawData: entity,
    }
  } catch (err) {
    console.warn('[Registry:AJPES] Request failed', err)
    return { found: false, needsManualCheck: true }
  }
}

// ─────────────────────────────────────────
// GERMANY — Unternehmensregister
// No public API — requires manual verification
// ─────────────────────────────────────────
export async function lookupHandelsregister(
  companyName: string,
  city: string,
): Promise<RegistryLookupResult> {
  // Unternehmensregister does not expose a public JSON API.
  // Flag for HITL manual check with a direct URL to the portal.
  return {
    found:            false,
    needsManualCheck: true,
    rawData: {
      portalUrl: `https://www.unternehmensregister.de/ureg/search.do?Unternehmensname=${encodeURIComponent(companyName)}&Ort=${encodeURIComponent(city)}`,
      companyName,
      city,
    },
  }
}

// ─────────────────────────────────────────
// CROATIA — Sudski registar
// ─────────────────────────────────────────
export async function lookupSudskiRegistar(
  oib: string,   // osobni identifikacijski broj
): Promise<RegistryLookupResult> {
  const url = `https://sudreg.pravosudje.hr/registar/f?p=150:28:0::NO:RP,28:P28_SB_MBS:${oib}`

  // Sudski registar is HTML only — flag for manual check
  return {
    found:            false,
    needsManualCheck: true,
    rawData: {
      portalUrl: url,
      oib,
    },
  }
}

// ─────────────────────────────────────────
// AUSTRIA — Firmenbuch (WKO)
// ─────────────────────────────────────────
export async function lookupFirmenbuch(
  companyName: string,
): Promise<RegistryLookupResult> {
  return {
    found:            false,
    needsManualCheck: true,
    rawData: {
      portalUrl: `https://www.firmenbuch.at/fbweb/search.do?name=${encodeURIComponent(companyName)}`,
      companyName,
    },
  }
}

// ─────────────────────────────────────────
// ROUTER — pick correct connector by country
// ─────────────────────────────────────────
export async function lookupRegistry(
  countryCode: string,
  params: {
    taxNumber?: string
    oib?: string
    companyName?: string
    city?: string
  },
): Promise<RegistryLookupResult> {
  switch (countryCode.toUpperCase()) {
    case 'SI':
      if (!params.taxNumber) return { found: false, needsManualCheck: true }
      return lookupAjpes(params.taxNumber)

    case 'DE':
      if (!params.companyName) return { found: false, needsManualCheck: true }
      return lookupHandelsregister(params.companyName, params.city ?? '')

    case 'HR':
      if (!params.oib) return { found: false, needsManualCheck: true }
      return lookupSudskiRegistar(params.oib)

    case 'AT':
      if (!params.companyName) return { found: false, needsManualCheck: true }
      return lookupFirmenbuch(params.companyName)

    default:
      return { found: false, needsManualCheck: true }
  }
}
