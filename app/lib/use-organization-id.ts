'use client'
import { useEffect, useState } from 'react'
import { supabase } from './supabase'

export function useOrganizationId() {
  const [orgId, setOrgId] = useState<string | null>(null)

  async function fetchOrgId(userId: string) {
    const { data, error } = await supabase
      .from('profiles')
      .select('organization_id')
      .eq('id', userId)
      .single()
    if (error || !data?.organization_id) {
      console.error('[useOrganizationId] profiles lookup failed:', error)
      return
    }
    setOrgId(data.organization_id)
  }

  useEffect(() => {
    // Initial load — getSession() reads from the local cache (no network round-trip),
    // avoiding the race condition that getUser() has during SSR hydration.
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) fetchOrgId(session.user.id)
    })

    // Keep in sync if the session changes after mount (sign-in, sign-out, token refresh).
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        fetchOrgId(session.user.id)
      } else {
        setOrgId(null)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  return orgId
}
