import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '../../lib/supabase-server'
import type { PayerFormWithPayer } from '../../types'
import PdfFieldMapper from '../../components/PdfFieldMapper'
import FieldMappingsEditor from '../../components/FieldMappingsEditor'
import PdfUploader from '../../components/PdfUploader'
import DeleteButton from '../../components/DeleteButton'

export default async function PayerFormDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('payer_forms')
    .select(`*, payers(name)`)
    .eq('id', id)
    .single()

  if (error || !data) notFound()

  const form = data as unknown as PayerFormWithPayer

  return (
    <main style={{ padding: '32px', maxWidth: form.storage_path ? '1100px' : '768px' }}>
      {/* Breadcrumb */}
      <div className="breadcrumb">
        <Link href="/payer-forms" className="breadcrumb-link">Payer Forms</Link>
        <span className="breadcrumb-sep">/</span>
        <span className="breadcrumb-current">{form.name}</span>
      </div>

      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">{form.name}</h1>
          <div style={{ display: 'flex', gap: '6px', marginTop: '8px', flexWrap: 'wrap' }}>
            {form.payers?.name && <span className="pill">{form.payers.name}</span>}
            {form.storage_path ? (
              <span className="pill" style={{ backgroundColor: '#f0fdf4', color: '#15803d' }}>PDF uploaded</span>
            ) : (
              <span className="pill" style={{ backgroundColor: '#fef9ec', color: '#a16207' }}>No PDF yet</span>
            )}
            {Object.keys(form.field_mappings ?? {}).length > 0 && (
              <span className="pill">{Object.keys(form.field_mappings).length} fields mapped</span>
            )}
          </div>
        </div>
        <DeleteButton table="payer_forms" id={form.id} label="Delete Form" redirectTo="/payer-forms" />
      </div>

      {/* No PDF yet — show uploader */}
      {!form.storage_path && (
        <div className="card-lg" style={{ marginBottom: '16px' }}>
          <p className="section-label">Upload PDF Template</p>
          <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '12px' }}>
            Upload the payer&apos;s enrollment form PDF. Once uploaded, you can visually click on the form to map each field to provider data.
          </p>
          <PdfUploader formId={form.id} />
        </div>
      )}

      {/* PDF uploaded — show visual mapper */}
      {form.storage_path && (
        <div className="card-lg">
          <p className="section-label">Field Mapping</p>
          <p style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '16px' }}>
            Click anywhere on the form below to place a data field. The text will be drawn at that position when generating PDFs.
          </p>
          <PdfFieldMapper
            formId={form.id}
            initialMappings={form.field_mappings ?? {}}
          />
        </div>
      )}

      {/* No PDF — show text-based editor as fallback */}
      {!form.storage_path && (
        <div className="card-lg">
          <p className="section-label">Field Mappings (Manual)</p>
          <p style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '16px' }}>
            You can also define mappings manually if using a fillable PDF with named fields.
          </p>
          <FieldMappingsEditor
            formId={form.id}
            initialMappings={form.field_mappings ?? {}}
            hasPdf={false}
          />
        </div>
      )}
    </main>
  )
}
