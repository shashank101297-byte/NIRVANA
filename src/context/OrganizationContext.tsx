import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'

export type Organization = {
  id: string
  name: string
  code: string
  status: string
}

type OrganizationContextValue = {
  organizations: Organization[]
  activeOrganization: Organization | null
  activeOrganizationId: string | null
  loading: boolean
  error: string | null
  setActiveOrganization: (organizationId: string | null) => Promise<void>
  refreshOrganizations: () => Promise<void>
}

const OrganizationContext = createContext<OrganizationContextValue | undefined>(undefined)
const ACTIVE_ORGANIZATION_STORAGE_KEY = 'nirvana.activeOrganizationId'

function readStoredActiveOrganizationId(): string | null {
  if (typeof window === 'undefined') {
    return null
  }

  const stored = window.localStorage.getItem(ACTIVE_ORGANIZATION_STORAGE_KEY)
  return stored && stored.trim() ? stored.trim() : null
}

async function fetchUserOrganizations(): Promise<Organization[]> {
  const { data: userData, error: userError } = await supabase.auth.getUser()

  if (userError || !userData.user) {
    throw new Error(userError?.message ?? 'Unable to determine the authenticated user.')
  }

  const { data: memberships, error: membershipError } = await supabase
    .from('organization_memberships')
    .select('organization_id')
    .eq('user_id', userData.user.id)
    .eq('status', 'active')

  if (membershipError) {
    throw new Error(membershipError.message)
  }

  const organizationIds = Array.from(
    new Set(
      (memberships ?? [])
        .map((membership) => membership.organization_id)
        .filter((organizationId): organizationId is string => Boolean(organizationId)),
    ),
  )

  if (organizationIds.length === 0) {
    return []
  }

  const { data: organizationsData, error: organizationError } = await supabase
    .from('organizations')
    .select('id, name, code, status')
    .in('id', organizationIds)

  if (organizationError) {
    throw new Error(organizationError.message)
  }

  const organizations = (organizationsData ?? []) as Organization[]

  return organizations.sort((left, right) => left.name.localeCompare(right.name))
}

export function OrganizationProvider({ children }: { children: ReactNode }) {
  const [organizations, setOrganizations] = useState<Organization[]>([])
  const [activeOrganization, setActiveOrganizationState] = useState<Organization | null>(null)
  const [activeOrganizationId, setActiveOrganizationId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const persistActiveOrganization = useCallback((organizationId: string | null) => {
    if (typeof window === 'undefined') {
      return
    }

    if (!organizationId) {
      window.localStorage.removeItem(ACTIVE_ORGANIZATION_STORAGE_KEY)
      return
    }

    window.localStorage.setItem(ACTIVE_ORGANIZATION_STORAGE_KEY, organizationId)
  }, [])

  const refreshOrganizations = useCallback(async () => {
    const { data, error: sessionError } = await supabase.auth.getSession()

    if (sessionError) {
      setOrganizations([])
      setActiveOrganizationState(null)
      setActiveOrganizationId(null)
      setError(sessionError.message)
      setLoading(false)
      return
    }

    if (!data.session) {
      setOrganizations([])
      setActiveOrganizationState(null)
      setActiveOrganizationId(null)
      setError(null)
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    try {
      const userOrganizations = await fetchUserOrganizations()
      setOrganizations(userOrganizations)

      if (userOrganizations.length === 0) {
        setActiveOrganizationState(null)
        setActiveOrganizationId(null)
        persistActiveOrganization(null)
        setError('No organization access is available for this account.')
        setLoading(false)
        return
      }

      const storedOrganizationId = readStoredActiveOrganizationId()
      const isStoredOrganizationValid =
        storedOrganizationId !== null &&
        userOrganizations.some((organization) => organization.id === storedOrganizationId)

      let nextOrganization: Organization | null = null

      if (userOrganizations.length === 1) {
        nextOrganization = userOrganizations[0]
      } else if (isStoredOrganizationValid) {
        nextOrganization =
          userOrganizations.find((organization) => organization.id === storedOrganizationId) ??
          userOrganizations[0]
      } else {
        nextOrganization = userOrganizations[0]
        if (storedOrganizationId && !isStoredOrganizationValid) {
          setError('Your saved organization no longer has valid access. A safe default has been selected.')
        }
      }

      setActiveOrganizationState(nextOrganization)
      setActiveOrganizationId(nextOrganization?.id ?? null)
      persistActiveOrganization(nextOrganization?.id ?? null)
    } catch (caught) {
      setOrganizations([])
      setActiveOrganizationState(null)
      setActiveOrganizationId(null)
      persistActiveOrganization(null)
      setError(caught instanceof Error ? caught.message : 'Unable to load organizations.')
    } finally {
      setLoading(false)
    }
  }, [persistActiveOrganization])

  const setActiveOrganization = useCallback(
    async (organizationId: string | null) => {
      if (!organizationId) {
        setActiveOrganizationState(null)
        setActiveOrganizationId(null)
        persistActiveOrganization(null)
        return
      }

      const selectedOrganization = organizations.find(
        (organization) => organization.id === organizationId,
      )

      if (!selectedOrganization) {
        setActiveOrganizationState(null)
        setActiveOrganizationId(null)
        persistActiveOrganization(null)
        setError('The selected organization is no longer available to this account.')
        return
      }

      setActiveOrganizationState(selectedOrganization)
      setActiveOrganizationId(selectedOrganization.id)
      persistActiveOrganization(selectedOrganization.id)
      setError(null)
    },
    [organizations, persistActiveOrganization],
  )

  useEffect(() => {
    let isMounted = true

    async function initialize() {
      const { data } = await supabase.auth.getSession()

      if (!isMounted) {
        return
      }

      if (!data.session) {
        setOrganizations([])
        setActiveOrganizationState(null)
        setActiveOrganizationId(null)
        setLoading(false)
        setError(null)
        return
      }

      await refreshOrganizations()
    }

    void initialize()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, newSession: Session | null) => {
      if (!newSession) {
        setOrganizations([])
        setActiveOrganizationState(null)
        setActiveOrganizationId(null)
        setLoading(false)
        setError(null)
        persistActiveOrganization(null)
        return
      }

      void refreshOrganizations()
    })

    return () => {
      isMounted = false
      subscription.unsubscribe()
    }
  }, [persistActiveOrganization, refreshOrganizations])

  const value = useMemo<OrganizationContextValue>(
    () => ({
      organizations,
      activeOrganization,
      activeOrganizationId,
      loading,
      error,
      setActiveOrganization,
      refreshOrganizations,
    }),
    [activeOrganization, activeOrganizationId, error, loading, organizations, refreshOrganizations, setActiveOrganization],
  )

  return <OrganizationContext.Provider value={value}>{children}</OrganizationContext.Provider>
}

export function useOrganization() {
  const context = useContext(OrganizationContext)

  if (!context) {
    throw new Error('useOrganization must be used within an OrganizationProvider.')
  }

  return context
}
