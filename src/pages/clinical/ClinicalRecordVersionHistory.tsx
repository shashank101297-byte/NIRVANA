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

const labels: Record<string, string> = {
  chief_complaint: 'Chief complaint',
  history_of_present_illness: 'History of present illness',
  past_history: 'Past history',
  personal_history: 'Personal history',
  family_history: 'Family history',
  drug_allergy_history: 'Drug / allergy history',
  examination: 'Examination',
  assessment: 'Assessment',
  diagnosis: 'Diagnosis',
  differential_diagnosis: 'Differential diagnosis',
  investigations: 'Investigations',
  treatment_plan: 'Treatment plan',
  follow_up_advice: 'Follow-up advice',
  prakriti: 'Prakriti',
  vikriti: 'Vikriti',
  dosha: 'Dosha',
  dushya: 'Dushya',
  srotas: 'Srotas',
  agni: 'Agni',
  koshtha: 'Koshtha',
  ama: 'Ama',
  nidana: 'Nidana',
  samprapti: 'Samprapti',
  ayurvedic_diagnosis: 'Ayurvedic diagnosis',
  ayurvedic_structured_assessment:
    'Ayurvedic structured assessment',
  modern_structured_diagnoses:
    'Modern structured diagnoses',
  modern_structured_differential_diagnoses:
    'Modern structured differential diagnoses',
  structured_investigations:
    'Structured investigations',
}

const hidden = new Set([
  'id',
  'organization_id',
  'patient_id',
  'created_by',
  'created_at',
  'updated_at',
])

function formatDate(value: string) {
  return new Date(value).toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function value(value: unknown) {
  if (
    value === null ||
    value === undefined ||
    value === ''
  ) {
    return 'Not recorded'
  }

  if (Array.isArray(value)) {
    return value.length
      ? value.join(', ')
      : 'None'
  }

  if (typeof value === 'object') {
    return JSON.stringify(value, null, 2)
  }

  return String(value)
}

function Snapshot({
  snapshot,
}: {
  snapshot: Record<string, unknown>
}) {
  return (
    <div>
      {Object.entries(snapshot)
        .filter(([key]) => !hidden.has(key))
        .map(([key, item]) => (
          <div
            key={key}
            style={{
              padding: '12px 0',
              borderBottom:
                '1px solid rgba(0,0,0,0.07)',
            }}
          >
            <div
              style={{
                fontSize: '13px',
                fontWeight: 600,
                marginBottom: '5px',
              }}
            >
              {labels[key] ?? key.replaceAll('_', ' ')}
            </div>

            <pre
              style={{
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
                margin: 0,
                font: 'inherit',
              }}
            >
              {value(item)}
            </pre>
          </div>
        ))}
    </div>
  )
}

export default function ClinicalRecordVersionHistory({
  encounterId,
  organizationId,
}: Props) {
  const [versions, setVersions] = useState<Version[]>([])
  const [open, setOpen] = useState(false)
  const [selected, setSelected] =
    useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('clinical_record_versions')
        .select(
          'id, operation, actor_user_id, snapshot, created_at',
        )
        .eq(
          'entity_type',
          'clinical_encounter',
        )
        .eq('record_id', encounterId)
        .eq(
          'organization_id',
          organizationId,
        )
        .order('created_at', {
          ascending: false,
        })

      setVersions((data ?? []) as Version[])
      setLoading(false)
    }

    void load()
  }, [encounterId, organizationId])

  if (loading) {
    return null
  }

  return (
    <>
      <button
        type="button"
        className="history-action-bar"
        onClick={() => setOpen(true)}
      >
        <span className="history-action-title">
          🕘 Record History
        </span>

        <span className="history-action-count">
          {versions.length}
        </span>

        <span className="history-action-arrow">
          ›
        </span>
      </button>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Record History"
          className="history-modal-backdrop"
          onClick={() => setOpen(false)}
        >
          <div
            className="history-modal"
            onClick={(event) =>
              event.stopPropagation()
            }
          >
            <div className="history-modal-header">
              <div>
                <p className="eyebrow">
                  RECORD HISTORY
                </p>

                <h2>Clinical Record History</h2>

                <p>
                  {versions.length}{' '}
                  {versions.length === 1
                    ? 'version'
                    : 'versions'}
                </p>
              </div>

              <button
                type="button"
                className="secondary-button"
                onClick={() =>
                  setOpen(false)
                }
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            {versions.map(
              (version) => {
                const isOpen =
                  selected === version.id

                const title =
                  version.operation ===
                    'BASELINE' ||
                  version.operation ===
                    'INSERT'
                    ? 'Record created'
                    : version.operation ===
                      'DELETE'
                      ? 'Record deleted'
                      : 'Record updated'

                return (
                  <div
                    key={version.id}
                    className="history-entry"
                  >
                    <button
                      type="button"
                      className="history-entry-button"
                      onClick={() =>
                        setSelected(
                          isOpen
                            ? null
                            : version.id,
                        )
                      }
                    >
                      <span>
                        <strong>
                          {title}
                        </strong>

                        <small>
                          {formatDate(
                            version.created_at,
                          )}{' '}
                          · Clinician
                        </small>
                      </span>

                      <span>
                        {isOpen ? '⌃' : '⌄'}
                      </span>
                    </button>

                    {isOpen && (
                      <div className="history-entry-content">
                        <p className="eyebrow">
                          PREVIOUS RECORD STATE
                        </p>

                        <Snapshot
                          snapshot={
                            version.snapshot
                          }
                        />
                      </div>
                    )}
                  </div>
                )
              },
            )}
          </div>
        </div>
      )}
    </>
  )
}
