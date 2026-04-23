import Stripe from 'stripe'
import { syncConnectedAccountStatus } from './shared'

export async function handleConnectAccount(event: Stripe.Event) {
  const eventType = event.type as string

  if (eventType === 'v2.core.account_person.created' || eventType === 'v2.core.account_person.updated') {
    const v2Event = event as unknown as {
      related_object: { id: string; type: string; url: string }
    }
    const urlParts = v2Event.related_object?.url?.split('/') ?? []
    const acctIndex = urlParts.indexOf('accounts')
    const connectedAccountId = acctIndex !== -1 ? urlParts[acctIndex + 1] : null
    if (!connectedAccountId) return

    await syncConnectedAccountStatus(connectedAccountId)
    return
  }

  const v2Event = event as unknown as {
    related_object: { id: string; type: string }
  }
  const connectedAccountId = v2Event.related_object?.id
  if (!connectedAccountId) return

  await syncConnectedAccountStatus(connectedAccountId)
}
