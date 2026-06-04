'use client'

import { useState } from 'react'

interface ExportData {
  headers: string[]
  rows: string[][]
}

interface Props {
  label?: string
  filename: string
  getData: () => Promise<ExportData> | ExportData
}

function toCSV(headers: string[], rows: string[][]): string {
  const escape = (val: string) => `"${val.replace(/"/g, '""')}"`
  return [
    headers.map(escape).join(','),
    ...rows.map(row => row.map(escape).join(',')),
  ].join('\n')
}

function downloadCSV(filename: string, csv: string) {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export default function ExportButton({ label = 'Export', filename, getData }: Props) {
  const [loading, setLoading] = useState(false)

  const handleClick = async () => {
    setLoading(true)
    try {
      const { headers, rows } = await getData()
      downloadCSV(filename, toCSV(headers, rows))
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      className="btn btn-secondary btn-sm"
    >
      {loading ? 'Exporting…' : `↓ ${label}`}
    </button>
  )
}
