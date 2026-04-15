import Link from 'next/link'
import { notFound } from 'next/navigation'
import { supabase } from '../../lib/supabase'
import type { Payer } from '../../types'
import PayerEditor from '../../components/PayerEditor'
import DeleteButton from '../../components/DeleteButton'

export default async function PayerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  const { data, error } = await supabase
    .from('payers')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !data) notFound()

  const payer = data as Payer

  // Count applications for this payer
  const { count: appCount } = await supabase
    .from('enrollment_applications')
    .select('id', { count: 'exact', head: true })
    .eq('payer_id', id)

  // Fetch associated forms
  const { data: forms } = await supabase
    .from('payer_forms')
    .select('id, name, is_active')
    .eq('payer_id', id)
    .order('name')

  return (
    <main className="page-wide">
      {/* Breadcrumb */}
      <div className="breadcrumb">
        <Link href="/payers" className="breadcrumb-link">Payers</Link>
        <span className="breadcrumb-sep">/</span>
        <span className="breadcrumb-current">{payer.name}</span>
      </div>

      {/* Page header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">{payer.name}</h1>
          <div style={{ display: 'flex', gap: '6px', marginTop: '8px', flexWrap: 'wrap' }}>
            {payer.payer_id_code && (
              <span className="pill">ID: {payer.payer_id_code}</span>
            )}
            {payer.processing_days && (
              <span className="pill">~{payer.processing_days} day turnaround</span>
            )}
            {(appCount ?? 0) > 0 && (
              <span className="pill">{appCount} application{appCount !== 1 ? 's' : ''}</span>
            )}
          </div>
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <Link href={`/payer-forms?payer=${payer.id}`} className="btn btn-secondary">
            Manage Forms
          </Link>
          <DeleteButton table="payers" id={payer.id} label="Delete Payer" redirectTo="/payers" />
        </div>
      </div>

      {/* Related forms summary */}
      {forms && forms.length > 0 && (
        <div className="card-lg" style={{ marginBottom: '16px' }}>
          <p className="section-label">Enrollment Forms</p>
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            {forms.map(f => (
              <Link key={f.id} href={`/payer-forms/${f.id}`}
                style={{
                  fontSize: '12px', fontWeight: 500, padding: '4px 10px', borderRadius: '6px',
                  backgroundColor: f.is_active ? '#f0fdf4' : '#f8fafc',
                  color: f.is_active ? '#15803d' : '#94a3b8',
                  border: `1px solid ${f.is_active ? '#bbf7d0' : '#e2e8f0'}`,
                  textDecoration: 'none',
                }}>
                {f.name}
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Editable payer form */}
      <PayerEditor payer={payer} />
    </main>
  )
}
