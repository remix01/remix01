'use client'

import Link from 'next/link'
import { Eye, Edit, Ban, Trash2 } from 'lucide-react'
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
import type { Stranka } from '@/types/admin'

interface StrankeTableProps {
  stranke: Stranka[]
  currentPage: number
  totalPages: number
}

export function StrankeTable({ stranke, currentPage, totalPages }: StrankeTableProps) {
  if (stranke.length === 0) {
    return (
      <div className="py-12 text-center text-muted-foreground">
        Ni najdenih strank
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
              <TableHead>Datum registracije</TableHead>
              <TableHead>Naročil</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Akcije</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {stranke.map((stranka) => (
              <TableRow key={stranka.id}>
                <TableCell className="font-medium">
                  {stranka.ime} {stranka.priimek}
                </TableCell>
                <TableCell>{stranka.email}</TableCell>
                <TableCell>{stranka.telefon || '-'}</TableCell>
                <TableCell>
                  {new Date(stranka.createdAt).toLocaleDateString('sl-SI')}
                </TableCell>
                <TableCell>{stranka.narocil}</TableCell>
                <TableCell>
                  <StatusBadge status={stranka.status} />
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button variant="ghost" size="icon" asChild>
                      <Link href={`/admin/stranke/${stranka.id}`}>
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
