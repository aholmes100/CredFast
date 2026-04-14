import Link from 'next/link'
import { supabase } from '../lib/supabase'
import type { PayerFormWithPayer } from '../types'

export default async function PayerFormsPage() {
  const { data: forms, error } = await supabase
    .from('payer_forms')
    .select(`*, payers(name)`)
    .eq('is_active', true)
    .order('created_at', { ascending: false })

  if (error) {
    return (
      <main className="page">
        <div className="alert-error">Error loading payer forms.</div>
      </main>
    )
  }

  const rows = (forms ?? []) as unknown as PayerFormWithPayer[]

  return (
    <main className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Payer Forms</h1>
          <p className="page-subtitle">PDF templates for enrollment applications</p>
        </div>
        <Link href="/payer-forms/new" className="btn btn-primary">+ New Form</Link>
      </div>

      {rows.length ? (
        <div className="card-list">
          {rows.map((form) => (
            <Link key={form.id} href={`/payer-forms/${form.id}`} className="card-hover">
              <div className="card-row">
                <div>
                  <div className="card-title">{form.name}</div>
                  {form.payers?.name && (
                    <div className="card-sub">{form.payers.name}</div>
                  )}
                  <div className="card-meta" style={{ marginTop: '6px' }}>
                    <span className="card-meta-item">
                      {Object.keys(form.field_mappings ?? {}).length} field mappings
                    </span>
                    {form.storage_path ? (
                      <span className="pill" style={{ backgroundColor: '#f0fdf4', color: '#15803d' }}>PDF uploaded</span>
                    ) : (
                      <span className="pill" style={{ backgroundColor: '#fef9ec', color: '#a16207' }}>No PDF</span>
                    )}
                  </div>
                </div>
                <span style={{ color: '#cbd5e1', fontSize: '18px' }}>›</span>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="empty-state">
          No forms yet. <Link href="/payer-forms/new">Add the first template.</Link>
        </div>
      )}
    </main>
  )
}
