export interface HomeStats {
  rating: number | null
  reviews: number | null
  activeCraftsmen: number | null
}

export interface HomeActivityItem {
  id: string
  city: string
  category: string
  createdAt: string
}

export interface HomeTestimonial {
  id: string
  name: string
  avatar: string
  comment: string
  rating: number
}
