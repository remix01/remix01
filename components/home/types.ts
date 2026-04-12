export interface HomeStats {
  rating: number
  reviews: number
  activeCraftsmen: number
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
