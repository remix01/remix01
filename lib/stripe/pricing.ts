import { STRIPE_PRODUCTS } from './config'

export const PLATFORM_FEE_PERCENT = {
  start: STRIPE_PRODUCTS.START.commission,
  pro: STRIPE_PRODUCTS.PRO.commission,
} as const
