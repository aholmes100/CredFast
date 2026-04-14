import Link from 'next/link'
import { supabase } from '../lib/supabase'
import type { Payer } from '../types'
import DeleteRowButton from '../components/DeleteRowButton'

export default async function PayersPage() {
  const { data: payers, error } = await supabase
    .from('payers')
    .select('*')
    .order('name', { ascending: true })

  if (error) {
    return (
      <main className="page">
        <div className="alert-error">Error loading payers.</div>
      </main>
    )
  }

  return (
    <main className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Payers</h1>
          <p className="page-subtitle">Insurance payers and enrollment contacts</p>
        </div>
      </div>

      {payers?.length ? (
        <div className="card-list">
          {payers.map((payer: Payer) => (
            <div key={payer.id} className="card">
              <div className="card-row">
                <div>
                  <div className="card-title">{payer.name}</div>
                  <div className="card-meta" style={{ marginTop: '6px' }}>
                    {payer.payer_id_code && (
                      <span className="card-meta-item">ID: <strong>{payer.payer_id_code}</strong></span>
                    )}
                    {payer.processing_days && (
                      <span className="card-meta-item">~{payer.processing_days} day turnaround</span>
                    )}
                    {payer.enrollment_phone && (
                      <span className="card-meta-item">{payer.enrollment_phone}</span>
                    )}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Link href={`/payer-forms?payer=${payer.id}`} className="btn btn-secondary btn-sm">
                    Forms
                  </Link>
                  <DeleteRowButton table="payers" id={payer.id} label="payer" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="empty-state">
          No payers found. Run the migration SQL to seed common payers.
        </div>
      )}
    </main>
  )
}
