'use client'

import Link from 'next/link'
import { supabase } from '../../lib/supabase'
import { useRouter } from 'next/navigation'

export default function NewGroupPage() {
  const router = useRouter()

  async function handleSubmit(formData: FormData) {
    const { error } = await supabase.from('groups').insert([{
      name:       formData.get('name')       as string,
      legal_name: formData.get('legal_name') as string,
      tax_id:     formData.get('tax_id')     as string,
      group_npi:  formData.get('group_npi')  as string,
    }])

    if (error) { alert('Error creating group'); return }
    router.push('/groups')
  }

  return (
    <main className="page">
      <Link href="/groups" className="back-link">← Groups</Link>
      <h1 className="page-title" style={{ marginBottom: '20px' }}>New Group</h1>

      <div className="form-card">
        <form action={handleSubmit}>
          <div className="form-field">
            <label className="form-label">Group Name</label>
            <input className="form-input" name="name" placeholder="Acme Medical Group" />
          </div>
          <div className="form-field">
            <label className="form-label">Legal Name</label>
            <input className="form-input" name="legal_name" placeholder="Acme Medical Group LLC" />
          </div>
          <div className="form-row form-row-2">
            <div className="form-field">
              <label className="form-label">Tax ID</label>
              <input className="form-input" name="tax_id" placeholder="XX-XXXXXXX" />
            </div>
            <div className="form-field">
              <label className="form-label">Group NPI</label>
              <input className="form-input" name="group_npi" placeholder="10-digit NPI" />
            </div>
          </div>
          <button type="submit" className="btn btn-primary btn-full" style={{ marginTop: '8px' }}>
            Create Group
          </button>
        </form>
      </div>
    </main>
  )
}
