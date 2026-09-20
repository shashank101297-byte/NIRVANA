import { useEffect, useMemo, useState } from 'react'
import { NavLink, useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useOrganization } from '../../context/OrganizationContext'

type Patient = {
  id: string
  patient_code: string
  full_name: string
  age_years: number
  sex: string
  mobile: string
  status: string
  organization_id: string
  created_at: string
}

type ClinicalEncounter = {
  id: string
  organization_id: string
  patient_id: string
  created_by: string
  encounter_date: string
  encounter_type: string
  status: string
  chief_complaint: string
  created_at: string
  updated_at: string
}

const encounterTypes = ['OPD', 'Follow-up', 'Emergency', 'Day Care']
const encounterStatuses = ['Open', 'Completed', 'Cancelled']

export default function ClinicalWorkspacePage() {
  const { patientId } = useParams<{ patientId: string }>()
  const navigate = useNavigate()
  const { activeOrganization, activeOrganizationId, loading: organizationLoading } = useOrganization()

  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null)
  const [patientLoading, setPatientLoading] = useState(false)
  const [patientResults, setPatientResults] = useState<Patient[]>([])
  const [search, setSearch] = useState('')
  const [searching, setSearching] = useState(false)
  const [, setEncounters] = useState<ClinicalEncounter[]>([])
  const [, setEncounterLoading] = useState(false)
  const [showNewVisit, setShowNewVisit] = useState(false)
  const [savingVisit, setSavingVisit] = useState(false)
  const [error, setError] = useState('')

  const [encounterDate, setEncounterDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [encounterType, setEncounterType] = useState('OPD')
  const [status, setStatus] = useState('Open')
  const [chiefComplaint, setChiefComplaint] = useState('')

  const hasActiveOrganization = Boolean(activeOrganizationId && activeOrganization)

  async function loadPatientResults() {
    if (!activeOrganizationId) {
      setPatientResults([])
      return
    }

    setSearching(true)
    setError('')

    let query = supabase
      .from('patients')
      .select('id, patient_code, full_name, age_years, sex, mobile, status, organization_id, created_at')
      .eq('organization_id', activeOrganizationId)
      .eq('status', 'active')
      .order('created_at', { ascending: false })

    const trimmedSearch = search.trim()

    if (trimmedSearch) {
      const searchValue = trimmedSearch.replace(/[%_]/g, '\\$&')
      query = query.or(
        `patient_code.ilike.%${searchValue}%,full_name.ilike.%${searchValue}%,mobile.ilike.%${searchValue}%`,
      )
    }

    const { data, error: queryError } = await query

    if (queryError) {
      setError(queryError.message)
      setPatientResults([])
    } else {
      setPatientResults((data ?? []) as Patient[])
    }

    setSearching(false)
  }

  async function loadSelectedPatient(patientUuid: string) {
    if (!activeOrganizationId) {
      setSelectedPatient(null)
      return
    }

    setError('')
    setPatientLoading(true)

    const { data, error: patientError } = await supabase
      .from('patients')
      .select('id, patient_code, full_name, age_years, sex, mobile, status, organization_id, created_at')
      .eq('id', patientUuid)
      .eq('organization_id', activeOrganizationId)
      .single()

    if (patientError) {
      setSelectedPatient(null)
      setError(patientError.message)
      setPatientLoading(false)
      return
    }

    setSelectedPatient(data as Patient)
    setPatientLoading(false)
  }

  async function loadEncounters(patientUuid: string) {
    if (!activeOrganizationId) {
      setEncounters([])
      return
    }

    setEncounterLoading(true)

    const { data, error: encountersError } = await supabase
      .from('clinical_encounters')
      .select('id, organization_id, patient_id, created_by, encounter_date, encounter_type, status, chief_complaint, created_at, updated_at')
      .eq('patient_id', patientUuid)
      .eq('organization_id', activeOrganizationId)
      .order('encounter_date', { ascending: false })

    if (encountersError) {
      setError(encountersError.message)
      setEncounters([])
    } else {
      setEncounters((data ?? []) as ClinicalEncounter[])
    }

    setEncounterLoading(false)
  }

  useEffect(() => {
    if (!activeOrganizationId) {
      setSelectedPatient(null)
      setPatientResults([])
      setEncounters([])
      return
    }

    if (patientId) {
      void loadSelectedPatient(patientId)
      void loadEncounters(patientId)
      return
    }

    void loadPatientResults()
  }, [activeOrganizationId, patientId, search])


  const activePatientSummary = useMemo(() => {
    if (!selectedPatient) {
      return null
    }

    return {
      patientCode: selectedPatient.patient_code,
      fullName: selectedPatient.full_name,
      age: selectedPatient.age_years,
      sex: selectedPatient.sex,
      mobile: selectedPatient.mobile,
      organization: activeOrganization?.name ?? 'Current organization',
      status: selectedPatient.status,
    }
  }, [activeOrganization, selectedPatient])

  async function handleCreateVisit(event: React.FormEvent) {
    event.preventDefault()

    if (!selectedPatient || !activeOrganizationId) {
      setError('No valid patient or active organization is available for a new visit.')
      return
    }

    const { data: userData, error: userError } = await supabase.auth.getUser()

    if (userError || !userData.user) {
      setError(userError?.message ?? 'Unable to determine the authenticated user.')
      return
    }

    setSavingVisit(true)
    setError('')

    const { error: insertError } = await supabase
      .from('clinical_encounters')
      .insert({
        organization_id: activeOrganizationId,
        patient_id: selectedPatient.id,
        created_by: userData.user.id,
        encounter_date: new Date(encounterDate).toISOString(),
        encounter_type: encounterType,
        status,
        chief_complaint: chiefComplaint.trim(),
      })

    if (insertError) {
      setError(insertError.message)
      setSavingVisit(false)
      return
    }

    setEncounterDate(new Date().toISOString().slice(0, 10))
    setEncounterType('OPD')
    setStatus('Open')
    setChiefComplaint('')
    setShowNewVisit(false)
    setSavingVisit(false)
    void loadEncounters(selectedPatient.id)
  }

  if (organizationLoading) {
    return (
      <div className="page">
        <p className="eyebrow">CLINICAL WORKSPACE</p>
        <h1>Loading organization context…</h1>
      </div>
    )
  }

  if (!hasActiveOrganization) {
    return (
      <div className="page">
        <div className="account-card">
          <p className="eyebrow">CLINICAL WORKSPACE</p>
          <h1>No active organization</h1>
          <p>
            An active organization is required before using the clinical workspace.
          </p>
        </div>
      </div>
    )
  }

  if (patientId && patientLoading) {
    return (
      <div className="page">
        <p className="eyebrow">CLINICAL WORKSPACE</p>
        <h1>Loading patient...</h1>
        <p>Loading the selected patient from the active organization.</p>
      </div>
    )
  }

  if (patientId && !patientLoading && !selectedPatient) {
    return (
      <div className="page">
        <p className="eyebrow">CLINICAL WORKSPACE</p>
        <h1>Patient unavailable</h1>
        <p>
          The selected patient is not available in the active organization.
        </p>
        <button
          type="button"
          className="secondary-button"
          onClick={() => navigate('/clinical')}
        >
          Back to Clinical Workspace
        </button>
      </div>
    )
  }

  return (
    <div className="page clinical-workspace-page">
      <div className="clinical-header">
        <div>
          <p className="eyebrow">CLINICAL WORKSPACE</p>
          <h1>Clinical</h1>
        </div>

        <div className="clinical-org-badge">
          <span>Active organization</span>
          <strong>{activeOrganization?.name ?? 'Current organization'}</strong>
        </div>
      </div>

      {error && (
        <div className="nirvana-error" role="alert">
          {error}
        </div>
      )}

      {!patientId && (
        <section className="clinical-panel">
          <div className="clinical-section-header">
            <div>
              <p className="eyebrow">PATIENT SEARCH</p>
              <h2>Select a patient</h2>
            </div>
          </div>

          <div className="patient-search clinical-search">
            <label htmlFor="clinical-patient-search">Search by code, name or mobile</label>
            <input
              id="clinical-patient-search"
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search active patients"
            />
          </div>

          {searching ? (
            <div className="empty-patients">
              <h3>Searching patient records…</h3>
            </div>
          ) : patientResults.length === 0 ? (
            <div className="empty-patients">
              <div className="empty-icon">👤</div>
              <h3>No patients found</h3>
              <p>Try a different code, name or mobile number.</p>
            </div>
          ) : (
            <div className="patient-result-list">
              {patientResults.map((patient) => (
                <button
                  key={patient.id}
                  type="button"
                  className="patient-result-row"
                  onClick={() => navigate(`/clinical/${patient.id}`)}
                >
                  <div>
                    <strong>{patient.patient_code}</strong>
                    <span>{patient.full_name}</span>
                  </div>
                  <div className="patient-result-meta">
                    <span>{patient.sex}</span>
                    <span>{patient.mobile}</span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </section>
      )}

      {patientId && selectedPatient && activePatientSummary && (
        <>
          <section className="clinical-panel patient-summary-card">
            <div className="clinical-section-header">
              <div>
                <p className="eyebrow">PATIENT</p>
                <h2>{activePatientSummary.fullName}</h2>
              </div>

              <div className="clinical-patient-meta-row">
                <span>{activePatientSummary.patientCode}</span>
                <span>{activePatientSummary.status}</span>
              </div>
            </div>

            <div className="patient-detail-grid clinical-patient-grid">
              <div>
                <span>Patient ID</span>
                <strong>{activePatientSummary.patientCode}</strong>
              </div>
              <div>
                <span>Age</span>
                <strong>{activePatientSummary.age}</strong>
              </div>
              <div>
                <span>Sex</span>
                <strong>{activePatientSummary.sex}</strong>
              </div>
              <div>
                <span>Mobile</span>
                <strong>{activePatientSummary.mobile}</strong>
              </div>
              <div>
                <span>Organization</span>
                <strong>{activePatientSummary.organization}</strong>
              </div>
              <div>
                <span>Status</span>
                <strong>{activePatientSummary.status}</strong>
              </div>
            </div>

            <div className="clinical-actions">
              <NavLink to={`/patients/${selectedPatient.id}`} className="secondary-button">
                Patient Details
              </NavLink>
              <NavLink
              to={`/clinical/${selectedPatient.id}/encounters`}
              className="secondary-button"
            >
              Clinical Encounters
            </NavLink>
            <button type="button" className="primary-button" onClick={() => setShowNewVisit(true)}>
                + New Visit
              </button>
            </div>
          </section>

          {showNewVisit && (
            <section className="clinical-panel">
              <div className="clinical-section-header">
                <div>
                  <p className="eyebrow">NEW VISIT</p>
                  <h2>Create encounter</h2>
                </div>
                <button type="button" className="secondary-button" onClick={() => setShowNewVisit(false)}>
                  Close
                </button>
              </div>

              <form onSubmit={handleCreateVisit} className="clinical-visit-form">
                <div className="form-field">
                  <label htmlFor="visit-date">Encounter date</label>
                  <input
                    id="visit-date"
                    type="date"
                    value={encounterDate}
                    onChange={(event) => setEncounterDate(event.target.value)}
                    required
                  />
                </div>

                <div className="form-field">
                  <label htmlFor="visit-type">Encounter type</label>
                  <select
                    id="visit-type"
                    value={encounterType}
                    onChange={(event) => setEncounterType(event.target.value)}
                    required
                  >
                    {encounterTypes.map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-field">
                  <label htmlFor="visit-status">Status</label>
                  <select
                    id="visit-status"
                    value={status}
                    onChange={(event) => setStatus(event.target.value)}
                    required
                  >
                    {encounterStatuses.map((nextStatus) => (
                      <option key={nextStatus} value={nextStatus}>
                        {nextStatus}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-field form-field-full">
                  <label htmlFor="visit-complaint">Chief complaint</label>
                  <textarea
                    id="visit-complaint"
                    rows={4}
                    value={chiefComplaint}
                    onChange={(event) => setChiefComplaint(event.target.value)}
                    placeholder="Describe the main concern or reason for visit"
                    required
                  />
                </div>

                <div className="form-actions">
                  <button type="submit" className="primary-button" disabled={savingVisit}>
                    {savingVisit ? 'Saving...' : 'Save Visit'}
                  </button>
                </div>
              </form>
            </section>
          )}

          
        </>
      )}
    </div>
  )
}
