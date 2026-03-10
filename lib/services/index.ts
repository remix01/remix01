/**
 * Service Layer - Central export point for all business logic services
 * Each service encapsulates business logic extracted from API routes
 */

export { matchingService } from './matchingService'
export { offerService } from './offerService'
export { paymentService } from './paymentService'
export { partnerService } from './partnerService'
export { notificationService } from './notificationService'
export { ServiceError, handleServiceError } from './serviceError'
export type { ServiceErrorCode } from './serviceError'
