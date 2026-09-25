import { useEffect, useState } from 'react'
import { NavLink, useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useOrganization } from '../../context/OrganizationContext'

type ClinicalEncounter = {
  id: string
  organization_id: string
  patient_id: string
  created_by: string
  encounter_date: string
  encounter_type: string
  status: string
  chief_complaint: string | null
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
  updated_at: string
}

type Patient = {
  id: string
  patient_code: string
  full_name: string
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

function getDiagnosisSummary(encounter: ClinicalEncounter) {
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

export default function ClinicalEncountersPage() {
  const { patientId } = useParams<{ patientId: string }>()
  const navigate = useNavigate()

  const {
    activeOrganizationId,
    loading: organizationLoading,
  } = useOrganization()

  const [patient, setPatient] = useState<Patient | null>(null)
  const [encounters, setEncounters] = useState<ClinicalEncounter[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    async function loadData() {
      if (!activeOrganizationId || !patientId) {
        return
      }

      setLoading(true)
      setError('')

      const [
        { data: patientData, error: patientError },
        { data: encounterData, error: encounterError },
      ] = await Promise.all([
        supabase
          .from('patients')
          .select('id, patient_code, full_name')
          .eq('id', patientId)
          .eq('organization_id', activeOrganizationId)
          .single(),

        supabase
          .from('clinical_encounters')
          .select(
            'id, organization_id, patient_id, created_by, encounter_date, encounter_type, status, chief_complaint, diagnosis, ayurvedic_diagnosis, treatment_plan, modern_structured_diagnoses, diagnosis_coding_metadata, created_at, updated_at'
          )
          .eq('patient_id', patientId)
          .eq('organization_id', activeOrganizationId)
          .order('encounter_date', { ascending: false })
          .order('created_at', { ascending: false }),
      ])

      if (patientError) {
        setPatient(null)
        setError(patientError.message)
      } else {
        setPatient(patientData as Patient)
      }

      if (encounterError) {
        setEncounters([])
        setError(encounterError.message)
      } else {
        setEncounters((encounterData ?? []) as ClinicalEncounter[])
      }

      setLoading(false)
    }

    void loadData()
  }, [activeOrganizationId, patientId])

  if (organizationLoading) {
    return (
      <div className="page">
        <p className="eyebrow">CLINICAL ENCOUNTERS</p>
        <h1>Loading organization context...</h1>
      </div>
    )
  }

  if (!activeOrganizationId) {
    return (
      <div className="page">
        <div className="account-card">
          <p className="eyebrow">CLINICAL ENCOUNTERS</p>
          <h1>No active organization</h1>
          <p>An active organization is required.</p>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="page">
        <p className="eyebrow">CLINICAL ENCOUNTERS</p>
        <h1>Loading encounters...</h1>
      </div>
    )
  }

  if (!patient) {
    return (
      <div className="page">
        <div className="account-card">
          <p className="eyebrow">CLINICAL ENCOUNTERS</p>
          <h1>Patient unavailable</h1>
          <p>
            {error || 'This patient is not available in the active organization.'}
          </p>
          <button
            type="button"
            className="secondary-button"
            onClick={() => navigate('/clinical')}
          >
            Back to Clinical Workspace
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="page clinical-workspace-page">
      {error && (
        <div className="nirvana-error" role="alert">
          {error}
        </div>
      )}

      <section className="nirvana-encounters-header">
        <div className="nirvana-encounters-header-top">
          <NavLink
            to={`/clinical/${patient.id}`}
            className="secondary-button"
          >
            ← Back to Patient
          </NavLink>

          <NavLink
            to={`/clinical/${patient.id}?newVisit=true`}
            className="primary-button"
          >
            + New Visit
          </NavLink>
        </div>

        <div className="nirvana-encounters-patient">
          <p className="eyebrow">PATIENT</p>
          <div className="nirvana-encounters-patient-identity">
            <h1>{patient.full_name}</h1>
            <span>· {patient.patient_code}</span>
          </div>
        </div>
      </section>

      <section className="clinical-panel nirvana-encounters-history-panel">
        <div className="nirvana-encounters-history-header">
          <div>
            <p className="eyebrow">LONGITUDINAL RECORD</p>
            <h2>Encounter History</h2>
          </div>

          <span className="development-note">
            {encounters.length}{' '}
            {encounters.length === 1 ? 'encounter' : 'encounters'}
          </span>
        </div>

      {encounters.length === 0 ? (
        <div className="empty-patients">
          <div className="empty-icon">📋</div>
          <h3>No clinical encounters yet</h3>
          <p>Create the first clinical encounter for this patient.</p>

          <NavLink
            to={`/clinical/${patient.id}?newVisit=true`}
            className="primary-button"
          >
            + Create First Visit
          </NavLink>
        </div>
      ) : (
        <div className="nirvana-encounter-timeline">
          {encounters.map((encounter, index) => (
            <NavLink
              key={encounter.id}
              to={`/clinical/${patient.id}/encounter/${encounter.id}`}
              className="nirvana-encounter-card"
            >
              <div className="nirvana-encounter-card-index">
                {index + 1}
              </div>

              <div className="nirvana-encounter-card-main">
                <div className="nirvana-encounter-card-top">
                  <strong className="nirvana-encounter-card-date">
                    {formatEncounterDate(encounter.encounter_date)}
                  </strong>

                  <span className="nirvana-encounter-card-status">
                    {encounter.encounter_type || 'Clinical encounter'}
                    {' · '}
                    {encounter.status || 'Open'}
                  </span>
                </div>

                {encounter.chief_complaint?.trim() && (
                  <div className="nirvana-encounter-card-field">
                    <span>Chief complaint</span>
                    <strong>{encounter.chief_complaint.trim()}</strong>
                  </div>
                )}

                <div className="nirvana-encounter-card-field">
                  <span>Diagnosis</span>
                  <strong>{getDiagnosisSummary(encounter)}</strong>
                </div>

                {encounter.treatment_plan?.trim() && (
                  <div className="nirvana-encounter-card-field">
                    <span>Treatment</span>
                    <strong>{encounter.treatment_plan.trim()}</strong>
                  </div>
                )}
              </div>

              <span
                className="nirvana-encounter-card-arrow"
                aria-hidden="true"
              >
                →
              </span>
            </NavLink>
          ))}
        </div>
      )}
    </section>
    </div>
  )
}
