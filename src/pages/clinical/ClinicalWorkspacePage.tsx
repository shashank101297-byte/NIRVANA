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
  const [historyOfPresentIllness, setHistoryOfPresentIllness] = useState('')
  const [pastHistory, setPastHistory] = useState('')
  const [personalHistory, setPersonalHistory] = useState('')
  const [familyHistory, setFamilyHistory] = useState('')
  const [drugAllergyHistory, setDrugAllergyHistory] = useState('')
  const [examination, setExamination] = useState('')

  const [prakriti, setPrakriti] = useState('')
  const [vikriti, setVikriti] = useState('')
  const [dosha, setDosha] = useState('')
  const [dushya, setDushya] = useState('')
  const [srotas, setSrotas] = useState('')
  const [agni, setAgni] = useState('')
  const [koshtha, setKoshtha] = useState('')
  const [ama, setAma] = useState('')
  const [nidana, setNidana] = useState('')
  const [samprapti, setSamprapti] = useState('')
  const [ayurvedicDiagnosis, setAyurvedicDiagnosis] = useState('')

  const [assessment, setAssessment] = useState('')
  const [diagnosis, setDiagnosis] = useState('')
  const [differentialDiagnosis, setDifferentialDiagnosis] = useState('')
  const [investigations, setInvestigations] = useState('')
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
        assessment: assessment.trim(),
        diagnosis: diagnosis.trim(),
        differential_diagnosis: differentialDiagnosis.trim(),
        investigations: investigations.trim(),
        treatment_plan: treatmentPlan.trim(),
        follow_up_advice: followUpAdvice.trim(),
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
            <section className="clinical-form-section">
              <div className="clinical-section-header">
                <p className="eyebrow">CLINICAL DOCUMENTATION</p>
                <h3>History & Examination</h3>
              </div>

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
            </section>

            <section className="clinical-form-section">
              <div className="clinical-section-header">
                <p className="eyebrow">AYURVEDIC ASSESSMENT</p>
                <h3>Ayurvedic Clinical Assessment</h3>
              </div>

              <div className="form-grid">
                <div className="form-field">
                  <label htmlFor="prakriti">Prakriti</label>
                  <textarea id="prakriti" value={prakriti} onChange={(event) => setPrakriti(event.target.value)} rows={3} />
                </div>

                <div className="form-field">
                  <label htmlFor="vikriti">Vikriti</label>
                  <textarea id="vikriti" value={vikriti} onChange={(event) => setVikriti(event.target.value)} rows={3} />
                </div>

                <div className="form-field">
                  <label htmlFor="dosha">Dosha</label>
                  <textarea id="dosha" value={dosha} onChange={(event) => setDosha(event.target.value)} rows={3} />
                </div>

                <div className="form-field">
                  <label htmlFor="dushya">Dushya</label>
                  <textarea id="dushya" value={dushya} onChange={(event) => setDushya(event.target.value)} rows={3} />
                </div>

                <div className="form-field">
                  <label htmlFor="srotas">Srotas</label>
                  <textarea id="srotas" value={srotas} onChange={(event) => setSrotas(event.target.value)} rows={3} />
                </div>

                <div className="form-field">
                  <label htmlFor="agni">Agni</label>
                  <textarea id="agni" value={agni} onChange={(event) => setAgni(event.target.value)} rows={3} />
                </div>

                <div className="form-field">
                  <label htmlFor="koshtha">Koshtha</label>
                  <textarea id="koshtha" value={koshtha} onChange={(event) => setKoshtha(event.target.value)} rows={3} />
                </div>

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
            </section>

            <section className="clinical-form-section">
              <div className="clinical-section-header">
                <p className="eyebrow">MODERN ASSESSMENT</p>
                <h3>Assessment & Investigations</h3>
              </div>

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
                  <label htmlFor="diagnosis">Diagnosis</label>
                  <textarea
                    id="diagnosis"
                    value={diagnosis}
                    onChange={(event) => setDiagnosis(event.target.value)}
                    rows={4}
                  />
                </div>

                <div className="form-field">
                  <label htmlFor="differential-diagnosis">Differential Diagnosis</label>
                  <textarea
                    id="differential-diagnosis"
                    value={differentialDiagnosis}
                    onChange={(event) => setDifferentialDiagnosis(event.target.value)}
                    rows={4}
                  />
                </div>

                <div className="form-field form-field-full">
                  <label htmlFor="investigations">Investigations</label>
                  <textarea
                    id="investigations"
                    value={investigations}
                    onChange={(event) => setInvestigations(event.target.value)}
                    rows={4}
                    placeholder="Laboratory, imaging and other relevant investigations..."
                  />
                </div>
              </div>
            </section>

            <section className="clinical-form-section">
              <div className="clinical-section-header">
                <p className="eyebrow">MANAGEMENT</p>
                <h3>Treatment & Follow-up</h3>
              </div>

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
            </section>
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
