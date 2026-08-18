import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { NavLink } from 'react-router-dom'

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

type ActiveOrganization = {
  id: string
  name: string
  code: string
  status: string
}

export default function PatientsPage() {
  const [patients, setPatients] = useState<Patient[]>([])
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [activeOrganization, setActiveOrganization] = useState<ActiveOrganization | null>(null)

  const [name, setName] = useState('')
  const [age, setAge] = useState('')
  const [sex, setSex] = useState('')
  const [mobile, setMobile] = useState('')
  const [address, setAddress] = useState('')
  const [city, setCity] = useState('')
  const [district, setDistrict] = useState('')
  const [state, setState] = useState('')
  const [pincode, setPincode] = useState('')

  async function loadPatients() {
    setLoading(true)
    setError('')

    const { data, error } = await supabase
      .from('patients')
      .select(
        'id, patient_code, full_name, age_years, sex, mobile, address, city, district, state, pincode, status, created_at',
      )
      .eq('status', 'active')
      .order('created_at', { ascending: false })

    if (error) {
      setError(error.message)
    } else {
      setPatients((data ?? []) as Patient[])
    }

    setLoading(false)
  }

  async function loadActiveOrganization() {
    const { data: userData, error: userError } = await supabase.auth.getUser()

    if (userError || !userData.user) {
      setActiveOrganization(null)
      setError(userError?.message ?? 'Unable to determine the authenticated user.')
      return null
    }

    const { data, error } = await supabase
      .from('organization_memberships')
      .select('organization_id, organizations(id, name, code, status)')
      .eq('user_id', userData.user.id)
      .eq('status', 'active')
      .maybeSingle()

    if (error) {
      setActiveOrganization(null)
      setError(error.message)
      return null
    }

    const organization = data?.organizations as ActiveOrganization | null | undefined

    if (!organization) {
      setActiveOrganization(null)
      setError('No active organization is assigned to your account.')
      return null
    }

    setActiveOrganization(organization)
    return { user: userData.user, organization }
  }

  useEffect(() => {
    void loadPatients()
    void loadActiveOrganization()
  }, [])

  const filteredPatients = useMemo(() => {
    const query = search.trim().toLowerCase()

    return patients.filter(
      (patient) =>
        patient.status === 'active' &&
        (
          !query ||
          patient.full_name.toLowerCase().includes(query) ||
          patient.patient_code.toLowerCase().includes(query) ||
          patient.mobile.includes(query)
        ),
    )
  }, [patients, search])

  function resetForm() {
    setName('')
    setAge('')
    setSex('')
    setMobile('')
    setAddress('')
    setCity('')
    setDistrict('')
    setState('')
    setPincode('')
  }

  async function handleAddPatient(event: React.FormEvent) {
    event.preventDefault()

    setError('')

    if (
      !name.trim() ||
      !age.trim() ||
      !sex ||
      !mobile.trim() ||
      !address.trim() ||
      !city.trim() ||
      !district.trim() ||
      !state.trim() ||
      !pincode.trim()
    ) {
      setError('Please complete all patient registration fields.')
      return
    }

    if (!/^[0-9]{6}$/.test(pincode.trim())) {
      setError('PIN code must contain exactly 6 digits.')
      return
    }

    const organizationResult = await loadActiveOrganization()

    if (!organizationResult) {
      setSaving(false)
      return
    }

    const { user, organization } = organizationResult

    setSaving(true)

    const { data, error } = await supabase
      .from('patients')
      .insert({
        full_name: name.trim(),
        age_years: Number(age),
        sex,
        mobile: mobile.trim(),
        address: address.trim(),
        city: city.trim(),
        district: district.trim(),
        state: state.trim(),
        pincode: pincode.trim(),
        organization_id: organization.id,
        created_by: user.id,
      })
      .select(
        'id, patient_code, full_name, age_years, sex, mobile, address, city, district, state, pincode, status, created_at',
      )
      .single()

    if (error) {
      setError(error.message)
      setSaving(false)
      return
    }

    setPatients((current) => [data as Patient, ...current])
    resetForm()
    setShowForm(false)
    setSaving(false)
  }

  return (
    <div className="page patients-page">
      <div className="patients-header">
        <div>
          <p className="eyebrow">PATIENT MANAGEMENT</p>
          <h1>Patients</h1>
          <p className="page-description">
            Secure patient registry and clinical record workspace.
          </p>
        </div>

        <button
          type="button"
          className="primary-button"
          disabled={!activeOrganization}
          onClick={async () => {
            setError('')

            const organizationResult = await loadActiveOrganization()

            if (!organizationResult) {
              setShowForm(false)
              return
            }

            setShowForm(true)
          }}
        >
          + Add Patient
        </button>
      <NavLink
        to="/patients/archived"
        className="secondary-button"
      >
        📁 Archived Patients
      </NavLink>
      </div>

      {error && (
        <div className="nirvana-error" role="alert">
          {error}
        </div>
      )}

      <section className="patient-toolbar">
        <div className="patient-search">
          <label htmlFor="patient-search">Search patients</label>
          <input
            id="patient-search"
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search by name, patient ID or mobile"
          />
        </div>

        <div className="patient-count">
          <span>Total patients</span>
          <strong>{patients.length}</strong>
        </div>
      </section>

      {showForm && (
        <section className="patient-form-card">
          <div className="section-heading">
            <div>
              <p className="eyebrow">NEW RECORD</p>
              <h2>Add New Patient</h2>
            </div>

            <button
              type="button"
              className="secondary-button"
              onClick={() => {
                resetForm()
                setShowForm(false)
              }}
            >
              Cancel
            </button>
          </div>

          <form onSubmit={handleAddPatient} className="patient-form">
            <div className="form-field">
              <label htmlFor="patient-name">Full name</label>
              <input
                id="patient-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Enter patient name"
                required
              />
            </div>

            <div className="form-field">
              <label htmlFor="patient-age">Age</label>
              <input
                id="patient-age"
                type="number"
                min="0"
                max="120"
                value={age}
                onChange={(event) => setAge(event.target.value)}
                placeholder="Age"
                required
              />
            </div>

            <div className="form-field">
              <label htmlFor="patient-sex">Sex</label>
              <select
                id="patient-sex"
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
              <label htmlFor="patient-mobile">Mobile</label>
              <input
                id="patient-mobile"
                type="tel"
                value={mobile}
                onChange={(event) => setMobile(event.target.value)}
                placeholder="10-digit mobile number"
                required
              />
            </div>

            <div className="form-field form-field-wide">
              <label htmlFor="patient-address">Full Address</label>
              <textarea
                id="patient-address"
                value={address}
                onChange={(event) => setAddress(event.target.value)}
                placeholder="House/Flat No., Street, Area"
                rows={3}
                required
              />
            </div>

            <div className="form-field">
              <label htmlFor="patient-city">City / Village</label>
              <input
                id="patient-city"
                value={city}
                onChange={(event) => setCity(event.target.value)}
                placeholder="City or village"
                required
              />
            </div>

            <div className="form-field">
              <label htmlFor="patient-district">District</label>
              <input
                id="patient-district"
                value={district}
                onChange={(event) => setDistrict(event.target.value)}
                placeholder="District"
                required
              />
            </div>

            <div className="form-field">
              <label htmlFor="patient-state">State</label>
              <input
                id="patient-state"
                value={state}
                onChange={(event) => setState(event.target.value)}
                placeholder="State"
                required
              />
            </div>

            <div className="form-field">
              <label htmlFor="patient-pincode">PIN Code</label>
              <input
                id="patient-pincode"
                inputMode="numeric"
                value={pincode}
                onChange={(event) => setPincode(event.target.value)}
                placeholder="6-digit PIN code"
                maxLength={6}
                required
              />
            </div>

            <div className="form-actions">
              <button
                type="submit"
                className="primary-button"
                disabled={saving}
              >
                {saving ? 'Saving...' : 'Create Patient'}
              </button>
            </div>
          </form>
        </section>
      )}

      <section className="patients-list-card">
        <div className="section-heading">
          <div>
            <p className="eyebrow">REGISTRY</p>
            <h2>Patient Records</h2>
          </div>
        </div>

        {loading ? (
          <div className="empty-patients">
            <h3>Loading patient records...</h3>
          </div>
        ) : filteredPatients.length === 0 ? (
          <div className="empty-patients">
            <div className="empty-icon">👤</div>
            <h3>No patient records yet</h3>
            <p>
              Add a patient to begin building the registry.
            </p>
            <button
              type="button"
              className="primary-button"
              onClick={() => setShowForm(true)}
            >
              + Add First Patient
            </button>
          </div>
        ) : (
          <div className="patients-table-wrap">
            <table className="patients-table">
              <thead>
                <tr>
                  <th>Patient ID</th>
                  <th>Name</th>
                  <th>Age</th>
                  <th>Sex</th>
                  <th>Mobile</th>
                  <th>Location</th>
                  <th>Created</th>
                </tr>
              </thead>

              <tbody>
                {filteredPatients.map((patient) => (
                  <tr key={patient.id}>
                    <td>
                      <NavLink to={`/patients/${patient.id}`}><strong>{patient.patient_code}</strong></NavLink>
                    </td>
                    <td>{patient.full_name}</td>
                    <td>{patient.age_years}</td>
                    <td>{patient.sex}</td>
                    <td>{patient.mobile}</td>
                    <td>
                      {patient.city}, {patient.district}
                    </td>
                    <td>
                      {new Date(patient.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <div className="development-note">
        <strong>NIRVANA Foundation V1</strong>
        <span>
          Patient records are now stored in the protected Supabase database.
        </span>
      </div>
    </div>
  )
}
