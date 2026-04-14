'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useRouter } from 'next/navigation'
import type { Group } from '../../types'

export default function NewLocationPage() {
  const router = useRouter()
  const [groups, setGroups] = useState<Group[]>([])

  useEffect(() => {
    supabase.from('groups').select('*').order('name', { ascending: true })
      .then(({ data, error }) => {
        if (!error && data) setGroups(data as Group[])
      })
  }, [])

  async function handleSubmit(formData: FormData) {
    const groupId = formData.get('group_id') as string
    const { error } = await supabase.from('locations').insert([{
      group_id:  groupId || null,
      name:      formData.get('name')      as string,
      address_1: formData.get('address_1') as string,
      city:      formData.get('city')      as string,
      state:     formData.get('state')     as string,
      zip:       formData.get('zip')       as string,
      phone:     formData.get('phone')     as string,
      fax:       formData.get('fax')       as string,
    }])

    if (error) { alert('Error creating location'); return }
    router.push('/locations')
  }

  return (
    <main className="page">
      <Link href="/locations" className="back-link">← Locations</Link>
      <h1 className="page-title" style={{ marginBottom: '20px' }}>New Location</h1>

      <div className="form-card">
        <form action={handleSubmit}>
          <div className="form-field">
            <label className="form-label">Group</label>
            <select className="form-select" name="group_id">
              <option value="">Select Group</option>
              {groups.map((g) => (
                <option key={g.id} value={g.id}>{g.name}</option>
              ))}
            </select>
          </div>
          <div className="form-field">
            <label className="form-label">Location Name</label>
            <input className="form-input" name="name" placeholder="Main Office" />
          </div>
          <div className="form-field">
            <label className="form-label">Address</label>
            <input className="form-input" name="address_1" placeholder="123 Main St" />
          </div>
          <div className="form-row form-row-3">
            <div className="form-field" style={{ gridColumn: 'span 1' }}>
              <label className="form-label">City</label>
              <input className="form-input" name="city" placeholder="Austin" />
            </div>
            <div className="form-field">
              <label className="form-label">State</label>
              <input className="form-input" name="state" placeholder="TX" maxLength={2} />
            </div>
            <div className="form-field">
              <label className="form-label">ZIP</label>
              <input className="form-input" name="zip" placeholder="78701" />
            </div>
          </div>
          <div className="form-row form-row-2">
            <div className="form-field">
              <label className="form-label">Phone</label>
              <input className="form-input" name="phone" placeholder="(512) 555-0100" />
            </div>
            <div className="form-field">
              <label className="form-label">Fax</label>
              <input className="form-input" name="fax" placeholder="(512) 555-0101" />
            </div>
          </div>
          <button type="submit" className="btn btn-primary btn-full" style={{ marginTop: '8px' }}>
            Create Location
          </button>
        </form>
      </div>
    </main>
  )
}
