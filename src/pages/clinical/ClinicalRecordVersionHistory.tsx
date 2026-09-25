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

function Snapshot({
  snapshot,
}: {
  snapshot: Record<string, unknown>
}) {
  const technicalFields = new Set([
    'diagnosis_coding_metadata',
    'differential_diagnosis_coding_metadata',
  ])

  const structuredLabels: Record<string, string> = {
    prakriti: 'Prakriti',
    vikriti: 'Vikriti',
    dosha: 'Dosha',
    dushya: 'Dushya',
    srotas: 'Srotas',
    agni: 'Agni',
    koshtha: 'Koshtha',
  }

  const formatValue = (item: unknown) => {
    if (
      item === null ||
      item === undefined ||
      item === ''
    ) {
      return ''
    }

    if (Array.isArray(item)) {
      return item
        .map((entry) => String(entry))
        .join(', ')
    }

    if (typeof item === 'object') {
      return JSON.stringify(item, null, 2)
    }

    return String(item)
  }

  const visibleEntries = Object.entries(snapshot)
    .filter(([key, item]) => {
      const internalOrDuplicateFields = new Set([
        'appointment_id',
        'encounter_date',
        'encounter_type',
        'prakriti',
        'vikriti',
        'dosha',
        'dushya',
        'srotas',
        'agni',
        'koshtha',
        'ama',
        'nidana',
        'samprapti',
        'ayurvedic_diagnosis',
        'structured_investigations',
        'ayurvedic_structured_assessment',
        'diagnosis_coding_metadata',
        'status',
        'differential_diagnosis_coding_metadata',
      ])

      if (internalOrDuplicateFields.has(key)) {
        return false
      }
      if (hidden.has(key)) return false
      if (technicalFields.has(key)) return false
      if (
        key === 'ayurvedic_structured_assessment'
      ) {
        return false
      }
      if (
        item === null ||
        item === undefined ||
        item === ''
      ) {
        return false
      }
      if (
        Array.isArray(item) &&
        item.length === 0
      ) {
        return false
      }

      return true
    })

  const structured =
    snapshot.ayurvedic_structured_assessment

  const structuredObject =
    typeof structured === 'object' &&
    structured !== null &&
    !Array.isArray(structured)
      ? (structured as Record<string, unknown>)
      : {}

  const structuredEntries =
    Object.entries(structuredObject).filter(
      ([key, item]) => {
        if (!structuredLabels[key]) {
          return false
        }

        if (
          item === null ||
          item === undefined ||
          item === ''
        ) {
          return false
        }

        if (
          Array.isArray(item) &&
          item.length === 0
        ) {
          return false
        }

        return true
      },
    )

  const renderEntry = (
    key: string,
    item: unknown,
    label: string,
  ) => (
    <div
      key={key}
      style={{
        padding: '10px 12px',
        border: '1px solid rgba(0,0,0,0.07)',
        borderRadius: '10px',
        background: 'rgba(0,0,0,0.015)',
      }}
    >
      <div
        style={{
          fontSize: '12px',
          fontWeight: 600,
          marginBottom: '4px',
          opacity: 0.72,
        }}
      >
        {label}
      </div>

      <div
        style={{
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
        }}
      >
        {formatValue(item)}
      </div>
    </div>
  )

  return (
    <div>
      {visibleEntries.length > 0 && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns:
              'repeat(2, minmax(0, 1fr))',
            gap: '8px',
          }}
        >
          {visibleEntries.map(
            ([key, item]) =>
              renderEntry(
                key,
                item,
                labels[key] ??
                  key.replaceAll('_', ' '),
              ),
          )}
        </div>
      )}

      {structuredEntries.length > 0 && (
        <div
          style={{
            marginTop: '18px',
          }}
        >
          <p
            className="eyebrow"
            style={{
              marginBottom: '8px',
            }}
          >
            STRUCTURED AYURVEDIC ASSESSMENT
          </p>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns:
                'repeat(2, minmax(0, 1fr))',
              gap: '8px',
            }}
          >
            {structuredEntries.map(
              ([key, item]) =>
                renderEntry(
                  key,
                  item,
                  structuredLabels[key],
                ),
            )}
          </div>
        </div>
      )}
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
                          RECORDED STATE
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
