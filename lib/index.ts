// ============================================================================
// LiftGO Data Access Layer - Central Exports
// ============================================================================
// This file provides a single point of import for all database operations
// across the application.

// Profiles
export {
  getProfile,
  getProfileByEmail,
  createProfile,
  updateProfile,
  getObrtnikProfile,
  createObrtnikProfile,
  updateObrtnikProfile,
  getVerifiedObrtniki,
  searchObtniki,
} from '@/lib/dal/profiles'

// Categories
export {
  getActiveCategories,
  getCategory,
  getCategoryBySlug,
  getAllCategories,
} from '@/lib/dal/categories'

// Povprasevanja
export {
  getPovprasevanje,
  getPovprasevanja,
  createPovprasevanje,
  updatePovprasevanje,
  getOpenPovprasevanja,
  getUserPovprasevanja,
  updatePovprasevanjeStatus,
  getPovprasevanjaByCategory,
  getPovprasevanjaFiltered,
} from '@/lib/dal/povprasevanja'

// Ponudbe
export {
  getPonudba,
  getPonudbe,
  getPonudbeForPovprasevanje,
  getPonudbeByObrtnik,
  createPonudba,
  updatePonudba,
  acceptPonudba,
  rejectPonudba,
  getUserPonudbe,
  getAcceptedPonudbe,
} from '@/lib/dal/ponudbe'

// Types
export type {
  Profile,
  ProfileInsert,
  ProfileUpdate,
  ObrtnikProfile,
  ObrtnikProfileInsert,
  ObrtnikProfileUpdate,
  Category,
  Povprasevanje,
  PovprasevanjeInsert,
  PovprasevanjeUpdate,
  PovprasevanjeFilters,
  Ponudba,
  PonudbaInsert,
  PonudbaUpdate,
  Ocena,
  OcenaInsert,
} from '@/types/marketplace'

export type {
  UserRole,
  PovprasevanjeStatus,
  PonudbaStatus,
  Urgency,
  PriceType,
} from '@/types/marketplace'
