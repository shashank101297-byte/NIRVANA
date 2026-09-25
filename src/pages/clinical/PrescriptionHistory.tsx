import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'

type Prescription = {
  id: string
  encounter_id: string
  status: string
  notes: string | null
  change_reason: string | null
  supersedes_prescription_id: string | null
  created_at: string
}

type Item = {
  prescription_id: string
  line_no: number
  therapy_system: string
  medicine_name: string
  formulation: string
  dose: string
  route: string
  frequency: string
  timing: string
  duration_value: number | null
  duration_unit: string | null
  quantity: string | null
  anupana: string | null
  strength: string | null
  instructions: string | null
}

type Encounter = {
  id: string
  encounter_date: string
}

type Version = {
  id: string
  operation: 'INSERT' | 'UPDATE' | 'DELETE' | 'BASELINE'
  snapshot: Record<string, unknown>
  created_at: string
}

type VersionItem = {
  id: string
  operation: 'INSERT' | 'UPDATE' | 'DELETE' | 'BASELINE'
  snapshot: Record<string, unknown>
  created_at: string
}

type Props = {
  patientId: string
  organizationId: string
  currentPrescriptionId?: string | null
}

export default function PrescriptionHistory({
  patientId,
  organizationId,
  currentPrescriptionId,
}: Props) {
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([])
  const [items, setItems] = useState<Item[]>([])
  const [encounters, setEncounters] = useState<Encounter[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [open, setOpen] = useState(false)
  const [versionHistoryOpen, setVersionHistoryOpen] = useState(false)
  const [versionHistoryLoading, setVersionHistoryLoading] = useState(false)
  const [versionHistory, setVersionHistory] = useState<Version[]>([])
  const [versionItems, setVersionItems] = useState<VersionItem[]>([])

  async function loadVersionHistory(prescriptionId: string) {
    setVersionHistoryLoading(true)
    setError('')

    const [prescriptionVersionsResult, itemVersionsResult] =
      await Promise.all([
        supabase
          .from('clinical_record_versions')
          .select('id, operation, snapshot, created_at')
          .eq('entity_type', 'prescription')
          .eq('record_id', prescriptionId)
          .eq('organization_id', organizationId)
          .order('created_at', { ascending: false }),

        supabase
          .from('clinical_record_versions')
          .select('id, operation, snapshot, created_at')
          .eq('entity_type', 'prescription_item')
          .eq('organization_id', organizationId)
          .eq('patient_id', patientId)
          .order('created_at', { ascending: true }),
      ])

    if (prescriptionVersionsResult.error || itemVersionsResult.error) {
      setError(
        prescriptionVersionsResult.error?.message ??
          itemVersionsResult.error?.message ??
          'Unable to load prescription history.',
      )
      setVersionHistory([])
      setVersionItems([])
    } else {
      setVersionHistory(
        (prescriptionVersionsResult.data ?? []) as Version[],
      )

      const filteredItems = (
        (itemVersionsResult.data ?? []) as VersionItem[]
      ).filter(
        (version) =>
          version.snapshot.prescription_id === prescriptionId,
      )

      setVersionItems(filteredItems)
    }

    setVersionHistoryOpen(true)
    setVersionHistoryLoading(false)
  }

  function formatVersionDate(value: string) {
    return new Date(value).toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  function getVersionTitle(operation: Version['operation']) {
    if (operation === 'BASELINE' || operation === 'INSERT') {
      return 'Prescription recorded'
    }

    if (operation === 'DELETE') {
      return 'Prescription deleted'
    }

    return 'Prescription modified'
  }

  function snapshotText(
    snapshot: Record<string, unknown>,
    key: string,
  ) {
    const value = snapshot[key]

    if (value === null || value === undefined || value === '') {
      return ''
    }

    return String(value)
  }

  function getItemsNearVersion(
    createdAt: string,
    operation: 'old' | 'new',
  ) {
    const targetTime = new Date(createdAt).getTime()

    return versionItems.filter((version) => {
      const difference = Math.abs(
        new Date(version.created_at).getTime() - targetTime,
      )

      if (difference > 5000) {
        return false
      }

      return operation === 'old'
        ? version.operation === 'DELETE'
        : version.operation === 'INSERT'
    })
  }

  function renderVersionItem(version: VersionItem) {
    const snapshot = version.snapshot

    const fields: Array<[string, string]> = [
      ['Strength', 'strength'],
      ['Dose', 'dose'],
      ['Frequency', 'frequency'],
      ['Route', 'route'],
      ['Timing', 'timing'],
      ['Anupana', 'anupana'],
      ['Instructions', 'instructions'],
    ]

    const duration = [
      snapshotText(snapshot, 'duration_value'),
      snapshotText(snapshot, 'duration_unit'),
    ]
      .filter(Boolean)
      .join(' ')

    return (
      <div
        key={version.id}
        style={{
          padding: '10px 12px',
          border: '1px solid rgba(0,0,0,0.07)',
          borderRadius: '10px',
          background: 'rgba(0,0,0,0.015)',
        }}
      >
        <strong>
          {snapshotText(snapshot, 'medicine_name') || 'Medicine'}
        </strong>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
            gap: '6px 12px',
            marginTop: '8px',
            fontSize: '13px',
          }}
        >
          {fields.map(([label, key]) => {
            const value = snapshotText(snapshot, key)

            if (!value) {
              return null
            }

            return (
              <span key={key}>
                <b>{label}:</b> {value}
              </span>
            )
          })}

          {duration && (
            <span>
              <b>Duration:</b> {duration}
            </span>
          )}
        </div>
      </div>
    )
  }

  async function loadHistory() {
    setLoading(true)
    setError('')

    const { data: prescriptionData, error: prescriptionError } =
      await supabase
        .from('prescriptions')
        .select(
          'id, encounter_id, status, notes, change_reason, supersedes_prescription_id, created_at',
        )
        .eq('patient_id', patientId)
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false })

    if (prescriptionError) {
      setError(prescriptionError.message)
      setLoading(false)
      return
    }

    const prescriptionRows = (prescriptionData ?? []) as Prescription[]

    setPrescriptions(prescriptionRows)

    if (!prescriptionRows.length) {
      setItems([])
      setEncounters([])
      setLoading(false)
      return
    }

    const prescriptionIds = prescriptionRows.map(
      (item) => item.id,
    )

    const encounterIds = [
      ...new Set(
        prescriptionRows.map((item) => item.encounter_id),
      ),
    ]

    const [itemsResult, encountersResult] =
      await Promise.all([
        supabase
          .from('prescription_items')
          .select(
            'prescription_id, line_no, therapy_system, medicine_name, formulation, strength, dose, route, frequency, timing, duration_value, duration_unit, quantity, anupana, instructions',
          )
          .in('prescription_id', prescriptionIds)
          .order('line_no', { ascending: true }),

        supabase
          .from('clinical_encounters')
          .select('id, encounter_date')
          .in('id', encounterIds),
      ])

    if (itemsResult.error) {
      setError(itemsResult.error.message)
      setLoading(false)
      return
    }

    if (encountersResult.error) {
      setError(encountersResult.error.message)
      setLoading(false)
      return
    }

    setItems((itemsResult.data ?? []) as Item[])
    setEncounters(
      (encountersResult.data ?? []) as Encounter[],
    )
    setLoading(false)
  }

  useEffect(() => {
    void loadHistory()
  }, [patientId, organizationId, currentPrescriptionId])

  useEffect(() => {
    const handlePrescriptionUpdated = () => {
      void loadHistory()
    }

    window.addEventListener(
      'nirvana:prescription-updated',
      handlePrescriptionUpdated,
    )

    return () => {
      window.removeEventListener(
        'nirvana:prescription-updated',
        handlePrescriptionUpdated,
      )
    }
  }, [patientId, organizationId])

  function getEncounterDate(encounterId: string) {
    const encounter = encounters.find(
      (item) => item.id === encounterId,
    )

    if (!encounter?.encounter_date) {
      return 'Date not recorded'
    }

    const raw = encounter.encounter_date

    const parsed = raw.includes('T')
      ? new Date(raw)
      : new Date(`${raw}T00:00:00`)

    if (Number.isNaN(parsed.getTime())) {
      return 'Date not recorded'
    }

    return parsed.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    })
  }

  function getPrescriptionItems(prescriptionId: string) {
    return items.filter(
      (item) => item.prescription_id === prescriptionId,
    )
  }

  function getStatusClass(status: string) {
    if (status === 'Active') {
      return 'prescription-history-status active'
    }

    if (status === 'Superseded') {
      return 'prescription-history-status superseded'
    }

    return 'prescription-history-status cancelled'
  }

  function getPrimaryMedicine(prescriptionId: string) {
    const prescriptionItems =
      getPrescriptionItems(prescriptionId)

    if (!prescriptionItems.length) {
      return 'No medicines recorded'
    }

    if (prescriptionItems.length === 1) {
      return prescriptionItems[0].medicine_name
    }

    return `${prescriptionItems[0].medicine_name} + ${
      prescriptionItems.length - 1
    } more`
  }

  const selectedPrescription = prescriptions.find(
    (item) => item.id === selectedId,
  )

  const selectedItems = selectedPrescription
    ? getPrescriptionItems(selectedPrescription.id)
    : []

  if (loading) {
    return (
      <section className="clinical-panel prescription-history-panel">
        <div className="prescription-history-heading">
          <div>
            <p className="eyebrow">PRESCRIPTION HISTORY</p>
            <h2>Prescription History</h2>
          </div>
        </div>

        <p>Loading prescription history...</p>
      </section>
    )
  }

  return (
    <>
      <section className="clinical-panel prescription-history-panel">
        <div className="prescription-history-heading">
          <div>
            <p className="eyebrow">PRESCRIPTION HISTORY</p>
            <h2>Prescription History</h2>
            <p className="prescription-history-subtitle">
              Complete treatment history for this patient
            </p>
          </div>

          <div className="prescription-history-count">
            {prescriptions.length}
            <span>
              {prescriptions.length === 1
                ? 'Prescription'
                : 'Prescriptions'}
            </span>
          </div>
        </div>

        {error && (
          <div className="nirvana-error" role="alert">
            {error}
          </div>
        )}

        {!prescriptions.length ? (
          <div className="prescription-history-empty">
            <div className="prescription-history-empty-icon">
              💊
            </div>
            <h3>No prescription history</h3>
            <p>
              Prescriptions recorded for this patient will
              appear here.
            </p>
          </div>
        ) : (
          <button
            type="button"
            className="history-action-bar"
            style={{
              width: '100%',
              border: 'none',
              cursor: 'pointer',
              textAlign: 'left',
            }}
            onClick={() => setOpen(true)}
          >
            <div className="prescription-history-main">
              <div className="prescription-history-date-row">
                <span className="prescription-history-date">
                  {getEncounterDate(
                    prescriptions[0].encounter_id,
                  )}
                </span>

                <span
                  className={getStatusClass(
                    prescriptions[0].status,
                  )}
                >
                  {prescriptions[0].status}
                </span>

                {prescriptions[0].status === 'Active' && (
                  <span className="prescription-history-current">
                    Current
                  </span>
                )}
              </div>

              <h3>
                {prescriptions.length === 1
                  ? 'View Prescription History'
                  : `View ${prescriptions.length} Prescriptions`}
              </h3>

              <p className="prescription-history-medicine">
                {getPrimaryMedicine(prescriptions[0].id)}
              </p>

              <p className="prescription-history-summary">
                Tap to view complete treatment history
              </p>
            </div>

            <span className="history-action-count">{prescriptions.length}</span>
            <span className="history-action-arrow">›</span>
          </button>
        )}
      </section>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Prescription History"
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 1000,
            background: 'rgba(0,0,0,0.42)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
          }}
          onClick={() => setOpen(false)}
        >
          <div
            style={{
              width: 'min(760px, 100%)',
              maxHeight: '90vh',
              overflowY: 'auto',
              background: 'var(--surface, #ffffff)',
              borderRadius: '20px',
              padding: '20px',
              boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
            }}
            onClick={(event) => event.stopPropagation()}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                gap: '12px',
                marginBottom: '18px',
              }}
            >
              <div>
                <p className="eyebrow">
                  PRESCRIPTION HISTORY
                </p>

                <h2 style={{ marginBottom: '4px' }}>
                  Prescription History
                </h2>

                <p>
                  {prescriptions.length}{' '}
                  {prescriptions.length === 1
                    ? 'prescription'
                    : 'prescriptions'}
                </p>
              </div>

              <button
                type="button"
                className="secondary-button"
                onClick={() => setOpen(false)}
                aria-label="Close prescription history"
              >
                ✕
              </button>
            </div>

            {prescriptions.map((prescription, index) => {
              const prescriptionItems =
                getPrescriptionItems(prescription.id)

              const isSelected =
                selectedId === prescription.id

              const isCurrent =
                index === 0 &&
                prescription.status === 'Active'

              return (
                <div
                  key={prescription.id}
                  className="prescription-history-card"
                  style={{
                    marginBottom: '10px',
                    border: '1px solid rgba(0,0,0,0.08)',
                    borderRadius: '14px',
                    overflow: 'hidden',
                  }}
                >
                  <button
                    type="button"
                    className="history-action-bar"
                    style={{
                      width: '100%',
                      border: 'none',
                      cursor: 'pointer',
                      textAlign: 'left',
                    }}
                    onClick={() =>
                      setSelectedId(
                        isSelected ? null : prescription.id,
                      )
                    }
                  >
                    <div className="prescription-history-main">
                      <div className="prescription-history-date-row">
                        <span className="prescription-history-date">
                          {getEncounterDate(
                            prescription.encounter_id,
                          )}
                        </span>

                        <span
                          className={getStatusClass(
                            prescription.status,
                          )}
                        >
                          {prescription.status}
                        </span>

                        {isCurrent && (
                          <span className="prescription-history-current">
                            Current
                          </span>
                        )}
                      </div>

                      <h3>
                        Prescription #{prescriptions.length - index}
                      </h3>

                      <p className="prescription-history-medicine">
                        {getPrimaryMedicine(
                          prescription.id,
                        )}
                      </p>

                      {prescriptionItems[0] && (
                        <p className="prescription-history-summary">
                          {[
                            prescriptionItems[0].strength,
                            prescriptionItems[0].dose,
                            prescriptionItems[0].frequency,
                            prescriptionItems[0].route,
                            prescriptionItems[0]
                              .duration_value !== null &&
                            prescriptionItems[0]
                              .duration_unit
                              ? `${prescriptionItems[0].duration_value} ${prescriptionItems[0].duration_unit}`
                              : '',
                          ]
                            .filter(Boolean)
                            .join('  •  ')}
                        </p>
                      )}
                    </div>

                    <span className="prescription-history-chevron">
                      {isSelected ? '⌃' : '⌄'}
                    </span>
                  </button>

                  <div
                    style={{
                      padding: '0 14px 12px',
                    }}
                  >
                    <button
                      type="button"
                      className="secondary-button"
                      onClick={(event) => {
                        event.stopPropagation()
                        void loadVersionHistory(prescription.id)
                      }}
                    >
                      🕘 View Change History
                    </button>
                  </div>

                  {isSelected && (
                    <div className="prescription-history-details">
                      {prescription.supersedes_prescription_id && (
                        <div className="prescription-history-change">
                          <span>MODIFICATION</span>

                          <strong>
                            Treatment was modified
                          </strong>

                          {prescription.change_reason && (
                            <p>
                              {prescription.change_reason}
                            </p>
                          )}
                        </div>
                      )}

                      <div className="prescription-history-medicine-list">
                        {selectedItems.map((item) => (
                          <div
                            className="prescription-history-medicine-row"
                            key={`${prescription.id}-${item.line_no}`}
                          >
                            <div>
                              <strong>
                                {item.medicine_name}
                              </strong>

                              <span>
                                {[
                                  item.therapy_system,
                                  item.formulation,
                                ]
                                  .filter(Boolean)
                                  .join(' · ')}
                              </span>
                            </div>

                            <div className="prescription-history-dose">
                              {item.strength && (
                                <span>
                                  <b>Strength</b>
                                  {item.strength}
                                </span>
                              )}

                              {item.dose && (
                                <span>
                                  <b>Dose</b>
                                  {item.dose}
                                </span>
                              )}

                              {item.frequency && (
                                <span>
                                  <b>Frequency</b>
                                  {item.frequency}
                                </span>
                              )}

                              {item.route && (
                                <span>
                                  <b>Route</b>
                                  {item.route}
                                </span>
                              )}

                              {item.timing && (
                                <span>
                                  <b>Timing</b>
                                  {item.timing}
                                </span>
                              )}

                              {item.duration_value !== null &&
                                item.duration_unit && (
                                  <span>
                                    <b>Duration</b>
                                    {item.duration_value}{' '}
                                    {item.duration_unit}
                                  </span>
                                )}

                              {item.anupana && (
                                <span>
                                  <b>Anupana</b>
                                  {item.anupana}
                                </span>
                              )}
                            </div>

                            {item.quantity && (
                              <small>
                                Quantity: {item.quantity}
                              </small>
                            )}

                            {item.instructions && (
                              <p>{item.instructions}</p>
                            )}
                          </div>
                        ))}
                      </div>

                      {prescription.notes && (
                        <div className="prescription-history-notes">
                          <b>Notes</b>
                          <p>{prescription.notes}</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {versionHistoryOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Prescription Change History"
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 1100,
            background: 'rgba(0,0,0,0.46)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
          }}
          onClick={() => setVersionHistoryOpen(false)}
        >
          <div
            style={{
              width: 'min(760px, 100%)',
              maxHeight: '90vh',
              overflowY: 'auto',
              background: 'var(--surface, #ffffff)',
              borderRadius: '20px',
              padding: '20px',
              boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
            }}
            onClick={(event) => event.stopPropagation()}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                gap: '12px',
                marginBottom: '18px',
              }}
            >
              <div>
                <p className="eyebrow">PRESCRIPTION AUDIT TRAIL</p>
                <h2 style={{ marginBottom: '4px' }}>
                  Prescription Change History
                </h2>
                <p>
                  Immutable clinical versions for this prescription
                </p>
              </div>

              <button
                type="button"
                className="secondary-button"
                onClick={() => setVersionHistoryOpen(false)}
                aria-label="Close prescription change history"
              >
                ✕
              </button>
            </div>

            {versionHistoryLoading ? (
              <p>Loading prescription history...</p>
            ) : !versionHistory.length ? (
              <div className="prescription-history-empty">
                <h3>No recorded versions</h3>
                <p>
                  No immutable history is available for this prescription.
                </p>
              </div>
            ) : (
              versionHistory.map((version) => {
                const snapshot = version.snapshot
                const oldItems = getItemsNearVersion(
                  version.created_at,
                  'old',
                )
                const newItems = getItemsNearVersion(
                  version.created_at,
                  'new',
                )

                return (
                  <div
                    key={version.id}
                    style={{
                      marginBottom: '12px',
                      padding: '14px',
                      border: '1px solid rgba(0,0,0,0.08)',
                      borderRadius: '14px',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        gap: '12px',
                        alignItems: 'flex-start',
                      }}
                    >
                      <div>
                        <strong>
                          {getVersionTitle(version.operation)}
                        </strong>
                        <div
                          style={{
                            marginTop: '4px',
                            fontSize: '13px',
                            opacity: 0.7,
                          }}
                        >
                          {formatVersionDate(version.created_at)} · Clinician
                        </div>
                      </div>

                      <span
                        className={getStatusClass(
                          snapshotText(snapshot, 'status') || 'Active',
                        )}
                      >
                        {snapshotText(snapshot, 'status') ||
                          version.operation}
                      </span>
                    </div>

                    {snapshotText(snapshot, 'change_reason') && (
                      <div
                        style={{
                          marginTop: '12px',
                          padding: '10px 12px',
                          borderRadius: '10px',
                          background: 'rgba(0,0,0,0.035)',
                        }}
                      >
                        <b>Change reason</b>
                        <p style={{ margin: '4px 0 0' }}>
                          {snapshotText(snapshot, 'change_reason')}
                        </p>
                      </div>
                    )}

                    {version.operation === 'UPDATE' && (
                      <div style={{ marginTop: '14px' }}>
                        {oldItems.length > 0 && (
                          <div style={{ marginBottom: '12px' }}>
                            <p className="eyebrow">PREVIOUS MEDICATIONS</p>
                            <div
                              style={{
                                display: 'grid',
                                gap: '8px',
                              }}
                            >
                              {oldItems.map(renderVersionItem)}
                            </div>
                          </div>
                        )}

                        {newItems.length > 0 && (
                          <div>
                            <p className="eyebrow">UPDATED MEDICATIONS</p>
                            <div
                              style={{
                                display: 'grid',
                                gap: '8px',
                              }}
                            >
                              {newItems.map(renderVersionItem)}
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {(version.operation === 'INSERT' ||
                      version.operation === 'BASELINE') &&
                      newItems.length > 0 && (
                        <div style={{ marginTop: '14px' }}>
                          <p className="eyebrow">MEDICATIONS RECORDED</p>
                          <div
                            style={{
                              display: 'grid',
                              gap: '8px',
                            }}
                          >
                            {newItems.map(renderVersionItem)}
                          </div>
                        </div>
                      )}

                    {snapshotText(snapshot, 'notes') && (
                      <div style={{ marginTop: '12px' }}>
                        <b>Notes</b>
                        <p style={{ margin: '4px 0 0' }}>
                          {snapshotText(snapshot, 'notes')}
                        </p>
                      </div>
                    )}
                  </div>
                )
              })
            )}
          </div>
        </div>
      )}
    </>
  )
}
