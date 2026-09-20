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

  function startEditing() {
    if (!encounter) return

    setDraft(createDraft(encounter))
    setSaveMessage('')
    setError('')
    setEditing(true)
  }

  function cancelEditing() {
    if (encounter) {
      setDraft(createDraft(encounter))
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

        assessment: draft.assessment.trim(),
        diagnosis: draft.diagnosis.trim(),
        differential_diagnosis: draft.differential_diagnosis.trim(),
        investigations: draft.investigations.trim(),

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
            <span>Encounter date</span>
            <strong>
              {new Date(encounter.encounter_date).toLocaleDateString()}
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
              {ayurvedaFields.map(renderField)}
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
              {modernFields.map(renderField)}
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
    </div>
  )
}
