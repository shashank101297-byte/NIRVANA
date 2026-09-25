import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'

type Version = {
  id: string
  operation: 'INSERT' | 'UPDATE' | 'DELETE' | 'BASELINE'
  actor_user_id: string | null
  snapshot: Record<string, unknown>
  created_at: string
}

type Props = {
  encounterId: string
  organizationId: string
}

function formatDate(value: string) {
  return new Date(value).toLocaleString('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

const hiddenFields = new Set([
  'id',
  'organization_id',
  'patient_id',
  'created_by',
  'created_at',
  'updated_at',
])

function displayValue(value: unknown) {
  if (value === null || value === undefined || value === '') {
    return 'Not recorded'
  }

  if (typeof value === 'object') {
    return JSON.stringify(value, null, 2)
  }

  return String(value)
}

export default function ClinicalRecordVersionHistory({
  encounterId,
  organizationId,
}: Props) {
  const [versions, setVersions] = useState<Version[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [expandedId, setExpandedId] = useState<string | null>(null)

  useEffect(() => {
    async function loadVersions() {
      setLoading(true)
      setError('')

      const { data, error: versionError } = await supabase
        .from('clinical_record_versions')
        .select(
          'id, operation, actor_user_id, snapshot, created_at',
        )
        .eq('entity_type', 'clinical_encounter')
        .eq('record_id', encounterId)
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false })

      if (versionError) {
        setError(versionError.message)
        setVersions([])
      } else {
        setVersions((data ?? []) as Version[])
      }

      setLoading(false)
    }

    void loadVersions()
  }, [encounterId, organizationId])

  if (loading) {
    return (
      <section className="clinical-panel">
        <p className="eyebrow">RECORD HISTORY</p>
        <h2>Version History</h2>
        <p>Loading clinical record history...</p>
      </section>
    )
  }

  return (
    <section className="clinical-panel">
      <div className="clinical-section-header">
        <div>
          <p className="eyebrow">RECORD HISTORY</p>
          <h2>Version History</h2>
          <p>
            Read-only history of this clinical encounter.
          </p>
        </div>

        <strong>{versions.length} versions</strong>
      </div>

      {error && (
        <div className="nirvana-error" role="alert">
          {error}
        </div>
      )}

      {!error && !versions.length && (
        <div className="account-card">
          <h3>No version history yet</h3>
          <p>
            No historical snapshots are available for this
            encounter.
          </p>
        </div>
      )}

      {!error &&
        versions.map((version) => {
          const isExpanded = expandedId === version.id

          return (
            <article
              className="account-card"
              key={version.id}
              style={{
                textAlign: 'left',
                marginBottom: '8px',
              }}
            >
              <button
                type="button"
                className="secondary-button"
                style={{
                  width: '100%',
                  justifyContent: 'space-between',
                  textAlign: 'left',
                }}
                onClick={() =>
                  setExpandedId(
                    isExpanded ? null : version.id,
                  )
                }
              >
                <span>
                  <strong>
                    {version.operation === 'BASELINE'
                      ? 'Baseline'
                      : version.operation}
                  </strong>
                  {' · '}
                  {formatDate(version.created_at)}
                  {' · '}
                  {version.actor_user_id
                    ? `User ${version.actor_user_id.slice(0, 8)}`
                    : 'System'}
                </span>

                <span aria-hidden="true">
                  {isExpanded ? '⌃' : '⌄'}
                </span>
              </button>

              {isExpanded && (
                <div
                  className="encounter-documentation-grid"
                  style={{ marginTop: '12px' }}
                >
                  {Object.entries(version.snapshot)
                    .filter(
                      ([key]) => !hiddenFields.has(key),
                    )
                    .map(([key, value]) => (
                      <div
                        className="account-card"
                        key={key}
                      >
                        <span>
                          {key.replaceAll('_', ' ')}
                        </span>

                        <pre
                          style={{
                            whiteSpace: 'pre-wrap',
                            wordBreak: 'break-word',
                            margin: '6px 0 0',
                            font: 'inherit',
                          }}
                        >
                          {displayValue(value)}
                        </pre>
                      </div>
                    ))}
                </div>
              )}
            </article>
          )
        })}
    </section>
  )
}
