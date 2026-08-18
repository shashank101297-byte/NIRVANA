import { useEffect, useMemo, useState } from 'react'
import { NavLink } from 'react-router-dom'
import { supabase } from '../../lib/supabase'

type Patient = {
  id: string
  patient_code: string
  full_name: string
  age_years: number
  sex: string
  mobile: string
  city: string
  district: string
  status: string
  created_at: string
}

export default function ArchivedPatientsPage() {
  const [patients, setPatients] = useState<Patient[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  async function loadArchivedPatients() {
    setLoading(true)
    setError('')

    const { data, error } = await supabase
      .from('patients')
      .select(
        'id, patient_code, full_name, age_years, sex, mobile, city, district, status, created_at'
      )
      .eq('status', 'inactive')
      .order('created_at', { ascending: false })

    if (error) {
      setError(error.message)
    } else {
      setPatients((data ?? []) as Patient[])
    }

    setLoading(false)
  }

  useEffect(() => {
    loadArchivedPatients()
  }, [])

  const filteredPatients = useMemo(() => {
    const query = search.trim().toLowerCase()

    if (!query) return patients

    return patients.filter(
      (patient) =>
        patient.full_name.toLowerCase().includes(query) ||
        patient.patient_code.toLowerCase().includes(query) ||
        patient.mobile.includes(query)
    )
  }, [patients, search])

  return (
    <div className="page patients-page">
      <div className="patients-header">
        <div>
          <p className="eyebrow">PATIENT MANAGEMENT</p>
          <h1>Archived Patients</h1>
          <p className="page-description">
            Previously registered patients who are currently inactive.
          </p>
        </div>

        <NavLink to="/patients" className="secondary-button">
          ← Back to Active Patients
        </NavLink>
      </div>

      {error && (
        <div className="nirvana-error" role="alert">
          {error}
        </div>
      )}

      <section className="patient-toolbar">
        <div className="patient-search">
          <label htmlFor="archived-patient-search">
            Search archived patients
          </label>

          <input
            id="archived-patient-search"
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search by name, patient ID or mobile"
          />
        </div>

        <div className="patient-count">
          <span>Archived patients</span>
          <strong>{patients.length}</strong>
        </div>
      </section>

      {loading ? (
        <div className="empty-patients">
          <h3>Loading archived patients...</h3>
        </div>
      ) : filteredPatients.length === 0 ? (
        <div className="empty-patients">
          <div className="empty-icon">📁</div>
          <h3>No archived patients</h3>
          <p>Patients that are archived will appear here.</p>
        </div>
      ) : (
        <section className="patients-list-card">
          <div className="section-heading">
            <div>
              <p className="eyebrow">ARCHIVE</p>
              <h2>Archived Patient Records</h2>
            </div>
          </div>

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
                  <th>Archived</th>
                </tr>
              </thead>

              <tbody>
                {filteredPatients.map((patient) => (
                  <tr key={patient.id}>
                    <td>
                      <NavLink to={`/patients/${patient.id}`}>
                        <strong>{patient.patient_code}</strong>
                      </NavLink>
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
        </section>
      )}
    </div>
  )
}
