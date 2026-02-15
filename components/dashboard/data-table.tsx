'use client'

import { Edit2, Trash2, Calendar, Tag } from 'lucide-react'

interface DataTableProps {
  data: any[]
  onEdit: (record: any) => void
  onDelete: (id: string) => void
}

export function DataTable({ data, onEdit, onDelete }: DataTableProps) {
  if (data.length === 0) {
    return (
      <div className="rounded-lg border border-dashed bg-muted/30 p-8 text-center">
        <p className="text-muted-foreground">Ni podatkov za prikaz</p>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b">
            <th className="px-4 py-3 text-left font-semibold text-foreground">
              Naslov
            </th>
            <th className="px-4 py-3 text-left font-semibold text-foreground">
              Kategorija
            </th>
            <th className="px-4 py-3 text-left font-semibold text-foreground">
              Status
            </th>
            <th className="px-4 py-3 text-left font-semibold text-foreground">
              Vrednost
            </th>
            <th className="px-4 py-3 text-left font-semibold text-foreground">
              Ustvarjeno
            </th>
            <th className="px-4 py-3 text-right font-semibold text-foreground">
              Dejanja
            </th>
          </tr>
        </thead>
        <tbody>
          {data.map((record) => (
            <tr
              key={record.id}
              className="border-b transition-colors hover:bg-muted/50"
            >
              <td className="px-4 py-3">
                <div>
                  <p className="font-medium text-foreground">{record.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {record.description}
                  </p>
                </div>
              </td>
              <td className="px-4 py-3">
                <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-foreground">
                  <Tag className="h-3 w-3" />
                  {record.category}
                </span>
              </td>
              <td className="px-4 py-3">
                <span
                  className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
                    record.status === 'completed'
                      ? 'bg-green-100 text-green-800'
                      : record.status === 'pending'
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-red-100 text-red-800'
                  }`}
                >
                  {record.status === 'completed'
                    ? 'Končano'
                    : record.status === 'pending'
                      ? 'V teku'
                      : 'Opuščeno'}
                </span>
              </td>
              <td className="px-4 py-3">
                <span className="font-medium text-foreground">
                  {record.value || '—'}
                </span>
              </td>
              <td className="px-4 py-3">
                <div className="flex items-center gap-1 text-muted-foreground">
                  <Calendar className="h-3.5 w-3.5" />
                  {new Date(record.created_at).toLocaleDateString('sl-SI')}
                </div>
              </td>
              <td className="px-4 py-3 text-right">
                <div className="flex justify-end gap-2">
                  <button
                    onClick={() => onEdit(record)}
                    className="rounded-lg p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  >
                    <Edit2 className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => onDelete(record.id)}
                    className="rounded-lg p-1 text-muted-foreground transition-colors hover:bg-red-50 hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
