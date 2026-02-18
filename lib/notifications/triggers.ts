import { NotificationService } from './notification-service'

/**
 * Notify customer when they receive a new offer
 */
export async function notifyOfferReceived(
  offer: { id: string; craftworkerName: string; amount: number },
  customerId: string
) {
  return NotificationService.create(
    customerId,
    'OFFER_RECEIVED',
    'Nova ponudba',
    `${offer.craftworkerName} vam je poslal ponudbo v vrednosti ${offer.amount}€`,
    { offerId: offer.id }
  )
}

/**
 * Notify craftworker when their offer is accepted
 */
export async function notifyOfferAccepted(
  offer: { id: string; customerName: string; projectTitle: string },
  craftworkerId: string
) {
  return NotificationService.create(
    craftworkerId,
    'OFFER_ACCEPTED',
    'Ponudba sprejeta',
    `${offer.customerName} je sprejel vašo ponudbo za "${offer.projectTitle}"`,
    { offerId: offer.id }
  )
}

/**
 * Notify user when project status changes
 */
export async function notifyProjectStatusChange(
  project: { id: string; title: string },
  newStatus: string,
  userId: string
) {
  const statusMessages: Record<string, string> = {
    IN_PROGRESS: 'Projekt je v teku',
    COMPLETED: 'Projekt je zaključen',
    CANCELLED: 'Projekt je preklican',
    DISPUTED: 'Odprt spor za projekt',
  }

  const message = statusMessages[newStatus] || `Status projekta: ${newStatus}`

  return NotificationService.create(
    userId,
    'STATUS_CHANGED',
    'Sprememba statusa projekta',
    `"${project.title}" - ${message}`,
    { projectId: project.id, newStatus }
  )
}

/**
 * Notify craftworker when payment is released from escrow
 */
export async function notifyPaymentReleased(
  escrowRecord: {
    id: string
    amount: number
    projectTitle: string
  },
  craftworkerId: string
) {
  return NotificationService.create(
    craftworkerId,
    'PAYMENT_RECEIVED',
    'Izplačilo prejeto',
    `Prejeli ste plačilo v višini ${escrowRecord.amount}€ za "${escrowRecord.projectTitle}"`,
    { escrowId: escrowRecord.id }
  )
}

/**
 * Notify craftworker when they receive a new review
 */
export async function notifyNewReview(
  review: {
    id: string
    rating: number
    customerName: string
    projectTitle: string
  },
  craftworkerId: string
) {
  return NotificationService.create(
    craftworkerId,
    'REVIEW_RECEIVED',
    'Nova ocena',
    `${review.customerName} vas je ocenil z ${review.rating}/5 zvezdic za "${review.projectTitle}"`,
    { reviewId: review.id }
  )
}
