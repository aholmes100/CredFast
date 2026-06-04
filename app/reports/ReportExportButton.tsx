'use client'

import ExportButton from '../components/ExportButton'

interface Props {
  label?: string
  reportName: string
  headers: string[]
  rows: string[][]
}

export default function ReportExportButton({ label, reportName, headers, rows }: Props) {
  const today = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  const dateStr = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`
  const filename = `CredFast_${reportName}_${dateStr}.csv`

  return (
    <ExportButton
      label={label}
      filename={filename}
      getData={() => ({ headers, rows })}
    />
  )
}
