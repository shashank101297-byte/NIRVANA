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
}

export default function EditPatientPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const [patient, setPatient] = useState<Patient | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const [name, setName] = useState('')
  const [age, setAge] = useState('')
  const [sex, setSex] = useState('')
  const [mobile, setMobile] = useState('')
  const [address, setAddress] = useState('')
  const [city, setCity] = useState('')
  const [district, setDistrict] = useState('')
  const [state, setState] = useState('')
  const [pincode, setPincode] = useState('')
  const [status, setStatus] = useState('Active')

  useEffect(() => {
    async function loadPatient() {
      if (!id) {
        setError('Patient ID is missing.')
        setLoading(false)
        return
      }

      const { data, error } = await supabase
        .from('patients')
        .select(
          'id, patient_code, full_name, age_years, sex, mobile, address, city, district, state, pincode, status'
        )
        .eq('id', id)
        .single()

      if (error) {
        setError(error.message)
        setLoading(false)
        return
      }

      setPatient(data)
        if (data.status === "inactive") {
          navigate(`/patients/${id}`)
          return
        }
      setName(data.full_name ?? '')
      setAge(String(data.age_years ?? ''))
      setSex(data.sex ?? '')
      setMobile(data.mobile ?? '')
      setAddress(data.address ?? '')
      setCity(data.city ?? '')
      setDistrict(data.district ?? '')
      setState(data.state ?? '')
      setPincode(data.pincode ?? '')
      setStatus(data.status ?? 'Active')
      setLoading(false)
    }

    loadPatient()
  }, [id])

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()

    if (!id) {
      setError('Patient ID is missing.')
      return
    }

    setError('')
    setSuccess('')

    const trimmedName = name.trim()
    const numericAge = Number(age)
    const cleanMobile = mobile.trim()
    const cleanPincode = pincode.trim()

    if (!trimmedName) {
      setError('Patient name is required.')
      return
    }

    if (!Number.isInteger(numericAge) || numericAge < 0 || numericAge > 150) {
      setError('Enter a valid age between 0 and 150.')
      return
    }

    if (!/^[0-9]{10}$/.test(cleanMobile)) {
      setError('Mobile number must contain exactly 10 digits.')
      return
    }

    if (cleanPincode && !/^[0-9]{6}$/.test(cleanPincode)) {
      setError('Pincode must contain exactly 6 digits.')
      return
    }

    setSaving(true)

    const { error } = await supabase
      .from('patients')
      .update({
        full_name: trimmedName,
        age_years: numericAge,
        sex,
        mobile: cleanMobile,
        address: address.trim(),
        city: city.trim(),
        district: district.trim(),
        state: state.trim(),
        pincode: cleanPincode,
        status,
      })
      .eq('id', id)

    if (error) {
      setError(error.message)
      setSaving(false)
      return
    }

    setSuccess('Patient record updated successfully.')
    setSaving(false)

    setTimeout(() => {
      navigate(`/patients/${id}`)
    }, 700)
  }

  if (loading) {
    return (
      <div className="page">
        <p>Loading patient record...</p>
      </div>
    )
  }

  if (error && !patient) {
    return (
      <div className="page">
        <p className="eyebrow">PATIENT MANAGEMENT</p>
        <h1>Edit Patient</h1>

        <div className="nirvana-error" role="alert">
          {error}
        </div>

        <NavLink to="/patients">← Back to Patients</NavLink>
      </div>
    )
  }

  if (!patient) {
    return null
  }

  return (
    <div className="page">
      <NavLink to={`/patients/${patient.id}`}>
        ← Back to Patient
      </NavLink>

      <div className="module-header">
        <div>
          <p className="eyebrow">PATIENT MANAGEMENT</p>
          <h1>Edit Patient</h1>
          <p>{patient.patient_code}</p>
        </div>
      </div>

      <section className="account-card">
        <div className="edit-patient-header">
          <div>
            <h2>Patient Information</h2>
            <p>Update the patient's demographic and contact information.</p>
          </div>

          <div className="patient-code-badge">
            {patient.patient_code}
          </div>
        </div>

        {error && (
          <div className="nirvana-error" role="alert">
            {error}
          </div>
        )}

        {success && (
          <div className="nirvana-success" role="status">
            {success}
          </div>
        )}

        <form className="patient-edit-form" onSubmit={handleSubmit}>
          <div className="form-field">
            <label htmlFor="edit-name">Full name</label>
            <input
              id="edit-name"
              type="text"
              value={name}
              onChange={(event) => setName(event.target.value)}
              required
            />
          </div>

          <div className="form-field">
            <label htmlFor="edit-age">Age</label>
            <input
              id="edit-age"
              type="number"
              min="0"
              max="150"
              value={age}
              onChange={(event) => setAge(event.target.value)}
              required
            />
          </div>

          <div className="form-field">
            <label htmlFor="edit-sex">Sex</label>
            <select
              id="edit-sex"
              value={sex}
              onChange={(event) => setSex(event.target.value)}
              required
            >
              <option value="">Select</option>
              <option value="Female">Female</option>
              <option value="Male">Male</option>
              <option value="Other">Other</option>
            </select>
          </div>

          <div className="form-field">
            <label htmlFor="edit-mobile">Mobile</label>
            <input
              id="edit-mobile"
              type="tel"
              inputMode="numeric"
              maxLength={10}
              value={mobile}
              onChange={(event) =>
                setMobile(event.target.value.replace(/\D/g, ''))
              }
              required
            />
          </div>

          <div className="form-field form-field-full">
            <label htmlFor="edit-address">Address</label>
            <input
              id="edit-address"
              type="text"
              value={address}
              onChange={(event) => setAddress(event.target.value)}
            />
          </div>

          <div className="form-field">
            <label htmlFor="edit-city">City</label>
            <input
              id="edit-city"
              type="text"
              value={city}
              onChange={(event) => setCity(event.target.value)}
            />
          </div>

          <div className="form-field">
            <label htmlFor="edit-district">District</label>
            <input
              id="edit-district"
              type="text"
              value={district}
              onChange={(event) => setDistrict(event.target.value)}
            />
          </div>

          <div className="form-field">
            <label htmlFor="edit-state">State</label>
            <input
              id="edit-state"
              type="text"
              value={state}
              onChange={(event) => setState(event.target.value)}
            />
          </div>

          <div className="form-field">
            <label htmlFor="edit-pincode">Pincode</label>
            <input
              id="edit-pincode"
              type="text"
              inputMode="numeric"
              maxLength={6}
              value={pincode}
              onChange={(event) =>
                setPincode(event.target.value.replace(/\D/g, ''))
              }
            />
          </div>

          <div className="form-field">
            <label htmlFor="edit-status">Status</label>
            <select
              id="edit-status"
              value={status}
              onChange={(event) => setStatus(event.target.value)}
            >
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>
          </div>

          <div className="edit-form-actions">
            <NavLink
              to={`/patients/${patient.id}`}
              className="secondary-button"
            >
              Cancel
            </NavLink>

            <button type="submit" disabled={saving}>
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </section>

      <div className="development-note">
        <strong>Security boundary</strong>
        <span>
          Patient updates are submitted through Supabase and remain subject
          to the database Row Level Security policies.
        </span>
      </div>
    </div>
  )
}
