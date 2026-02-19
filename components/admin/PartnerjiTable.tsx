'use client'

import Link from 'next/link'
import { Eye, Edit, Ban, Trash2, Star } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { StatusBadge } from './StatusBadge'
import type { Partner } from '@/types/admin'

interface PartnerjiTableProps {
  partnerji: Partner[]
  currentPage: number
  totalPages: number
}

export function PartnerjiTable({ partnerji, currentPage, totalPages }: PartnerjiTableProps) {
  if (partnerji.length === 0) {
    return (
      <div className="py-12 text-center text-muted-foreground">
        Ni najdenih partnerjev
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Ime</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Telefon</TableHead>
              <TableHead>Tip</TableHead>
              <TableHead>Ocena</TableHead>
              <TableHead>Prevozov</TableHead>
              <TableHead>Datum registracije</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Akcije</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {partnerji.map((partner) => (
              <TableRow key={partner.id}>
                <TableCell className="font-medium">{partner.ime}</TableCell>
                <TableCell>{partner.email}</TableCell>
                <TableCell>{partner.telefon || '-'}</TableCell>
                <TableCell>{partner.tip}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-1">
                    <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                    <span>{partner.ocena.toFixed(1)}</span>
                  </div>
                </TableCell>
                <TableCell>{partner.steviloPrevozov}</TableCell>
                <TableCell>
                  {new Date(partner.createdAt).toLocaleDateString('sl-SI')}
                </TableCell>
                <TableCell>
                  <StatusBadge status={partner.status} />
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button variant="ghost" size="icon" asChild>
                      <Link href={`/admin/partnerji/${partner.id}`}>
                        <Eye className="h-4 w-4" />
                      </Link>
                    </Button>
                    <Button variant="ghost" size="icon">
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon">
                      <Ban className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon">
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Stran {currentPage} od {totalPages}
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage === 1}
              onClick={() => {
                const url = new URL(window.location.href)
                url.searchParams.set('page', String(currentPage - 1))
                window.location.href = url.toString()
              }}
            >
              Prejšnja
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage === totalPages}
              onClick={() => {
                const url = new URL(window.location.href)
                url.searchParams.set('page', String(currentPage + 1))
                window.location.href = url.toString()
              }}
            >
              Naslednja
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
