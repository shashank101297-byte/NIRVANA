import { useEffect, useState } from 'react'
import { NavLink, useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../../lib/supabase'

type Patient = {
  id: string
  patient_code: string
  full_name: string
  age_years: number
  sex: string
  mobile: string
  address: string
  city: string
  district: string
  state: string
  pincode: string
  status: string
  created_at: string
}

type PrescriptionSummary = {
  id: string
  encounter_id: string
  status: string
  change_reason: string | null
  supersedes_prescription_id: string | null
}

type StructuredInvestigation = {
  code?: unknown
  display_name?: unknown
}

type ClinicalEncounterSummary = {
  id: string
  encounter_date: string
  encounter_type: string
  status: string
  chief_complaint: string | null
  diagnosis: string | null
  ayurvedic_diagnosis: string | null
  treatment_plan: string | null
  investigations: string | null
  follow_up_advice: string | null
  modern_structured_diagnoses: string[]
  diagnosis_coding_metadata: {
    concepts?: Array<{
      code?: unknown
      display_name?: unknown
    }>
  }
  structured_investigations: Array<string | StructuredInvestigation>
  created_at: string
}

function formatEncounterDate(value: string) {
  const dateOnly = /^(\d{4}-\d{2}-\d{2})$/.exec(value)

  if (dateOnly) {
    const [year, month, day] = dateOnly[1].split('-')
    return `${day}/${month}/${year}`
  }

  const midnightUtc = /^(\d{4}-\d{2}-\d{2})T00:00:00(?:\.\d+)?(?:Z|\+00:00)$/.exec(value)

  if (midnightUtc) {
    const [year, month, day] = midnightUtc[1].split('-')
    return `${day}/${month}/${year}`
  }

  return new Date(value).toLocaleString('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function getDiagnosisSummary(encounter: ClinicalEncounterSummary) {
  const modernConcepts =
    encounter.diagnosis_coding_metadata?.concepts
      ?.map((concept) => String(concept.display_name ?? '').trim())
      .filter(Boolean) ?? []

  const modern =
    modernConcepts.length > 0
      ? modernConcepts.join(', ')
      : (encounter.diagnosis ?? '').trim()

  const ayurvedic = (encounter.ayurvedic_diagnosis ?? '').trim()

  if (modern && ayurvedic) return `${modern} • ${ayurvedic}`
  return modern || ayurvedic || 'Diagnosis not recorded.'
}

export default function PatientDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const [patient, setPatient] = useState<Patient | null>(null)
  const [encounters, setEncounters] = useState<ClinicalEncounterSummary[]>([])
  const [prescriptions, setPrescriptions] = useState<PrescriptionSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingEncounters, setLoadingEncounters] = useState(true)
  const [error, setError] = useState('')
  const [encounterError, setEncounterError] = useState('')
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    async function loadPatient() {
      if (!id) {
        setError('Patient ID is missing.')
        setLoading(false)
        return
      }

      setLoading(true)
      setError('')

      const { data, error } = await supabase
        .from('patients')
        .select(
          'id, patient_code, full_name, age_years, sex, mobile, address, city, district, state, pincode, status, created_at'
        )
        .eq('id', id)
        .single()

      if (error) {
        setError(error.message)
        setPatient(null)
      } else {
        setPatient(data)
      }

      setLoading(false)
    }

    loadPatient()
  }, [id])

  useEffect(() => {
    async function loadEncounters() {
      if (!id) {
        setEncounters([])
        setLoadingEncounters(false)
        return
      }

      setLoadingEncounters(true)
      setEncounterError('')

      const [encountersResult, prescriptionsResult] = await Promise.all([
        supabase
          .from('clinical_encounters')
          .select(
            'id, encounter_date, encounter_type, status, chief_complaint, diagnosis, ayurvedic_diagnosis, treatment_plan, investigations, follow_up_advice, modern_structured_diagnoses, diagnosis_coding_metadata, structured_investigations, created_at'
          )
          .eq('patient_id', id)
          .order('encounter_date', { ascending: false }),

        supabase
          .from('prescriptions')
          .select(
            'id, encounter_id, status, change_reason, supersedes_prescription_id'
          )
          .eq('patient_id', id)
          .order('created_at', { ascending: false }),
      ])

      const firstError =
        encountersResult.error ?? prescriptionsResult.error

      if (firstError) {
        setEncounterError(firstError.message)
        setEncounters([])
        setPrescriptions([])
      } else {
        setEncounters(
          (encountersResult.data ?? []) as ClinicalEncounterSummary[],
        )
        setPrescriptions(
          (prescriptionsResult.data ?? []) as PrescriptionSummary[],
        )
      }

      setLoadingEncounters(false)
    }

    loadEncounters()
  }, [id])

  async function restorePatient() {
    if (!patient) return

    const confirmed = window.confirm(
      `Restore patient ${patient.patient_code}? This patient will appear as active again.`
    )

    if (!confirmed) return

    setDeleting(true)

    const { error } = await supabase
      .from('patients')
      .update({ status: 'active' })
      .eq('id', patient.id)

    if (error) {
      setError(error.message)
      setDeleting(false)
      return
    }

    setPatient({ ...patient, status: 'active' })
    setDeleting(false)
  }

  async function archivePatient() {
    if (!patient) return

    const confirmed = window.confirm(
      `Archive patient ${patient.patient_code}? This patient will no longer appear as active.`
    )

    if (!confirmed) return

    setDeleting(true)
    setError('')

    const { error } = await supabase
      .from('patients')
      .update({ status: 'inactive' })
      .eq('id', patient.id)

    if (error) {
      setError(error.message)
      setDeleting(false)
      return
    }

    navigate('/patients')
  }

  function getPrescriptionSummary(encounterId: string) {
    const encounterPrescriptions = prescriptions.filter(
      (prescription) => prescription.encounter_id === encounterId,
    )

    if (!encounterPrescriptions.length) {
      return null
    }

    const active = encounterPrescriptions.filter(
      (prescription) => prescription.status === 'Active',
    ).length

    const modified = encounterPrescriptions.some(
      (prescription) =>
        Boolean(prescription.supersedes_prescription_id) ||
        Boolean(prescription.change_reason),
    )

    return {
      count: encounterPrescriptions.length,
      active,
      modified,
    }
  }

  if (loading) {
    return (
      <div className="page">
        <p>Loading patient record...</p>
      </div>
    )
  }

  if (error || !patient) {
    return (
      <div className="page">
        <p className="eyebrow">PATIENT MANAGEMENT</p>
        <h1>Patient record</h1>

        <div className="nirvana-error" role="alert">
          {error || 'Patient record not found.'}
        </div>

        <NavLink to="/patients">← Back to Patients</NavLink>
      </div>
    )
  }

  return (
    <div className="page">
      <div className="patient-detail-actions">
        <NavLink to="/patients">← Back to Patients</NavLink>
        {patient.status === 'active' ? (
          <>
            <NavLink
              to={`/patients/${patient.id}/edit`}
              className="edit-patient-button"
            >
              Edit Patient
            </NavLink>

            <NavLink
              to={`/clinical/${patient.id}`}
              className="secondary-button"
            >
              Clinical Workspace
            </NavLink>

            <button
              type="button"
              className="archive-patient-button"
              onClick={archivePatient}
              disabled={deleting}
            >
              {deleting ? 'Archiving...' : 'Archive Patient'}
            </button>
          </>
        ) : (
          <button
            type="button"
            className="restore-patient-button"
            onClick={restorePatient}
            disabled={deleting}
          >
            {deleting ? 'Restoring...' : 'Restore Patient'}
          </button>
        )}
</div>

      <div className="module-header">
        <div>
          <p className="eyebrow">PATIENT MANAGEMENT</p>
          <h1>{patient.full_name}</h1>
          <p>{patient.patient_code}</p>
        </div>
      </div>

      <details className="patient-info-collapsible">
        <summary>
          <span>Patient Information</span>
          <span className="patient-info-toggle">View details</span>
        </summary>

        <div className="patient-detail-grid">
          <div>
            <span>Patient ID</span>
            <strong>{patient.patient_code}</strong>
          </div>

          <div>
            <span>Full name</span>
            <strong>{patient.full_name}</strong>
          </div>

          <div>
            <span>Age</span>
            <strong>{patient.age_years}</strong>
          </div>

          <div>
            <span>Sex</span>
            <strong>{patient.sex}</strong>
          </div>

          <div>
            <span>Mobile</span>
            <strong>{patient.mobile}</strong>
          </div>

          <div>
            <span>Status</span>
            <strong>{patient.status}</strong>
          </div>

          <div>
            <span>Address</span>
            <strong>{patient.address || '—'}</strong>
          </div>

          <div>
            <span>City</span>
            <strong>{patient.city || '—'}</strong>
          </div>

          <div>
            <span>District</span>
            <strong>{patient.district || '—'}</strong>
          </div>

          <div>
            <span>State</span>
            <strong>{patient.state || '—'}</strong>
          </div>

          <div>
            <span>Pincode</span>
            <strong>{patient.pincode || '—'}</strong>
          </div>

          <div>
            <span>Registered</span>
            <strong>
              {new Date(patient.created_at).toLocaleDateString()}
            </strong>
          </div>
        </div>
      </details>

      <section className="clinical-panel">
        <div className="clinical-section-header nirvana-history-header-compact">
          <div>
            <h2>Clinical History</h2>
            <span className="nirvana-history-count">
              {encounters.length}{' '}
              {encounters.length === 1 ? 'encounter' : 'encounters'}
            </span>
          </div>
        </div>

        {loadingEncounters ? (
          <div className="account-card">
            <p>Loading clinical history...</p>
          </div>
        ) : encounterError ? (
          <div className="nirvana-error" role="alert">
            {encounterError}
          </div>
        ) : encounters.length === 0 ? (
          <div className="account-card">
            <p className="eyebrow">CLINICAL HISTORY</p>
            <h3>No clinical encounters recorded</h3>
            <p>
              Clinical encounters saved for this patient will appear here
              automatically.
            </p>
          </div>
        ) : (
          <div className="encounter-history-list">
            {encounters.map((encounter, index) => {
              const prescriptionSummary =
                getPrescriptionSummary(encounter.id)

              const structuredInvestigations =
                encounter.structured_investigations ?? []

              const investigationNames = structuredInvestigations
                .map((item) => {
                  if (typeof item === 'string') {
                    return item
                  }

                  return String(
                    item.display_name ?? item.code ?? '',
                  ).trim()
                })
                .filter(Boolean)

              const investigationSummary =
                investigationNames.length > 0
                  ? investigationNames.slice(0, 3).join(', ')
                  : encounter.investigations?.trim() ?? ''

              return (
                <NavLink
                  key={encounter.id}
                  to={`/clinical/${patient.id}/encounter/${encounter.id}`}
                  className="encounter-history-item nirvana-patient-encounter"
                >
                  <span className="encounter-history-number">
                    {index + 1}
                  </span>

                  <div className="nirvana-patient-encounter-main">
                    <div className="nirvana-patient-encounter-top">
                      <strong className="encounter-history-date">
                        {formatEncounterDate(encounter.encounter_date)}
                      </strong>

                      <span className="nirvana-patient-encounter-status">
                        {encounter.encounter_type || 'Clinical encounter'}
                        {' · '}
                        {encounter.status || 'Open'}
                      </span>
                    </div>

                    {encounter.chief_complaint?.trim() && (
                      <div className="nirvana-patient-encounter-field">
                        <span>Chief complaint</span>
                        <strong>
                          {encounter.chief_complaint.trim()}
                        </strong>
                      </div>
                    )}

                    <div className="nirvana-patient-encounter-diagnosis">
                      {getDiagnosisSummary(encounter)}
                    </div>

                    <div className="nirvana-patient-encounter-meta">
                      {investigationSummary && (
                        <span>
                          Investigations · {investigationSummary}
                        </span>
                      )}

                      {prescriptionSummary && (
                        <span>
                          Rx {prescriptionSummary.count}
                          {prescriptionSummary.active > 0
                            ? ` · ${prescriptionSummary.active} active`
                            : ''}
                        </span>
                      )}

                      {prescriptionSummary?.modified && (
                        <span className="nirvana-patient-encounter-change">
                          ↻ Treatment modified
                        </span>
                      )}

                      {encounter.treatment_plan?.trim() && (
                        <span>
                          Treatment · {encounter.treatment_plan.trim()}
                        </span>
                      )}

                      {encounter.follow_up_advice?.trim() && (
                        <span>
                          Follow-up · {encounter.follow_up_advice.trim()}
                        </span>
                      )}
                    </div>
                  </div>

                  <span
                    className="nirvana-patient-encounter-arrow"
                    aria-hidden="true"
                  >
                    →
                  </span>
                </NavLink>
              )
            })}
          </div>
        )}
      </section>
    </div>
  )
}
