/**
 * Marketplace Module - Central exports
 * 
 * The liquidity engine, broadcast system, and instant offer generation
 * work together to create an auto-matching marketplace experience.
 * 
 * Usage:
 *   import { liquidityEngine, workerBroadcast, instantOffer } from '@/lib/marketplace'
 * 
 * Flow:
 *   1. liquidityEngine.onNewRequest() - triggered when task is created
 *   2. Matches partners using matchingService
 *   3. Broadcasts to partners via workerBroadcast
 *   4. Generates instant offers for PRO partners
 *   5. Sets 2-hour deadline timer
 */

export { liquidityEngine } from './liquidityEngine'
export { workerBroadcast } from './workerBroadcast'
export { instantOffer } from './instantOffer'
