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
  created_at: string
  updated_at: string
}

type Patient = {
  id: string
  patient_code: string
  full_name: string
}

export default function ClinicalEncountersPage() {
  const { patientId } = useParams<{ patientId: string }>()
  const navigate = useNavigate()

  const {
    activeOrganization,
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
            'id, organization_id, patient_id, created_by, encounter_date, encounter_type, status, chief_complaint, created_at, updated_at'
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
      <div className="clinical-header">
        <div>
          <p className="eyebrow">CLINICAL ENCOUNTERS</p>
          <h1>Clinical Encounters</h1>
        </div>

        <div className="clinical-org-badge">
          <span>Active organization</span>
          <strong>
            {activeOrganization?.name ?? 'Current organization'}
          </strong>
        </div>
      </div>

      {error && (
        <div className="nirvana-error" role="alert">
          {error}
        </div>
      )}

      <section className="clinical-panel clinical-patient-summary-card">
        <div className="clinical-section-header">
          <div>
            <p className="eyebrow">PATIENT</p>
            <h2>{patient.full_name}</h2>
          </div>

          <div className="clinical-actions">
            <NavLink
              to={`/clinical/${patient.id}`}
              className="secondary-button"
            >
              Back to Patient
            </NavLink>

            <NavLink
              to={`/clinical/${patient.id}?newVisit=true`}
              className="primary-button"
            >
              + New Visit
            </NavLink>
          </div>
        </div>

        <div className="clinical-patient-meta-row">
          <span>{patient.patient_code}</span>
          <span>{encounters.length} encounter{encounters.length === 1 ? '' : 's'}</span>
        </div>
      </section>

      <section className="clinical-panel">
      <div className="clinical-section-header">
        <div>
          <p className="eyebrow">VISITS</p>
          <h2>Encounter history</h2>
        </div>
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
        <div className="encounter-history-list">
          {encounters.map((encounter, index) => (
            <NavLink
              key={encounter.id}
              to={`/clinical/${patient.id}/encounter/${encounter.id}`}
              className="encounter-history-item"
            >
              <span className="encounter-history-number">
                {["①", "②", "③", "④", "⑤", "⑥", "⑦", "⑧", "⑨", "⑩"][index] ?? `${index + 1}.`}
              </span>

              <span className="encounter-history-date">
                {new Date(
                  encounter.encounter_date
                ).toLocaleDateString("en-GB")}
              </span>
            </NavLink>
          ))}
        </div>
      )}
    </section>
    </div>
  )
}
