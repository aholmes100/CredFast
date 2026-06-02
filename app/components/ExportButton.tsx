'use client'

interface Props { label?: string }

export default function ExportButton({ label = 'Export' }: Props) {
  return (
    <button
      onClick={() => alert('Export coming soon.')}
      className="btn btn-secondary btn-sm"
    >
      ↓ {label}
    </button>
  )
}
