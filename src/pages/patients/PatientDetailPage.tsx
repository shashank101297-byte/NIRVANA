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

type ClinicalEncounterSummary = {
  id: string
  encounter_date: string
  encounter_type: string
  status: string
  diagnosis: string | null
  ayurvedic_diagnosis: string | null
  treatment_plan: string | null
  modern_structured_diagnoses: string[]
  diagnosis_coding_metadata: {
    concepts?: Array<{
      code?: unknown
      display_name?: unknown
    }>
  }
  created_at: string
}

function formatEncounterDate(value: string) {
  // Do not invent a time when the database contains only a calendar date.
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [year, month, day] = value.split('-')
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

      const { data, error } = await supabase
        .from('clinical_encounters')
        .select(
          'id, encounter_date, encounter_type, status, diagnosis, ayurvedic_diagnosis, treatment_plan, modern_structured_diagnoses, diagnosis_coding_metadata, created_at'
        )
        .eq('patient_id', id)
        .order('encounter_date', { ascending: false })

      if (error) {
        setEncounterError(error.message)
        setEncounters([])
      } else {
        setEncounters((data ?? []) as ClinicalEncounterSummary[])
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

      <section className="account-card">
        <h2>Patient Information</h2>

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
      </section>

      <section className="clinical-panel">
        <div className="clinical-section-header">
          <div>
            <p className="eyebrow">LONGITUDINAL RECORD</p>
            <h2>Clinical History</h2>
          </div>

          <span className="development-note">
            {encounters.length}{' '}
            {encounters.length === 1 ? 'encounter' : 'encounters'}
          </span>
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
            {encounters.map((encounter, index) => (
              <NavLink
                key={encounter.id}
                to={`/clinical/${patient.id}/encounter/${encounter.id}`}
                className="encounter-history-item"
              >
                <span className="encounter-history-number">
                  {index + 1}
                </span>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <strong className="encounter-history-date">
                    {formatEncounterDate(encounter.encounter_date)}
                  </strong>

                  <div
                    style={{
                      marginTop: 4,
                      color: 'var(--text-h)',
                    }}
                  >
                    <strong>
                      {encounter.encounter_type || 'Clinical encounter'}
                    </strong>
                    {' · '}
                    {encounter.status || 'Open'}
                  </div>

                  <div style={{ marginTop: 4, fontSize: 14 }}>
                    <strong>Diagnosis:</strong>{' '}
                    {getDiagnosisSummary(encounter)}
                  </div>

                  {encounter.treatment_plan?.trim() && (
                    <div style={{ marginTop: 4, fontSize: 14 }}>
                      <strong>Treatment:</strong>{' '}
                      {encounter.treatment_plan.trim()}
                    </div>
                  )}
                </div>

                <span aria-hidden="true">→</span>
              </NavLink>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
