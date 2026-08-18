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

export default function PatientDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const [patient, setPatient] = useState<Patient | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
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

      <div className="development-note">
        <strong>NIRVANA Foundation V1</strong>
        <span>
          Clinical history, encounters, investigations and treatment records
          will be connected to this patient in the next development phase.
        </span>
      </div>
    </div>
  )
}
