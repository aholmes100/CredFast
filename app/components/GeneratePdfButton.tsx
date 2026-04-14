'use client'

import { useState } from 'react'
import type { PayerFormWithPayer } from '../types'

interface Props {
  applicationId: string
  payerForms: PayerFormWithPayer[]
}

export default function GeneratePdfButton({ applicationId, payerForms }: Props) {
  const [selectedFormId, setSelectedFormId] = useState(
    payerForms.length === 1 ? payerForms[0].id : ''
  )
  const [generating, setGenerating] = useState(false)
  const [error, setError]           = useState<string | null>(null)

  const handleGenerate = async () => {
    if (!selectedFormId) { setError('Select a form to generate.'); return }
    setGenerating(true)
    setError(null)

    const res = await fetch('/api/generate-pdf', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ applicationId, payerFormId: selectedFormId }),
    })

    setGenerating(false)

    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      setError(body.error ?? 'Generation failed.')
      return
    }

    // Download the returned PDF
    const blob = await res.blob()
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href     = url
    a.download = `enrollment-${applicationId}.pdf`
    a.click()
    URL.revokeObjectURL(url)
  }

  if (payerForms.length === 0) {
    return (
      <p style={{ fontSize: '13px', color: '#94a3b8' }}>
        No payer forms available. <a href="/payer-forms/new" style={{ color: '#4f46e5' }}>Upload a template</a> first.
      </p>
    )
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
      {payerForms.length > 1 && (
        <select className="form-select" value={selectedFormId}
          onChange={(e) => setSelectedFormId(e.target.value)}
          style={{ width: 'auto', maxWidth: '260px' }}>
          <option value="">Select form…</option>
          {payerForms.map((f) => (
            <option key={f.id} value={f.id}>{f.name}</option>
          ))}
        </select>
      )}
      {payerForms.length === 1 && (
        <span style={{ fontSize: '13px', color: '#475569' }}>{payerForms[0].name}</span>
      )}
      <button onClick={handleGenerate} disabled={generating || !selectedFormId}
        className={!generating && selectedFormId ? 'btn btn-primary btn-sm' : 'btn btn-disabled btn-sm'}
        style={{ cursor: !generating && selectedFormId ? 'pointer' : 'not-allowed' }}>
        {generating ? 'Generating…' : 'Generate PDF'}
      </button>
      {error && <span style={{ fontSize: '12px', color: '#dc2626' }}>⚠ {error}</span>}
    </div>
  )
}
