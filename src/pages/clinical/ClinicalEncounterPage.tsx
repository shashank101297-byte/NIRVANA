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
  const [error, setError] = useState('')

  useEffect(() => {
    async function loadEncounter() {
      if (!activeOrganizationId || !patientId || !encounterId) {
        return
      }

      setLoading(true)
      setError('')

      const { data, error: encounterError } = await supabase
        .from('clinical_encounters')
        .select(
          `id, organization_id, patient_id, created_by, encounter_date, encounter_type, status, chief_complaint, created_at, updated_at,
       history_of_present_illness, past_history, personal_history, family_history,
       drug_allergy_history, examination, assessment, diagnosis, differential_diagnosis,
       investigations, treatment_plan, follow_up_advice,
       prakriti, vikriti, dosha, dushya, srotas, agni, koshtha, ama,
       nidana, samprapti, ayurvedic_diagnosis`
        )
        .eq('id', encounterId)
        .eq('patient_id', patientId)
        .eq('organization_id', activeOrganizationId)
        .single()

      if (encounterError) {
        setEncounter(null)
        setError(encounterError.message)
      } else {
        setEncounter(data as ClinicalEncounter)
      }

      setLoading(false)
    }

    void loadEncounter()
  }, [activeOrganizationId, patientId, encounterId])

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

  if (error || !encounter) {
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

  return (
    <div className="page clinical-workspace-page">
      <div className="clinical-header">
        <div>
          <p className="eyebrow">CLINICAL ENCOUNTER</p>
          <h1>{encounter.encounter_type} Visit</h1>
        </div>

        <div className="clinical-org-badge">
          <span>Active organization</span>
          <strong>{activeOrganization?.name ?? 'Current organization'}</strong>
        </div>
      </div>

      <section className="clinical-panel">
        <div className="clinical-section-header">
          <div>
            <p className="eyebrow">ENCOUNTER</p>
            <h2>Clinical encounter</h2>
          </div>

          <NavLink
            to={`/clinical/${patientId}`}
            className="secondary-button"
          >
            Back to Patient
          </NavLink>
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

      <section className="clinical-panel">
      <div className="clinical-section-header">
        <div>
          <p className="eyebrow">CLINICAL DOCUMENTATION</p>
          <h2>Clinical history</h2>
        </div>
      </div>

      <div className="encounter-documentation-grid">
        <div className="account-card">
          <span>Chief Complaint</span>
          <p>{encounter.chief_complaint || 'Not recorded.'}</p>
        </div>

        <div className="account-card">
          <span>History of Present Illness</span>
          <p>{encounter.history_of_present_illness || 'Not recorded.'}</p>
        </div>

        <div className="account-card">
          <span>Past History</span>
          <p>{encounter.past_history || 'Not recorded.'}</p>
        </div>

        <div className="account-card">
          <span>Personal History</span>
          <p>{encounter.personal_history || 'Not recorded.'}</p>
        </div>

        <div className="account-card">
          <span>Family History</span>
          <p>{encounter.family_history || 'Not recorded.'}</p>
        </div>

        <div className="account-card">
          <span>Drug / Allergy History</span>
          <p>{encounter.drug_allergy_history || 'Not recorded.'}</p>
        </div>

        <div className="account-card">
          <span>Examination</span>
          <p>{encounter.examination || 'Not recorded.'}</p>
        </div>
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
        <div className="account-card">
          <span>Prakriti</span>
          <p>{encounter.prakriti || 'Not recorded.'}</p>
        </div>

        <div className="account-card">
          <span>Vikriti</span>
          <p>{encounter.vikriti || 'Not recorded.'}</p>
        </div>

        <div className="account-card">
          <span>Dosha</span>
          <p>{encounter.dosha || 'Not recorded.'}</p>
        </div>

        <div className="account-card">
          <span>Dushya</span>
          <p>{encounter.dushya || 'Not recorded.'}</p>
        </div>

        <div className="account-card">
          <span>Srotas</span>
          <p>{encounter.srotas || 'Not recorded.'}</p>
        </div>

        <div className="account-card">
          <span>Agni</span>
          <p>{encounter.agni || 'Not recorded.'}</p>
        </div>

        <div className="account-card">
          <span>Koshtha</span>
          <p>{encounter.koshtha || 'Not recorded.'}</p>
        </div>

        <div className="account-card">
          <span>Ama</span>
          <p>{encounter.ama || 'Not recorded.'}</p>
        </div>

        <div className="account-card">
          <span>Nidana</span>
          <p>{encounter.nidana || 'Not recorded.'}</p>
        </div>

        <div className="account-card">
          <span>Samprapti</span>
          <p>{encounter.samprapti || 'Not recorded.'}</p>
        </div>

        <div className="account-card">
          <span>Ayurvedic Diagnosis</span>
          <p>{encounter.ayurvedic_diagnosis || 'Not recorded.'}</p>
        </div>
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
        <div className="account-card">
          <span>Assessment</span>
          <p>{encounter.assessment || 'Not recorded.'}</p>
        </div>

        <div className="account-card">
          <span>Diagnosis</span>
          <p>{encounter.diagnosis || 'Not recorded.'}</p>
        </div>

        <div className="account-card">
          <span>Differential Diagnosis</span>
          <p>{encounter.differential_diagnosis || 'Not recorded.'}</p>
        </div>

        <div className="account-card">
          <span>Investigations</span>
          <p>{encounter.investigations || 'Not recorded.'}</p>
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

      <div className="encounter-documentation-grid">
        <div className="account-card">
          <span>Treatment / Plan</span>
          <p>{encounter.treatment_plan || 'Not recorded.'}</p>
        </div>

        <div className="account-card">
          <span>Follow-up Advice</span>
          <p>{encounter.follow_up_advice || 'Not recorded.'}</p>
        </div>
      </div>
    </section>
    </div>
  )
}
