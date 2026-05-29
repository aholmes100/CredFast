import Link from 'next/link'
import { createClient } from '../lib/supabase-server'
import type { Payer } from '../types'
import PayerList from '../components/PayerList'

export default async function PayersPage() {
  const supabase = await createClient()
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

  const list = (payers ?? []) as Payer[]

  return (
    <main className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Payers</h1>
          <p className="page-subtitle">{list.length} payer{list.length !== 1 ? 's' : ''} on file</p>
        </div>
        <Link href="/payers/new" className="btn btn-primary">+ New Payer</Link>
      </div>

      <PayerList payers={list} />
    </main>
  )
}
