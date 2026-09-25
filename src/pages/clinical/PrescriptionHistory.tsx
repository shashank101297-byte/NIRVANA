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
  instructions: string | null
}

type Encounter = {
  id: string
  encounter_date: string
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
            'prescription_id, line_no, therapy_system, medicine_name, formulation, dose, route, frequency, timing, duration_value, duration_unit, quantity, anupana, instructions',
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
    </>
  )
}
