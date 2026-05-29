'use client'
import { useEffect, useState } from 'react'
import { supabase } from './supabase'

export function useOrganizationId() {
  const [orgId, setOrgId] = useState<string | null>(null)

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return
      supabase
        .from('profiles')
        .select('organization_id')
        .eq('id', user.id)
        .single()
        .then(({ data }) => {
          if (data) setOrgId(data.organization_id)
        })
    })
  }, [])

  return orgId
}
