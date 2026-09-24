import { useEffect, useState } from 'react'
import { NavLink, useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useOrganization } from '../../context/OrganizationContext'
import PrescriptionSection from './PrescriptionSection'
import PrescriptionHistory from './PrescriptionHistory'
import TerminologySelect from './TerminologySelect'

type ClinicalEncounter = {
  id: string
  organization_id: string
  patient_id: string
  created_by: string
  encounter_date: string
  encounter_type: string
  status: string
  chief_complaint: string | null
  history_of_present_illness: string
  past_history: string
  personal_history: string
  family_history: string
  drug_allergy_history: string
  examination: string
  assessment: string
  diagnosis: string
  differential_diagnosis: string
  investigations: string
  treatment_plan: string
  follow_up_advice: string
  prakriti: string
  vikriti: string
  dosha: string
  dushya: string
  srotas: string
  agni: string
  koshtha: string
  ama: string
  nidana: string
  samprapti: string
  ayurvedic_diagnosis: string

  ayurvedic_structured_assessment: {
    prakriti?: Array<Record<string, unknown>>
    dosha?: Array<Record<string, unknown>>
    dushya?: Array<Record<string, unknown>>
    srotas?: Array<Record<string, unknown>>
    agni?: Array<Record<string, unknown>>
    koshtha?: Array<Record<string, unknown>>
  }

  modern_structured_diagnoses: string[]
  modern_structured_differential_diagnoses: string[]
  structured_investigations: string[]

  diagnosis_coding_metadata: {
    concepts?: Array<Record<string, unknown>>
  }

  differential_diagnosis_coding_metadata: {
    concepts?: Array<Record<string, unknown>>
  }

  created_at: string
  updated_at: string
}

type DocumentationDraft = {
  chief_complaint: string
  history_of_present_illness: string
  past_history: string
  personal_history: string
  family_history: string
  drug_allergy_history: string
  examination: string
  prakriti: string
  vikriti: string
  dosha: string
  dushya: string
  srotas: string
  agni: string
  koshtha: string
  ama: string
  nidana: string
  samprapti: string
  ayurvedic_diagnosis: string
  assessment: string
  diagnosis: string
  differential_diagnosis: string
  investigations: string
  treatment_plan: string
  follow_up_advice: string
}

const documentationFields: Array<{
  key: keyof DocumentationDraft
  label: string
  section: 'history' | 'ayurveda' | 'modern' | 'management'
}> = [
  { key: 'chief_complaint', label: 'Chief Complaint', section: 'history' },
  { key: 'history_of_present_illness', label: 'History of Present Illness', section: 'history' },
  { key: 'past_history', label: 'Past History', section: 'history' },
  { key: 'personal_history', label: 'Personal History', section: 'history' },
  { key: 'family_history', label: 'Family History', section: 'history' },
  { key: 'drug_allergy_history', label: 'Drug / Allergy History', section: 'history' },
  { key: 'examination', label: 'Examination', section: 'history' },

  { key: 'prakriti', label: 'Prakriti', section: 'ayurveda' },
  { key: 'vikriti', label: 'Vikriti', section: 'ayurveda' },
  { key: 'dosha', label: 'Dosha', section: 'ayurveda' },
  { key: 'dushya', label: 'Dushya', section: 'ayurveda' },
  { key: 'srotas', label: 'Srotas', section: 'ayurveda' },
  { key: 'agni', label: 'Agni', section: 'ayurveda' },
  { key: 'koshtha', label: 'Koshtha', section: 'ayurveda' },
  { key: 'ama', label: 'Ama', section: 'ayurveda' },
  { key: 'nidana', label: 'Nidana', section: 'ayurveda' },
  { key: 'samprapti', label: 'Samprapti', section: 'ayurveda' },
  { key: 'ayurvedic_diagnosis', label: 'Ayurvedic Diagnosis', section: 'ayurveda' },

  { key: 'assessment', label: 'Assessment', section: 'modern' },
  { key: 'diagnosis', label: 'Diagnosis', section: 'modern' },
  { key: 'differential_diagnosis', label: 'Differential Diagnosis', section: 'modern' },
  { key: 'investigations', label: 'Investigations', section: 'modern' },

  { key: 'treatment_plan', label: 'Treatment / Plan', section: 'management' },
  { key: 'follow_up_advice', label: 'Follow-up Advice', section: 'management' },
]

function createDraft(encounter: ClinicalEncounter): DocumentationDraft {
  return {
    chief_complaint: encounter.chief_complaint ?? '',
    history_of_present_illness: encounter.history_of_present_illness ?? '',
    past_history: encounter.past_history ?? '',
    personal_history: encounter.personal_history ?? '',
    family_history: encounter.family_history ?? '',
    drug_allergy_history: encounter.drug_allergy_history ?? '',
    examination: encounter.examination ?? '',
    prakriti: encounter.prakriti ?? '',
    vikriti: encounter.vikriti ?? '',
    dosha: encounter.dosha ?? '',
    dushya: encounter.dushya ?? '',
    srotas: encounter.srotas ?? '',
    agni: encounter.agni ?? '',
    koshtha: encounter.koshtha ?? '',
    ama: encounter.ama ?? '',
    nidana: encounter.nidana ?? '',
    samprapti: encounter.samprapti ?? '',
    ayurvedic_diagnosis: encounter.ayurvedic_diagnosis ?? '',
    assessment: encounter.assessment ?? '',
    diagnosis: encounter.diagnosis ?? '',
    differential_diagnosis: encounter.differential_diagnosis ?? '',
    investigations: encounter.investigations ?? '',
    treatment_plan: encounter.treatment_plan ?? '',
    follow_up_advice: encounter.follow_up_advice ?? '',
  }
}

export default function ClinicalEncounterPage() {
  const { patientId, encounterId } = useParams<{
    patientId: string
    encounterId: string
  }>()

  const navigate = useNavigate()

  const {
    activeOrganization,
    activeOrganizationId,
    loading: organizationLoading,
  } = useOrganization()

  const [encounter, setEncounter] = useState<ClinicalEncounter | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [editing, setEditing] = useState(false)
  const [error, setError] = useState('')
  const [saveMessage, setSaveMessage] = useState('')

  const [draft, setDraft] = useState<DocumentationDraft | null>(null)

  const [prakritiStructured, setPrakritiStructured] = useState<string[]>([])
  const [doshaStructured, setDoshaStructured] = useState<string[]>([])
  const [dushyaStructured, setDushyaStructured] = useState<string[]>([])
  const [srotasStructured, setSrotasStructured] = useState<string[]>([])
  const [agniStructured, setAgniStructured] = useState<string[]>([])
  const [koshthaStructured, setKoshthaStructured] = useState<string[]>([])

  const [diagnosisStructured, setDiagnosisStructured] = useState<string[]>([])
  const [
    differentialDiagnosisStructured,
    setDifferentialDiagnosisStructured,
  ] = useState<string[]>([])
  const [investigationsStructured, setInvestigationsStructured] =
    useState<string[]>([])

  const [diagnosisCodingMetadata, setDiagnosisCodingMetadata] = useState<
    Array<Record<string, unknown>>
  >([])

  const [
    differentialDiagnosisCodingMetadata,
    setDifferentialDiagnosisCodingMetadata,
  ] = useState<Array<Record<string, unknown>>>([])

  useEffect(() => {
    async function loadEncounter() {
      if (!activeOrganizationId || !patientId || !encounterId) {
        return
      }

      setLoading(true)
      setError('')

      const { data, error: encounterError } = await supabase
        .from('clinical_encounters')
        .select(`
          id,
          organization_id,
          patient_id,
          created_by,
          encounter_date,
          encounter_type,
          status,
          chief_complaint,
          history_of_present_illness,
          past_history,
          personal_history,
          family_history,
          drug_allergy_history,
          examination,
          assessment,
          diagnosis,
          differential_diagnosis,
          investigations,
          treatment_plan,
          follow_up_advice,
          prakriti,
          vikriti,
          dosha,
          dushya,
          srotas,
          agni,
          koshtha,
          ama,
          nidana,
          samprapti,
          ayurvedic_diagnosis,
          ayurvedic_structured_assessment,
          modern_structured_diagnoses,
          modern_structured_differential_diagnoses,
          structured_investigations,
          diagnosis_coding_metadata,
          differential_diagnosis_coding_metadata,
          created_at,
          updated_at
        `)
        .eq('id', encounterId)
        .eq('patient_id', patientId)
        .eq('organization_id', activeOrganizationId)
        .single()

      if (encounterError) {
        setEncounter(null)
        setError(encounterError.message)
      } else {
        const loadedEncounter = data as ClinicalEncounter
        setEncounter(loadedEncounter)
        setDraft(createDraft(loadedEncounter))
      }

      setLoading(false)
    }

    loadEncounter()
  }, [activeOrganizationId, patientId, encounterId])

  function updateDraft(
    key: keyof DocumentationDraft,
    value: string,
  ) {
    setDraft((current) => {
      if (!current) return current

      return {
        ...current,
        [key]: value,
      }
    })
  }

  function loadStructuredEditState(loadedEncounter: ClinicalEncounter) {
    const ayurveda =
      loadedEncounter.ayurvedic_structured_assessment ?? {}

    setPrakritiStructured(
      (ayurveda.prakriti ?? [])
        .map((item) => String(item.code ?? ''))
        .filter(Boolean),
    )

    setDoshaStructured(
      (ayurveda.dosha ?? [])
        .map((item) => String(item.code ?? ''))
        .filter(Boolean),
    )

    setDushyaStructured(
      (ayurveda.dushya ?? [])
        .map((item) => String(item.code ?? ''))
        .filter(Boolean),
    )

    setSrotasStructured(
      (ayurveda.srotas ?? [])
        .map((item) => String(item.code ?? ''))
        .filter(Boolean),
    )

    setAgniStructured(
      (ayurveda.agni ?? [])
        .map((item) => String(item.code ?? ''))
        .filter(Boolean),
    )

    setKoshthaStructured(
      (ayurveda.koshtha ?? [])
        .map((item) => String(item.code ?? ''))
        .filter(Boolean),
    )

    setDiagnosisStructured(
      loadedEncounter.modern_structured_diagnoses ?? [],
    )

    setDifferentialDiagnosisStructured(
      loadedEncounter.modern_structured_differential_diagnoses ?? [],
    )

    setInvestigationsStructured(
      loadedEncounter.structured_investigations ?? [],
    )

    setDiagnosisCodingMetadata(
      loadedEncounter.diagnosis_coding_metadata?.concepts ?? [],
    )

    setDifferentialDiagnosisCodingMetadata(
      loadedEncounter.differential_diagnosis_coding_metadata?.concepts ?? [],
    )
  }

  function startEditing() {
    if (!encounter) return

    setDraft(createDraft(encounter))
    loadStructuredEditState(encounter)
    setSaveMessage('')
    setError('')
    setEditing(true)
  }

  function cancelEditing() {
    if (encounter) {
      setDraft(createDraft(encounter))
      loadStructuredEditState(encounter)
    }

    setError('')
    setSaveMessage('')
    setEditing(false)
  }

  async function saveEncounter() {
    if (!encounter || !draft || !activeOrganizationId) {
      return
    }

    setSaving(true)
    setError('')
    setSaveMessage('')

    const { data, error: updateError } = await supabase
      .from('clinical_encounters')
      .update({
        chief_complaint: draft.chief_complaint.trim(),
        history_of_present_illness: draft.history_of_present_illness.trim(),
        past_history: draft.past_history.trim(),
        personal_history: draft.personal_history.trim(),
        family_history: draft.family_history.trim(),
        drug_allergy_history: draft.drug_allergy_history.trim(),
        examination: draft.examination.trim(),

        prakriti: draft.prakriti.trim(),
        vikriti: draft.vikriti.trim(),
        dosha: draft.dosha.trim(),
        dushya: draft.dushya.trim(),
        srotas: draft.srotas.trim(),
        agni: draft.agni.trim(),
        koshtha: draft.koshtha.trim(),
        ama: draft.ama.trim(),
        nidana: draft.nidana.trim(),
        samprapti: draft.samprapti.trim(),
        ayurvedic_diagnosis: draft.ayurvedic_diagnosis.trim(),

        ayurvedic_structured_assessment: {
          prakriti: prakritiStructured,
          dosha: doshaStructured,
          dushya: dushyaStructured,
          srotas: srotasStructured,
          agni: agniStructured,
          koshtha: koshthaStructured,
        },

        assessment: draft.assessment.trim(),
        diagnosis: draft.diagnosis.trim(),
        differential_diagnosis: draft.differential_diagnosis.trim(),
        investigations: draft.investigations.trim(),

        modern_structured_diagnoses: diagnosisStructured,
        modern_structured_differential_diagnoses:
          differentialDiagnosisStructured,
        structured_investigations: investigationsStructured,

        diagnosis_coding_metadata: {
          terminology: 'NIRVANA clinical diagnosis library',
          concepts: diagnosisCodingMetadata,
        },

        differential_diagnosis_coding_metadata: {
          terminology: 'NIRVANA clinical diagnosis library',
          concepts: differentialDiagnosisCodingMetadata,
        },

        treatment_plan: draft.treatment_plan.trim(),
        follow_up_advice: draft.follow_up_advice.trim(),

        updated_at: new Date().toISOString(),
      })
      .eq('id', encounter.id)
      .eq('patient_id', encounter.patient_id)
      .eq('organization_id', activeOrganizationId)
      .select(`
        id,
        organization_id,
        patient_id,
        created_by,
        encounter_date,
        encounter_type,
        status,
        chief_complaint,
        history_of_present_illness,
        past_history,
        personal_history,
        family_history,
        drug_allergy_history,
        examination,
        assessment,
        diagnosis,
        differential_diagnosis,
        investigations,
        treatment_plan,
        follow_up_advice,
        prakriti,
        vikriti,
        dosha,
        dushya,
        srotas,
        agni,
        koshtha,
        ama,
        nidana,
        samprapti,
        ayurvedic_diagnosis,
        ayurvedic_structured_assessment,
        modern_structured_diagnoses,
        modern_structured_differential_diagnoses,
        structured_investigations,
        diagnosis_coding_metadata,
        differential_diagnosis_coding_metadata,
        created_at,
        updated_at
      `)
      .single()

    if (updateError) {
      setError(updateError.message)
      setSaving(false)
      return
    }

    const updatedEncounter = data as ClinicalEncounter

    setEncounter(updatedEncounter)
    setDraft(createDraft(updatedEncounter))
    setEditing(false)
    setSaveMessage('Encounter updated successfully.')
    setSaving(false)
  }

  if (organizationLoading) {
    return (
      <div className="page">
        <p className="eyebrow">CLINICAL ENCOUNTER</p>
        <h1>Loading organization context...</h1>
      </div>
    )
  }

  if (!activeOrganizationId) {
    return (
      <div className="page">
        <div className="account-card">
          <p className="eyebrow">CLINICAL ENCOUNTER</p>
          <h1>No active organization</h1>
          <p>An active organization is required.</p>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="page">
        <p className="eyebrow">CLINICAL ENCOUNTER</p>
        <h1>Loading encounter...</h1>
      </div>
    )
  }

  if (error && !encounter) {
    return (
      <div className="page">
        <div className="account-card">
          <p className="eyebrow">CLINICAL ENCOUNTER</p>
          <h1>Encounter unavailable</h1>
          <p>{error || 'The clinical encounter could not be found.'}</p>

          <button
            type="button"
            className="secondary-button"
            onClick={() => navigate(`/clinical/${patientId}`)}
          >
            Back to Patient Workspace
          </button>
        </div>
      </div>
    )
  }

  if (!encounter || !draft) {
    return null
  }

  const renderField = (
    field: {
      key: keyof DocumentationDraft
      label: string
    },
  ) => (
    <div className="form-field form-field-full" key={field.key}>
      <label htmlFor={`edit-${field.key}`}>
        {field.label}
      </label>

      <textarea
        id={`edit-${field.key}`}
        rows={4}
        value={draft[field.key]}
        onChange={(event) =>
          updateDraft(field.key, event.target.value)
        }
      />
    </div>
  )

  const historyFields = documentationFields.filter(
    (field) => field.section === 'history',
  )

  const ayurvedaFields = documentationFields.filter(
    (field) => field.section === 'ayurveda',
  )

  const modernFields = documentationFields.filter(
    (field) => field.section === 'modern',
  )

  const managementFields = documentationFields.filter(
    (field) => field.section === 'management',
  )

  return (
    <div className="page clinical-workspace-page">
      <div className="clinical-header">
        <p className="eyebrow">CLINICAL ENCOUNTER</p>
        <h1>{encounter.encounter_type} Visit</h1>
      </div>

      <div className="clinical-org-badge">
        <span>Active organization</span>
        <strong>
          {activeOrganization?.name ?? 'Current organization'}
        </strong>
      </div>

      {error && (
        <div className="nirvana-error" role="alert">
          {error}
        </div>
      )}

      {saveMessage && (
        <div className="nirvana-success" role="status">
          {saveMessage}
        </div>
      )}

      <section className="clinical-panel">
        <div className="clinical-section-header">
          <div>
            <p className="eyebrow">ENCOUNTER</p>
            <h2>Clinical encounter</h2>
          </div>

          <div className="clinical-actions">
            <NavLink
              to={`/clinical/${patientId}`}
              className="secondary-button"
            >
              Back to Patient
            </NavLink>

            {!editing && (
              <button
                type="button"
                className="primary-button"
                onClick={startEditing}
              >
                Edit Encounter
              </button>
            )}
          </div>
        </div>

        <div className="patient-detail-grid clinical-patient-grid">
          <div>
            <span>Encounter date & time</span>
            <strong>
              {new Date(encounter.encounter_date).toLocaleString("en-GB", {
                day: "2-digit",
                month: "2-digit",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </strong>
          </div>

          <div>
            <span>Saved at</span>
            <strong>
              {new Date(encounter.created_at).toLocaleString("en-GB", {
                day: "2-digit",
                month: "2-digit",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </strong>
          </div>

          <div>
            <span>Type</span>
            <strong>{encounter.encounter_type}</strong>
          </div>

          <div>
            <span>Status</span>
            <strong>{encounter.status}</strong>
          </div>

          <div>
            <span>Created by</span>
            <strong>{encounter.created_by.slice(0, 8)}</strong>
          </div>
        </div>
      </section>

      {editing ? (
        <>
          <section className="clinical-panel">
            <div className="clinical-section-header">
              <div>
                <p className="eyebrow">EDIT</p>
                <h2>Clinical history</h2>
              </div>
            </div>

            <div className="clinical-visit-form">
              {historyFields.map(renderField)}
            </div>
          </section>

          <section className="clinical-panel">
            <div className="clinical-section-header">
              <div>
                <p className="eyebrow">AYURVEDIC ASSESSMENT</p>
                <h2>Ayurvedic clinical assessment</h2>
              </div>
            </div>

            <div className="clinical-visit-form">
              <TerminologySelect
                label="Prakriti"
                setCode="ayurveda.prakriti"
                value={prakritiStructured}
                onChange={(values) => {
                  setPrakritiStructured(values)
                  updateDraft('prakriti', values.join(', '))
                }}
              />

              {renderField({
                key: 'vikriti',
                label: 'Vikriti',
              })}

              <TerminologySelect
                label="Dosha"
                setCode="ayurveda.dosha"
                value={doshaStructured}
                onChange={(values) => {
                  setDoshaStructured(values)
                  updateDraft('dosha', values.join(', '))
                }}
                multiple
              />

              <TerminologySelect
                label="Dushya"
                setCode="ayurveda.dushya"
                value={dushyaStructured}
                onChange={(values) => {
                  setDushyaStructured(values)
                  updateDraft('dushya', values.join(', '))
                }}
                multiple
              />

              <TerminologySelect
                label="Srotas"
                setCode="ayurveda.srotas"
                value={srotasStructured}
                onChange={(values) => {
                  setSrotasStructured(values)
                  updateDraft('srotas', values.join(', '))
                }}
                multiple
              />

              <TerminologySelect
                label="Agni"
                setCode="ayurveda.agni"
                value={agniStructured}
                onChange={(values) => {
                  setAgniStructured(values)
                  updateDraft('agni', values.join(', '))
                }}
              />

              <TerminologySelect
                label="Koshtha"
                setCode="ayurveda.koshtha"
                value={koshthaStructured}
                onChange={(values) => {
                  setKoshthaStructured(values)
                  updateDraft('koshtha', values.join(', '))
                }}
              />

              {renderField({ key: 'ama', label: 'Ama' })}
              {renderField({ key: 'nidana', label: 'Nidana' })}
              {renderField({ key: 'samprapti', label: 'Samprapti' })}
              {renderField({
                key: 'ayurvedic_diagnosis',
                label: 'Ayurvedic Diagnosis',
              })}
            </div>
          </section>

          <section className="clinical-panel">
            <div className="clinical-section-header">
              <div>
                <p className="eyebrow">MODERN ASSESSMENT</p>
                <h2>Assessment & investigations</h2>
              </div>
            </div>

            <div className="clinical-visit-form">
              {renderField({
                key: 'assessment',
                label: 'Assessment',
              })}

              <TerminologySelect
                label="Diagnosis"
                setCode="modern.diagnosis.common"
                value={diagnosisStructured}
                onChange={(values) => {
                  setDiagnosisStructured(values)
                  updateDraft('diagnosis', values.join(', '))
                }}
                onStructuredChange={setDiagnosisCodingMetadata}
                multiple
                allowCustom
                customValue={
                  diagnosisStructured.length === 0
                    ? draft.diagnosis
                    : ''
                }
                onCustomChange={(custom) =>
                  updateDraft('diagnosis', custom)
                }
                placeholder="Search and select diagnosis..."
              />

              <TerminologySelect
                label="Differential Diagnosis"
                setCode="modern.diagnosis.common"
                value={differentialDiagnosisStructured}
                onChange={(values) => {
                  setDifferentialDiagnosisStructured(values)
                  updateDraft(
                    'differential_diagnosis',
                    values.join(', '),
                  )
                }}
                onStructuredChange={
                  setDifferentialDiagnosisCodingMetadata
                }
                multiple
                allowCustom
                customValue={
                  differentialDiagnosisStructured.length === 0
                    ? draft.differential_diagnosis
                    : ''
                }
                onCustomChange={(custom) =>
                  updateDraft('differential_diagnosis', custom)
                }
                placeholder="Search and select differential diagnosis..."
              />

              <TerminologySelect
                label="Investigations"
                setCode="investigation.common"
                value={investigationsStructured}
                onChange={(values) => {
                  setInvestigationsStructured(values)
                  updateDraft('investigations', values.join(', '))
                }}
                multiple
                placeholder="Search and select investigations..."
              />

              <div className="form-field form-field-full">
                <label htmlFor="edit-investigations-details">
                  Investigation findings / details
                </label>
                <textarea
                  id="edit-investigations-details"
                  rows={4}
                  value={draft.investigations}
                  onChange={(event) =>
                    updateDraft('investigations', event.target.value)
                  }
                  placeholder="Optional findings, details or custom investigation..."
                />
              </div>
            </div>
          </section>

          <section className="clinical-panel">
            <div className="clinical-section-header">
              <div>
                <p className="eyebrow">MANAGEMENT</p>
                <h2>Treatment & follow-up</h2>
              </div>
            </div>

            <div className="clinical-visit-form">
              {managementFields.map(renderField)}
            </div>

            <div className="form-actions">
              <button
                type="button"
                className="secondary-button"
                onClick={cancelEditing}
                disabled={saving}
              >
                Cancel
              </button>

              <button
                type="button"
                className="primary-button"
                onClick={saveEncounter}
                disabled={saving}
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </section>
        </>
      ) : (
        <>
          <section className="clinical-panel">
            <div className="clinical-section-header">
              <div>
                <p className="eyebrow">CLINICAL DOCUMENTATION</p>
                <h2>Clinical history</h2>
              </div>
            </div>

            <div className="encounter-documentation-grid">
              {historyFields.map((field) => (
                <div className="account-card" key={field.key}>
                  <span>{field.label}</span>
                  <p>
                    {encounter[field.key] || 'Not recorded.'}
                  </p>
                </div>
              ))}
            </div>
          </section>

          <section className="clinical-panel">
            <div className="clinical-section-header">
              <div>
                <p className="eyebrow">AYURVEDIC ASSESSMENT</p>
                <h2>Ayurvedic clinical assessment</h2>
              </div>
            </div>

            <div className="encounter-documentation-grid">
              {ayurvedaFields.map((field) => (
                <div className="account-card" key={field.key}>
                  <span>{field.label}</span>
                  <p>
                    {encounter[field.key] || 'Not recorded.'}
                  </p>
                </div>
              ))}
            </div>
          </section>

          <section className="clinical-panel">
            <div className="clinical-section-header">
              <div>
                <p className="eyebrow">MODERN ASSESSMENT</p>
                <h2>Assessment & investigations</h2>
              </div>
            </div>

            <div className="encounter-documentation-grid">
              {modernFields.map((field) => (
                <div className="account-card" key={field.key}>
                  <span>{field.label}</span>
                  <p>
                    {encounter[field.key] || 'Not recorded.'}
                  </p>
                </div>
              ))}
            </div>
          </section>

          <section className="clinical-panel">
            <div className="clinical-section-header">
              <div>
                <p className="eyebrow">MANAGEMENT</p>
                <h2>Treatment & follow-up</h2>
              </div>
            </div>

            <div className="encounter-documentation-grid">
              {managementFields.map((field) => (
                <div className="account-card" key={field.key}>
                  <span>{field.label}</span>
                  <p>
                    {encounter[field.key] || 'Not recorded.'}
                  </p>
                </div>
              ))}
            </div>
          </section>
        </>
      )}

      <PrescriptionSection
        encounterId={encounter.id}
        patientId={encounter.patient_id}
        organizationId={activeOrganizationId}
      />

      <PrescriptionHistory
        patientId={encounter.patient_id}
        organizationId={activeOrganizationId!}
      />
    </div>
  )
}
