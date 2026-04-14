'use client'

import Link from 'next/link'
import { supabase } from '../../lib/supabase'
import { useRouter } from 'next/navigation'

export default function NewProviderPage() {
  const router = useRouter()

  async function handleSubmit(formData: FormData) {
    const { error } = await supabase.from('providers').insert([{
      first_name: formData.get('first_name') as string,
      last_name:  formData.get('last_name')  as string,
      npi:        formData.get('npi')        as string,
      email:      formData.get('email')      as string,
    }])

    if (error) { alert('Error creating provider'); return }
    router.push('/providers')
  }

  return (
    <main className="page">
      <Link href="/providers" className="back-link">← Providers</Link>
      <h1 className="page-title" style={{ marginBottom: '20px' }}>New Provider</h1>

      <div className="form-card">
        <form action={handleSubmit}>
          <div className="form-row form-row-2">
            <div className="form-field">
              <label className="form-label">First Name</label>
              <input className="form-input" name="first_name" placeholder="Jane" />
            </div>
            <div className="form-field">
              <label className="form-label">Last Name</label>
              <input className="form-input" name="last_name" placeholder="Smith" />
            </div>
          </div>
          <div className="form-field">
            <label className="form-label">NPI</label>
            <input className="form-input" name="npi" placeholder="10-digit NPI number" />
          </div>
          <div className="form-field">
            <label className="form-label">Email</label>
            <input className="form-input" name="email" type="email" placeholder="jane@example.com" />
          </div>
          <button type="submit" className="btn btn-primary btn-full" style={{ marginTop: '8px' }}>
            Create Provider
          </button>
        </form>
      </div>
    </main>
  )
}
