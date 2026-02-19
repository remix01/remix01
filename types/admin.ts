export type Stranka = {
  id: string
  ime: string
  priimek: string
  email: string
  telefon?: string
  createdAt: Date
  status: 'AKTIVEN' | 'NEAKTIVEN' | 'SUSPENDIRAN'
  narocil: number
}

export type Partner = {
  id: string
  ime: string
  podjetje?: string
  tip: 'VOZNIK' | 'AGENCIJA' | 'PREVOZNIK'
  email: string
  telefon?: string
  createdAt: Date
  status: 'PENDING' | 'AKTIVEN' | 'SUSPENDIRAN' | 'ZAVRNJEN'
  ocena: number
  steviloPrevozov: number
}

export type AdminStats = {
  skupajStranke: number
  skupajPartnerji: number
  cakajoceVerifikacije: number
  aktivniUporabniki: number
  rastStrank: number
  rastPartnerjev: number
}

export type ChartData = {
  mesec: string
  vrednost: number
}

export type ZadnjaAktivnost = {
  stranke: Stranka[]
  partnerji: Partner[]
}
