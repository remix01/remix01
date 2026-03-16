import type { Metadata } from 'next'
import MojsterDetailClient from './MojsterDetailClient'

export const revalidate = 30

interface PageProps {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params
  return {
    title: 'Mojster | LiftGO',
    alternates: { canonical: `/mojstri/${id}` },
  }
}

export default async function MojsterDetailPage({ params }: PageProps) {
  const { id } = await params
  return <MojsterDetailClient id={id} />
}
