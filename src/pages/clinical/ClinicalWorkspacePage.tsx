import { useEffect, useMemo, useState } from 'react'
import { NavLink, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useOrganization } from '../../context/OrganizationContext'
import PrescriptionSection from './PrescriptionSection'
import TerminologySelect from './TerminologySelect'

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


export default function ClinicalWorkspacePage() {
  const { patientId } = useParams<{ patientId: string }>()
  const [searchParams] = useSearchParams()
  const appointmentId = searchParams.get("appointmentId")
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
  const [savedEncounterId, setSavedEncounterId] = useState<string | null>(null)
  const [encounterCreatedForCurrentVisit, setEncounterCreatedForCurrentVisit] =
    useState(false)
  const [appointmentPreviousStatus, setAppointmentPreviousStatus] =
    useState<'Scheduled' | 'Confirmed' | null>(null)
  const [savingVisit, setSavingVisit] = useState(false)
  const [preparingVisit, setPreparingVisit] = useState(false)
  const [error, setError] = useState('')

  const [encounterType] = useState('OPD')
  const [status] = useState('Open')
  const [chiefComplaint] = useState('')
  const [historyOfPresentIllness, setHistoryOfPresentIllness] = useState('')
  const [pastHistory, setPastHistory] = useState('')
  const [personalHistory, setPersonalHistory] = useState('')
  const [familyHistory, setFamilyHistory] = useState('')
  const [drugAllergyHistory, setDrugAllergyHistory] = useState('')
  const [examination, setExamination] = useState('')

  const [prakriti, setPrakriti] = useState('')
  const [prakritiStructured, setPrakritiStructured] = useState<string[]>([])
  const [vikriti, setVikriti] = useState('')
  const [dosha, setDosha] = useState('')
  const [doshaStructured, setDoshaStructured] = useState<string[]>([])
  const [dushya, setDushya] = useState('')
  const [dushyaStructured, setDushyaStructured] = useState<string[]>([])
  const [srotas, setSrotas] = useState('')
  const [srotasStructured, setSrotasStructured] = useState<string[]>([])
  const [agni, setAgni] = useState('')
  const [agniStructured, setAgniStructured] = useState<string[]>([])
  const [koshtha, setKoshtha] = useState('')
  const [koshthaStructured, setKoshthaStructured] = useState<string[]>([])
  const [ama, setAma] = useState('')
  const [nidana, setNidana] = useState('')
  const [samprapti, setSamprapti] = useState('')
  const [ayurvedicDiagnosis, setAyurvedicDiagnosis] = useState('')

  const [assessment, setAssessment] = useState('')
  const [diagnosis, setDiagnosis] = useState('')
  const [diagnosisStructured, setDiagnosisStructured] = useState<string[]>([])
  const [diagnosisCodingMetadata, setDiagnosisCodingMetadata] = useState<
    Array<{
      code: string
      display_name: string
      source_system: string
      version: string
      metadata: Record<string, unknown>
    }>
  >([])
  const [diagnosisCustom, setDiagnosisCustom] = useState('')

  const [differentialDiagnosis, setDifferentialDiagnosis] = useState('')
  const [differentialDiagnosisStructured, setDifferentialDiagnosisStructured] =
    useState<string[]>([])
  const [
    differentialDiagnosisCodingMetadata,
    setDifferentialDiagnosisCodingMetadata,
  ] = useState<
    Array<{
      code: string
      display_name: string
      source_system: string
      version: string
      metadata: Record<string, unknown>
    }>
  >([])
  const [differentialDiagnosisCustom, setDifferentialDiagnosisCustom] =
    useState('')

  const [investigations, setInvestigations] = useState('')
  const [investigationsStructured, setInvestigationsStructured] = useState<string[]>([])
  const [treatmentPlan, setTreatmentPlan] = useState('')
  const [followUpAdvice, setFollowUpAdvice] = useState('')

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
    if (patientId && searchParams.get('newVisit') === 'true') {
      setShowNewVisit(true)

    }

    if (!activeOrganizationId) {
      setSelectedPatient(null)
      setPatientResults([])
      setEncounters([])
      return
    }

    if (patientId) {
      void loadSelectedPatient(patientId)
      void loadEncounters(patientId)

      if (appointmentId) {
        setShowNewVisit(true)
      }

      return
    }

    void loadPatientResults()
  }, [activeOrganizationId, patientId, search, searchParams])


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

  async function prepareNewVisit() {
    if (!selectedPatient || !activeOrganizationId || savedEncounterId) {
      return
    }

    setPreparingVisit(true)
    setError('')

    const { data: userData, error: userError } = await supabase.auth.getUser()

    if (userError || !userData.user) {
      setError(userError?.message ?? 'Unable to determine the authenticated user.')
      setPreparingVisit(false)
      return
    }

    let previousAppointmentStatus: 'Scheduled' | 'Confirmed' | null = null

    if (appointmentId) {
      const {
        data: appointment,
        error: appointmentLookupError,
      } = await supabase
        .from('appointments')
        .select('id, status')
        .eq('id', appointmentId)
        .eq('patient_id', selectedPatient.id)
        .eq('organization_id', activeOrganizationId)
        .single()

      if (appointmentLookupError || !appointment) {
        setError(
          appointmentLookupError?.message ??
            'The appointment could not be loaded for consultation.',
        )
        setPreparingVisit(false)
        return
      }

      if (appointment.status === 'Scheduled' || appointment.status === 'Confirmed') {
        previousAppointmentStatus = appointment.status
        setAppointmentPreviousStatus(appointment.status)

        const { error: appointmentUpdateError } = await supabase
          .from('appointments')
          .update({ status: 'In Progress' })
          .eq('id', appointmentId)
          .eq('patient_id', selectedPatient.id)
          .eq('organization_id', activeOrganizationId)
          .eq('status', appointment.status)

        if (appointmentUpdateError) {
          setError(
            `Unable to open the appointment for consultation: ${appointmentUpdateError.message}`,
          )
          setPreparingVisit(false)
          return
        }
      }
    }

    // Appointment-linked visits must reuse an existing encounter if one
    // already exists. The database constraint also protects against races.
    if (appointmentId) {
      const {
        data: existingEncounter,
        error: existingEncounterError,
      } = await supabase
        .from('clinical_encounters')
        .select('id')
        .eq('appointment_id', appointmentId)
        .eq('patient_id', selectedPatient.id)
        .eq('organization_id', activeOrganizationId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (existingEncounterError) {
        setError(existingEncounterError.message)
        setPreparingVisit(false)
        return
      }

      if (existingEncounter) {
        setSavedEncounterId(existingEncounter.id)
        setEncounterCreatedForCurrentVisit(false)
        setPreparingVisit(false)
        return
      }
    }

    const { data: createdEncounter, error: insertError } = await supabase
      .from('clinical_encounters')
      .insert({
        organization_id: activeOrganizationId,
        patient_id: selectedPatient.id,
        appointment_id: appointmentId || null,
        appointment_previous_status: previousAppointmentStatus,
        created_by: userData.user.id,
        encounter_date: new Date().toISOString(),
        encounter_type: encounterType,
        status: 'Open',
      })
      .select('id')
      .single()

    if (insertError) {
      if (appointmentId && insertError.code === '23505') {
        const {
          data: existingEncounterAfterConflict,
          error: existingEncounterAfterConflictError,
        } = await supabase
          .from('clinical_encounters')
          .select('id')
          .eq('appointment_id', appointmentId)
          .eq('patient_id', selectedPatient.id)
          .eq('organization_id', activeOrganizationId)
          .maybeSingle()

        if (!existingEncounterAfterConflictError && existingEncounterAfterConflict) {
          setSavedEncounterId(existingEncounterAfterConflict.id)
          setPreparingVisit(false)
          return
        }
      }

      setError(insertError.message)
      setPreparingVisit(false)
      return
    }

    if (!createdEncounter) {
      setError('The clinical encounter could not be opened.')
      setPreparingVisit(false)
      return
    }

    setSavedEncounterId(createdEncounter.id)
    setEncounterCreatedForCurrentVisit(true)
    setPreparingVisit(false)
  }

  useEffect(() => {
    if (
      showNewVisit &&
      selectedPatient &&
      activeOrganizationId &&
      !savedEncounterId
    ) {
      void prepareNewVisit()
    }
  }, [
    showNewVisit,
    selectedPatient,
    activeOrganizationId,
    savedEncounterId,
  ])

  async function handleCloseNewVisit() {
    setError('')

    if (!savedEncounterId || !encounterCreatedForCurrentVisit) {
      setShowNewVisit(false)
      setSavedEncounterId(null)
      setEncounterCreatedForCurrentVisit(false)
      setAppointmentPreviousStatus(null)
      return
    }

    const { data: abandonedEncounter, error: abandonError } = await supabase
      .from('clinical_encounters')
      .update({ status: 'Abandoned' })
      .eq('id', savedEncounterId)
      .eq('patient_id', selectedPatient?.id ?? '')
      .eq('organization_id', activeOrganizationId ?? '')
      .eq('status', 'Open')
      .select('id')
      .maybeSingle()

    if (abandonError) {
      setError(`Unable to discard the unfinished visit: ${abandonError.message}`)
      return
    }

    if (!abandonedEncounter) {
      setError('The unfinished visit could not be discarded safely.')
      return
    }

    if (appointmentId && appointmentPreviousStatus) {
      const { error: restoreAppointmentError } = await supabase
        .from('appointments')
        .update({ status: appointmentPreviousStatus })
        .eq('id', appointmentId)
        .eq('patient_id', selectedPatient?.id ?? '')
        .eq('organization_id', activeOrganizationId ?? '')
        .eq('status', 'In Progress')

      if (restoreAppointmentError) {
        setError(
          `Visit discarded, but the appointment status could not be restored: ${restoreAppointmentError.message}`,
        )
        return
      }
    }

    setShowNewVisit(false)
    setSavedEncounterId(null)
    setEncounterCreatedForCurrentVisit(false)
    setAppointmentPreviousStatus(null)
  }

  async function handleCreateVisit(event: React.FormEvent) {
    event.preventDefault()

    if (!selectedPatient || !activeOrganizationId || !savedEncounterId) {
      setError('The clinical visit is still being prepared. Please wait a moment.')
      return
    }

    setSavingVisit(true)
    setError('')

    const { data: updatedEncounter, error: updateError } = await supabase
      .from('clinical_encounters')
      .update({
        encounter_type: encounterType,
        status,
        chief_complaint: chiefComplaint.trim(),
        history_of_present_illness: historyOfPresentIllness.trim(),
        past_history: pastHistory.trim(),
        personal_history: personalHistory.trim(),
        family_history: familyHistory.trim(),
        drug_allergy_history: drugAllergyHistory.trim(),
        examination: examination.trim(),
        prakriti: prakriti.trim(),
        vikriti: vikriti.trim(),
        dosha: dosha.trim(),
        dushya: dushya.trim(),
        srotas: srotas.trim(),
        agni: agni.trim(),
        koshtha: koshtha.trim(),
        ama: ama.trim(),
        nidana: nidana.trim(),
        samprapti: samprapti.trim(),
        ayurvedic_diagnosis: ayurvedicDiagnosis.trim(),
        ayurvedic_structured_assessment: {
          prakriti: prakritiStructured,
          dosha: doshaStructured,
          dushya: dushyaStructured,
          srotas: srotasStructured,
          agni: agniStructured,
          koshtha: koshthaStructured,
        },
        assessment: assessment.trim(),
        diagnosis: diagnosis.trim(),
        differential_diagnosis: differentialDiagnosis.trim(),
        investigations: investigations.trim(),
        modern_structured_diagnoses: diagnosisStructured,
        modern_structured_differential_diagnoses:
          differentialDiagnosisStructured,
        diagnosis_coding_metadata: {
          terminology: 'NIRVANA clinical diagnosis library',
          concepts: diagnosisCodingMetadata,
        },
        differential_diagnosis_coding_metadata: {
          terminology: 'NIRVANA clinical diagnosis library',
          concepts: differentialDiagnosisCodingMetadata,
        },
        structured_investigations: investigationsStructured,
        treatment_plan: treatmentPlan.trim(),
        follow_up_advice: followUpAdvice.trim(),
      })
      .eq('id', savedEncounterId)
      .eq('patient_id', selectedPatient.id)
      .eq('organization_id', activeOrganizationId)
      .select('id')
      .maybeSingle()

    if (updateError) {
      setError(updateError.message)
      setSavingVisit(false)
      return
    }

    if (!updatedEncounter) {
      setError('The clinical encounter could not be updated.')
      setSavingVisit(false)
      return
    }

    if (appointmentId) {
      const {
        data: completedAppointment,
        error: appointmentUpdateError,
      } = await supabase
        .from('appointments')
        .update({ status: 'Completed' })
        .eq('id', appointmentId)
        .eq('patient_id', selectedPatient.id)
        .eq('organization_id', activeOrganizationId)
        .eq('status', 'In Progress')
        .select('id')
        .maybeSingle()

      if (appointmentUpdateError) {
        setError(
          `Visit saved, but the appointment status could not be updated: ${appointmentUpdateError.message}`,
        )
        setSavingVisit(false)
        return
      }

      if (!completedAppointment) {
        setError(
          'Visit saved, but the appointment was not in In Progress status. Please verify the appointment status.',
        )
        setSavingVisit(false)
        return
      }
    }

    setSavingVisit(false)
    setShowNewVisit(false)

    navigate(
      `/clinical/${selectedPatient.id}/encounter/${savedEncounterId}`,
    )
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
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => void handleCloseNewVisit()}
                  disabled={savingVisit || preparingVisit}
                >
                  Close / Discard
                </button>
              </div>

              <form onSubmit={handleCreateVisit} className="clinical-visit-form">
            <details className="clinical-form-section clinical-collapsible" open>
              <summary className="clinical-collapsible-summary">
                <div>
                  <p className="eyebrow">CLINICAL DOCUMENTATION</p>
                  <h3>History & Examination</h3>
                </div>
                <span className="clinical-section-toggle">⌄</span>
              </summary>

              <div className="form-field form-field-full">
                <label htmlFor="history-present-illness">History of Present Illness</label>
                <textarea
                  id="history-present-illness"
                  value={historyOfPresentIllness}
                  onChange={(event) => setHistoryOfPresentIllness(event.target.value)}
                  rows={5}
                  placeholder="Describe onset, duration, progression, associated symptoms, aggravating/relieving factors and relevant history..."
                />
              </div>

              <div className="form-grid">
                <div className="form-field">
                  <label htmlFor="past-history">Past History</label>
                  <textarea
                    id="past-history"
                    value={pastHistory}
                    onChange={(event) => setPastHistory(event.target.value)}
                    rows={4}
                    placeholder="Previous illnesses, admissions, surgeries, chronic conditions..."
                  />
                </div>

                <div className="form-field">
                  <label htmlFor="personal-history">Personal History</label>
                  <textarea
                    id="personal-history"
                    value={personalHistory}
                    onChange={(event) => setPersonalHistory(event.target.value)}
                    rows={4}
                    placeholder="Diet, appetite, sleep, bowel/bladder, addictions, occupation..."
                  />
                </div>

                <div className="form-field">
                  <label htmlFor="family-history">Family History</label>
                  <textarea
                    id="family-history"
                    value={familyHistory}
                    onChange={(event) => setFamilyHistory(event.target.value)}
                    rows={4}
                    placeholder="Relevant hereditary/familial illnesses..."
                  />
                </div>

                <div className="form-field">
                  <label htmlFor="drug-allergy-history">Drug / Allergy History</label>
                  <textarea
                    id="drug-allergy-history"
                    value={drugAllergyHistory}
                    onChange={(event) => setDrugAllergyHistory(event.target.value)}
                    rows={4}
                    placeholder="Current medications, previous drug reactions, allergies..."
                  />
                </div>
              </div>

              <div className="form-field form-field-full">
                <label htmlFor="examination">Examination</label>
                <textarea
                  id="examination"
                  value={examination}
                  onChange={(event) => setExamination(event.target.value)}
                  rows={5}
                  placeholder="General examination, vitals, systemic examination and relevant findings..."
                />
              </div>
            </details>

            <details className="clinical-form-section clinical-collapsible">
              <summary className="clinical-collapsible-summary">
                <div>
                  <p className="eyebrow">AYURVEDIC ASSESSMENT</p>
                  <h3>Ayurvedic Clinical Assessment</h3>
                </div>
                <span className="clinical-section-toggle">⌄</span>
              </summary>

              <div className="form-grid">
                <TerminologySelect
                  label="Prakriti"
                  setCode="ayurveda.prakriti"
                  value={prakritiStructured}
                  onChange={(values) => {
                    setPrakritiStructured(values)
                    setPrakriti(values.join(', '))
                  }}
                />

                <div className="form-field">
                  <label htmlFor="vikriti">Vikriti</label>
                  <textarea id="vikriti" value={vikriti} onChange={(event) => setVikriti(event.target.value)} rows={3} />
                </div>

                <TerminologySelect
                  label="Dosha"
                  setCode="ayurveda.dosha"
                  value={doshaStructured}
                  onChange={(values) => {
                    setDoshaStructured(values)
                    setDosha(values.join(', '))
                  }}
                  multiple
                />

                <TerminologySelect
                  label="Dushya"
                  setCode="ayurveda.dushya"
                  value={dushyaStructured}
                  onChange={(values) => {
                    setDushyaStructured(values)
                    setDushya(values.join(', '))
                  }}
                  multiple
                />

                <TerminologySelect
                  label="Srotas"
                  setCode="ayurveda.srotas"
                  value={srotasStructured}
                  onChange={(values) => {
                    setSrotasStructured(values)
                    setSrotas(values.join(', '))
                  }}
                  multiple
                />

                <TerminologySelect
                  label="Agni"
                  setCode="ayurveda.agni"
                  value={agniStructured}
                  onChange={(values) => {
                    setAgniStructured(values)
                    setAgni(values.join(', '))
                  }}
                />

                <TerminologySelect
                  label="Koshtha"
                  setCode="ayurveda.koshtha"
                  value={koshthaStructured}
                  onChange={(values) => {
                    setKoshthaStructured(values)
                    setKoshtha(values.join(', '))
                  }}
                />

                <div className="form-field">
                  <label htmlFor="ama">Ama</label>
                  <textarea id="ama" value={ama} onChange={(event) => setAma(event.target.value)} rows={3} />
                </div>

                <div className="form-field">
                  <label htmlFor="nidana">Nidana</label>
                  <textarea id="nidana" value={nidana} onChange={(event) => setNidana(event.target.value)} rows={3} />
                </div>

                <div className="form-field">
                  <label htmlFor="samprapti">Samprapti</label>
                  <textarea id="samprapti" value={samprapti} onChange={(event) => setSamprapti(event.target.value)} rows={3} />
                </div>

                <div className="form-field form-field-full">
                  <label htmlFor="ayurvedic-diagnosis">Ayurvedic Diagnosis</label>
                  <textarea
                    id="ayurvedic-diagnosis"
                    value={ayurvedicDiagnosis}
                    onChange={(event) => setAyurvedicDiagnosis(event.target.value)}
                    rows={4}
                    placeholder="Ayurvedic diagnosis / Roga-Rogi assessment..."
                  />
                </div>
              </div>
            </details>

            <details className="clinical-form-section clinical-collapsible">
              <summary className="clinical-collapsible-summary">
                <div>
                  <p className="eyebrow">MODERN ASSESSMENT</p>
                  <h3>Assessment & Investigations</h3>
                </div>
                <span className="clinical-section-toggle">⌄</span>
              </summary>

              <div className="form-grid">
                <div className="form-field form-field-full">
                  <label htmlFor="assessment">Assessment</label>
                  <textarea
                    id="assessment"
                    value={assessment}
                    onChange={(event) => setAssessment(event.target.value)}
                    rows={4}
                  />
                </div>

                <div className="form-field">
                  <TerminologySelect
                    label="Diagnosis"
                    setCode="modern.diagnosis.common"
                    value={diagnosisStructured}
                    onChange={(values) => {
                      setDiagnosisStructured(values)
                      setDiagnosis(
                        [
                          ...values,
                          ...(diagnosisCustom.trim()
                            ? [diagnosisCustom.trim()]
                            : []),
                        ].join(', '),
                      )
                    }}
                    onStructuredChange={setDiagnosisCodingMetadata}
                    multiple
                    allowCustom
                    customValue={diagnosisCustom}
                    onCustomChange={(custom) => {
                      setDiagnosisCustom(custom)
                      setDiagnosis(
                        [
                          ...diagnosisStructured,
                          ...(custom.trim() ? [custom.trim()] : []),
                        ].join(', '),
                      )
                    }}
                    placeholder="Search and select diagnosis..."
                  />
                </div>

                <div className="form-field">
                  <TerminologySelect
                    label="Differential Diagnosis"
                    setCode="modern.diagnosis.common"
                    value={differentialDiagnosisStructured}
                    onChange={(values) => {
                      setDifferentialDiagnosisStructured(values)
                      setDifferentialDiagnosis(
                        [
                          ...values,
                          ...(differentialDiagnosisCustom.trim()
                            ? [differentialDiagnosisCustom.trim()]
                            : []),
                        ].join(', '),
                      )
                    }}
                    onStructuredChange={
                      setDifferentialDiagnosisCodingMetadata
                    }
                    multiple
                    allowCustom
                    customValue={differentialDiagnosisCustom}
                    onCustomChange={(custom) => {
                      setDifferentialDiagnosisCustom(custom)
                      setDifferentialDiagnosis(
                        [
                          ...differentialDiagnosisStructured,
                          ...(custom.trim() ? [custom.trim()] : []),
                        ].join(', '),
                      )
                    }}
                    placeholder="Search and select differential diagnosis..."
                  />
                </div>

                <div className="form-field form-field-full">
                  <TerminologySelect
                    label="Investigations"
                    setCode="investigation.common"
                    value={investigationsStructured}
                    onChange={(values) => {
                      setInvestigationsStructured(values)
                      setInvestigations(values.join(', '))
                    }}
                    multiple
                    placeholder="Search and select investigations..."
                  />

                  <textarea
                    id="investigations-notes"
                    value={investigations}
                    onChange={(event) => setInvestigations(event.target.value)}
                    rows={3}
                    placeholder="Optional findings, details or custom investigation..."
                  />
                </div>
              </div>
            </details>

            <details className="clinical-form-section clinical-collapsible">
              <summary className="clinical-collapsible-summary">
                <div>
                  <p className="eyebrow">MANAGEMENT</p>
                  <h3>Treatment & Follow-up</h3>
                </div>
                <span className="clinical-section-toggle">⌄</span>
              </summary>

              <div className="form-field form-field-full">
                <label htmlFor="treatment-plan">Treatment / Plan</label>
                <textarea
                  id="treatment-plan"
                  value={treatmentPlan}
                  onChange={(event) => setTreatmentPlan(event.target.value)}
                  rows={5}
                  placeholder="Ayurvedic treatment, modern treatment, procedures, counselling and other plan..."
                />
              </div>

              <div className="form-field form-field-full">
                <label htmlFor="follow-up-advice">Follow-up Advice</label>
                <textarea
                  id="follow-up-advice"
                  value={followUpAdvice}
                  onChange={(event) => setFollowUpAdvice(event.target.value)}
                  rows={4}
                  placeholder="Follow-up date, precautions, investigations, warning signs and instructions..."
                />
              </div>
            </details>

            {savedEncounterId && (
              <PrescriptionSection
                encounterId={savedEncounterId}
                patientId={selectedPatient.id}
                organizationId={activeOrganizationId!}
              />
            )}

            <div className="form-actions clinical-save-bar">
              <button
                type="submit"
                className="primary-button"
                disabled={savingVisit || preparingVisit || !savedEncounterId}
              >
                {savingVisit
                  ? 'Saving...'
                  : preparingVisit
                    ? 'Preparing Visit...'
                    : 'Save Visit'}
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
