import { useEffect, useMemo, useState } from 'react'
import { NavLink } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useOrganization } from '../../context/OrganizationContext'

type Patient = {
  id: string
  patient_code: string
  full_name: string
  age_years: number
  sex: string
  mobile: string
}

type Appointment = {
  id: string
  patient_id: string
  scheduled_start: string
  scheduled_end: string
  appointment_type: string
  status: string
  reason: string
  notes: string
  patients:
    | {
        patient_code: string
        full_name: string
        mobile: string
      }[]
    | null
}

const appointmentTypes = [
  'OPD',
  'Follow-up',
  'Emergency',
  'Day Care',
  'Teleconsultation',
]

const appointmentStatuses = [
  'Scheduled',
  'Confirmed',
  'In Progress',
  'Completed',
  'Cancelled',
  'No-show',
]

function toLocalDateTimeValue(date: Date) {
  const offset = date.getTimezoneOffset()
  const local = new Date(date.getTime() - offset * 60000)
  return local.toISOString().slice(0, 16)
}

export default function AppointmentsPage() {

  const {
    activeOrganizationId,
    loading: organizationLoading,
    error: organizationError,
  } = useOrganization()

  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [patients, setPatients] = useState<Patient[]>([])
  const [patientSearch, setPatientSearch] = useState('')
  const [appointmentSearch, setAppointmentSearch] = useState("")
  const [appointmentTypeFilter, setAppointmentTypeFilter] = useState("All")
  const [appointmentStatusFilter, setAppointmentStatusFilter] = useState("All")
  const [selectedPatientId, setSelectedPatientId] = useState('')

  const [scheduledStart, setScheduledStart] = useState(
    toLocalDateTimeValue(new Date()),
  )
  const [scheduledEnd, setScheduledEnd] = useState(
    toLocalDateTimeValue(new Date(Date.now() + 30 * 60 * 1000)),
  )

  const [appointmentType, setAppointmentType] = useState('OPD')
  const [reason, setReason] = useState('')
  const [notes, setNotes] = useState('')

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [editingAppointmentId, setEditingAppointmentId] = useState<string | null>(null)
  const [error, setError] = useState('')

  async function loadAppointments() {
    if (!activeOrganizationId) return

    setLoading(true)
    setError('')

    const { data, error } = await supabase
      .from('appointments')
      .select(
        `
        id,
        patient_id,
        scheduled_start,
        scheduled_end,
        appointment_type,
        status,
        reason,
        notes,
        patients (
          patient_code,
          full_name,
          mobile
        )
      `,
      )
      .eq('organization_id', activeOrganizationId)
      .order('scheduled_start', { ascending: true })

    if (error) {
      setError(error.message)
    } else {
      setAppointments(data ?? [])
    }

    setLoading(false)
  }

  async function loadPatients() {
    if (!activeOrganizationId) return

    const { data, error } = await supabase
      .from('patients')
      .select(
        'id, patient_code, full_name, age_years, sex, mobile',
      )
      .eq('organization_id', activeOrganizationId)
      .eq('status', 'active')
      .order('full_name', { ascending: true })

    if (error) {
      setError(error.message)
    } else {
      setPatients((data ?? []) as Patient[])
    }
  }

  useEffect(() => {
    if (!activeOrganizationId) return

    void loadAppointments()
    void loadPatients()
  }, [activeOrganizationId])

  const filteredPatients = useMemo(() => {
    const query = patientSearch.trim().toLowerCase()

    if (!query) return patients.slice(0, 8)

    return patients
      .filter(
        (patient) =>
          patient.full_name.toLowerCase().includes(query) ||
          patient.patient_code.toLowerCase().includes(query) ||
          patient.mobile.toLowerCase().includes(query),
      )
      .slice(0, 8)
  }, [patients, patientSearch])

  const selectedPatient = patients.find(
    (patient) => patient.id === selectedPatientId,
  )

  const filteredAppointments = appointments.filter((appointment) => {
    const patient = Array.isArray(appointment.patients)
      ? appointment.patients[0]
      : appointment.patients
    const query = appointmentSearch.trim().toLowerCase()

    const matchesSearch =
      !query ||
      patient?.full_name?.toLowerCase().includes(query) ||
      patient?.patient_code?.toLowerCase().includes(query) ||
      patient?.mobile?.toLowerCase().includes(query) ||
      appointment.reason?.toLowerCase().includes(query)

    const matchesType =
      appointmentTypeFilter === "All" ||
      appointment.appointment_type === appointmentTypeFilter

    const matchesStatus =
      appointmentStatusFilter === "All" ||
      appointment.status === appointmentStatusFilter

    return matchesSearch && matchesType && matchesStatus
  })

function resetForm() {
    setPatientSearch('')
    setSelectedPatientId('')
    setScheduledStart(toLocalDateTimeValue(new Date()))
    setScheduledEnd(
      toLocalDateTimeValue(new Date(Date.now() + 30 * 60 * 1000)),
    )
    setAppointmentType('OPD')
    setReason('')
    setNotes('')
    setEditingAppointmentId(null)
  }

  function startEditingAppointment(appointment: Appointment) {
    setEditingAppointmentId(appointment.id)
    setSelectedPatientId(appointment.patient_id)

    const patient = Array.isArray(appointment.patients)
      ? appointment.patients[0]
      : appointment.patients

    setPatientSearch(
      patient?.full_name
        ? `${patient.patient_code} - ${patient.full_name}`
        : '',
    )

    setScheduledStart(
      toLocalDateTimeValue(new Date(appointment.scheduled_start)),
    )
    setScheduledEnd(
      toLocalDateTimeValue(new Date(appointment.scheduled_end)),
    )
    setAppointmentType(appointment.appointment_type)
    setReason(appointment.reason ?? '')
    setNotes(appointment.notes ?? '')
    setError('')
    setShowForm(true)

  window.setTimeout(() => {
    const form = document.getElementById("appointment-form")

    if (form) {
      form.scrollIntoView({
        behavior: "smooth",
        block: "start",
      })
    }
  }, 50)

    // Close the action menu after the edit form has opened.
    requestAnimationFrame(() => {
      document
        .querySelectorAll(".appointment-actions-menu[open]")
        .forEach((menu) => {
          (menu as HTMLDetailsElement).open = false
        })
    })
  }

  async function handleCreateAppointment(
    event: React.FormEvent,
  ) {
    event.preventDefault()
    setError('')

    if (!activeOrganizationId) {
      setError('No active organization is available.')
      return
    }

    if (!selectedPatientId) {
      setError('Please select a patient.')
      return
    }

    const start = new Date(scheduledStart)
    const end = new Date(scheduledEnd)

    if (
      Number.isNaN(start.getTime()) ||
      Number.isNaN(end.getTime())
    ) {
      setError('Please enter a valid appointment date and time.')
      return
    }

    if (end <= start) {
      setError('Appointment end time must be after start time.')
      return
    }

    setSaving(true)

  // Prevent overlapping appointments for the same patient.
  let overlapQuery = supabase
    .from('appointments')
    .select('id')
    .eq('organization_id', activeOrganizationId)
    .eq('patient_id', selectedPatientId)
    .in('status', ['Scheduled', 'Confirmed'])
    .lt('scheduled_start', end.toISOString())
    .gt('scheduled_end', start.toISOString())

  if (editingAppointmentId) {
    overlapQuery = overlapQuery.neq('id', editingAppointmentId)
  }

  const { data: overlappingAppointments, error: overlapError } =
    await overlapQuery

  if (overlapError) {
    setError(overlapError.message)
    setSaving(false)
    return
  }

  if (overlappingAppointments && overlappingAppointments.length > 0) {
    setError(
      'This patient already has another appointment overlapping this time.'
    )
    setSaving(false)
    return
  }


    const {
      data: userData,
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !userData.user) {
      setError(
        userError?.message ??
          'Unable to determine the authenticated user.',
      )
      setSaving(false)
      return
    }

    let saveError: { message: string } | null = null

    if (editingAppointmentId) {
      const { error: updateError } = await supabase
        .from('appointments')
        .update({
          patient_id: selectedPatientId,
          scheduled_start: start.toISOString(),
          scheduled_end: end.toISOString(),
          appointment_type: appointmentType,
          reason: reason.trim(),
          notes: notes.trim(),
        })
        .eq('id', editingAppointmentId)
        .eq('organization_id', activeOrganizationId)

      saveError = updateError
    } else {
      const { error: insertError } = await supabase
        .from('appointments')
        .insert({
          organization_id: activeOrganizationId,
          patient_id: selectedPatientId,
          created_by: userData.user.id,
          scheduled_start: start.toISOString(),
          scheduled_end: end.toISOString(),
          appointment_type: appointmentType,
          status: 'Scheduled',
          reason: reason.trim(),
          notes: notes.trim(),
        })

      saveError = insertError
    }

    if (saveError) {
      setError(saveError.message)
      setSaving(false)
      return
    }

    resetForm()
    setShowForm(false)
    setSaving(false)

    await loadAppointments()
  }

  async function cancelAppointment(appointmentId: string) {
    const confirmed = window.confirm(
      'Are you sure you want to cancel this appointment?'
    )

    if (!confirmed) return

    await updateStatus(appointmentId, 'Cancelled')
  }

  async function updateStatus(
    appointmentId: string,
    status: string,
  ) {
    setError('')

    const { error: updateError } = await supabase
      .from('appointments')
      .update({ status })
      .eq('id', appointmentId)

    if (updateError) {
      setError(updateError.message)
      return
    }

    await loadAppointments()
  }

  if (organizationLoading) {
    return (
      <main className="page">
        <div className="loading-page">
          Loading organization...
        </div>
      </main>
    )
  }

  return (
    <main className="page appointments-page">
      <div className="appointments-header">
        <div>
          <p className="eyebrow">SCHEDULING</p>
          <h1>Appointments</h1>
          <p className="page-description">
            Schedule and manage patient appointments.
          </p>
        </div>

        <button
          type="button"
          className="primary-button"
          onClick={() => {
            setError('')
            setShowForm((current) => !current)
          }}
          disabled={!activeOrganizationId}
        >
          {showForm ? 'Close' : '+ New Appointment'}
        </button>
      </div>

      {organizationError && (
        <div className="nirvana-error" role="alert">
          {organizationError}
        </div>
      )}

      {error && (
        <div className="nirvana-error" role="alert">
          {error}
        </div>
      )}

      {showForm && (
        <section id="appointment-form" className="appointments-form-card">
          <div className="module-header">
            <div>
              <p className="eyebrow">{editingAppointmentId ? 'EDIT APPOINTMENT' : 'NEW APPOINTMENT'}</p>
              <h2>{editingAppointmentId ? 'Edit appointment' : 'Schedule patient visit'}</h2>
            </div>
          </div>

          <form
            className="patient-form"
            onSubmit={handleCreateAppointment}
          >
            <label htmlFor="appointment-patient-search">
              Patient
            </label>

            <input
              id="appointment-patient-search"
              type="search"
              value={
                selectedPatient
                  ? `${selectedPatient.patient_code} — ${selectedPatient.full_name}`
                  : patientSearch
              }
              onChange={(event) => {
                setSelectedPatientId('')
                setPatientSearch(event.target.value)
              }}
              placeholder="Search by name, patient code or mobile"
              autoComplete="off"
            />

            {!selectedPatientId && patientSearch.trim() && (
              <div className="appointment-patient-results">
                {filteredPatients.length === 0 ? (
                  <p>No active patients found.</p>
                ) : (
                  filteredPatients.map((patient) => (
                    <button
                      key={patient.id}
                      type="button"
                      className="appointment-patient-result"
                      onClick={() => {
                        setSelectedPatientId(patient.id)
                        setPatientSearch('')
                      }}
                    >
                      <strong>{patient.full_name}</strong>
                      <span>
                        {patient.patient_code} · {patient.mobile}
                      </span>
                    </button>
                  ))
                )}
              </div>
            )}

            {selectedPatient && (
              <div className="appointment-selected-patient">
                <strong>{selectedPatient.full_name}</strong>
                <span>
                  {selectedPatient.patient_code} ·{' '}
                  {selectedPatient.age_years} years ·{' '}
                  {selectedPatient.sex}
                </span>

                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => {
                    setSelectedPatientId('')
                    setPatientSearch('')
                  }}
                >
                  Change patient
                </button>
              </div>
            )}

            <div className="form-grid">
              <div>
                <label htmlFor="appointment-start">
                  Start
                </label>
                <input
                  id="appointment-start"
                  type="datetime-local"
                  value={scheduledStart}
                  onChange={(event) =>
                    setScheduledStart(event.target.value)
                  }
                  required
                />
              </div>

              <div>
                <label htmlFor="appointment-end">
                  End
                </label>
                <input
                  id="appointment-end"
                  type="datetime-local"
                  value={scheduledEnd}
                  onChange={(event) =>
                    setScheduledEnd(event.target.value)
                  }
                  required
                />
              </div>

              <div>
                <label htmlFor="appointment-type">
                  Appointment type
                </label>
                <select
                  id="appointment-type"
                  value={appointmentType}
                  onChange={(event) =>
                    setAppointmentType(event.target.value)
                  }
                >
                  {appointmentTypes.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <label htmlFor="appointment-reason">
              Reason
            </label>
            <input
              id="appointment-reason"
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              placeholder="Reason for visit"
            />

            <label htmlFor="appointment-notes">
              Notes
            </label>
            <textarea
              id="appointment-notes"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              rows={4}
              placeholder="Additional scheduling notes"
            />

            <div className="form-actions">
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

              <button
                type="submit"
                className="primary-button"
                disabled={saving}
              >
                {saving ? 'Saving...' : editingAppointmentId ? 'Save Changes' : 'Create Appointment'}
              </button>
            </div>
          </form>
        </section>
      )}

      <section className="appointments-list-card">
        <div className="module-header">
          <div>
            <p className="eyebrow">SCHEDULE</p>
          </div>
        </div>

    <div className="appointment-filters">
      <input
        type="search"
        placeholder="Search patient, code, mobile or reason..."
        value={appointmentSearch}
        onChange={(event) => setAppointmentSearch(event.target.value)}
      />

      <select
        value={appointmentTypeFilter}
        onChange={(event) => setAppointmentTypeFilter(event.target.value)}
      >
        <option value="All">All Types</option>
        {appointmentTypes.map((type) => (
          <option key={type} value={type}>
            {type}
          </option>
        ))}
      </select>

      <select
        value={appointmentStatusFilter}
        onChange={(event) =>
          setAppointmentStatusFilter(event.target.value)
        }
      >
        <option value="All">All Statuses</option>
        {appointmentStatuses.map((status) => (
          <option key={status} value={status}>
            {status}
          </option>
        ))}
      </select>
    </div>

        {loading ? (
          <p>Loading appointments...</p>
        ) : filteredAppointments.length === 0 ? (
          <div className="empty-state">
            <h3>No appointments yet</h3>
            <p>
              Create the first appointment for this organization.
            </p>
          </div>
        ) : (
          <div className="appointments-list">
  {(() => {
    const grouped = new Map<string, Appointment[]>();

    [...filteredAppointments]
      .sort(
        (a, b) =>
          new Date(a.scheduled_start).getTime() -
          new Date(b.scheduled_start).getTime()
      )
      .forEach((appointment) => {
        const key = appointment.patient_id;
        const existing = grouped.get(key) ?? [];
        existing.push(appointment);
        grouped.set(key, existing);
      });

    let serialNumber = 0;

    return Array.from(grouped.entries()).map(
      ([patientId, patientAppointments]) => {
        const patientData = patientAppointments[0]?.patients
          const patient = Array.isArray(patientData)
            ? patientData[0]
            : patientData;

        return (
          <div className="patient-list-card" key={patientId}>
            <div className="patient-header">
              <div>
                <h3>{patient?.full_name ?? "Patient unavailable"}</h3>
                <p>
                  {patient?.patient_code ?? "-"} · {patient?.mobile ?? "-"}
                </p>
              </div>

              <strong>
                {patientAppointments.length}{" "}
                {patientAppointments.length === 1
                  ? "Appointment"
                  : "Appointments"}
              </strong>
            </div>

            <div className="patients-table-wrap">
              <table className="patients-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Date &amp; Time</th>
                    <th>Type</th>
                    <th>Reason</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>

                <tbody>
                  {patientAppointments.map((appointment) => {
                    serialNumber += 1;

                    return (
                      <tr key={appointment.id}>
                        <td>{serialNumber}</td>

                        <td>
                          <strong>
                            {new Date(
                              appointment.scheduled_start
                            ).toLocaleDateString("en-IN", {
                              day: "2-digit",
                              month: "short",
                              year: "numeric",
                            })}
                          </strong>
                          <br />
                          {new Date(
                            appointment.scheduled_start
                          ).toLocaleTimeString("en-IN", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                          {" – "}
                          {new Date(
                            appointment.scheduled_end
                          ).toLocaleTimeString("en-IN", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </td>

                        <td>
                          <span className="patient-status-badge">
                            {appointment.appointment_type}
                          </span>
                        </td>

                        <td>
                          {appointment.reason || "—"}
                        </td>

                        <td>
                          <span className="patient-status-badge">
                            {appointment.status}
                          </span>
                        </td>

                        <td>
                          <details
  className="appointment-actions-menu"
  onToggle={(event) => {
    const details = event.currentTarget;
    const summary = details.querySelector(
      "summary"
    ) as HTMLElement | null;
    const dropdown = details.querySelector(
      ".appointment-actions-dropdown"
    ) as HTMLElement | null;

    if (!details.open || !summary || !dropdown) {
      return;
    }

    // Close every other appointment action menu.
    document
      .querySelectorAll(".appointment-actions-menu[open]")
      .forEach((other) => {
        if (other !== details) {
          (other as HTMLDetailsElement).open = false;
        }
      });

    requestAnimationFrame(() => {
        const summary = details.querySelector(
          "summary"
        ) as HTMLElement | null;

        if (!summary) return;

        const trigger = summary.getBoundingClientRect();
        const dropdown = details.querySelector(
          ".appointment-actions-dropdown"
        ) as HTMLElement | null;

        if (!dropdown) return;

        dropdown.style.position = "fixed";
        dropdown.style.left = "auto";
        dropdown.style.right = "auto";
        dropdown.style.top = "auto";
        dropdown.style.bottom = "auto";

        const gap = 8;
        const padding = 12;

        // Space reserved for the fixed bottom navigation.
        const bottomNavigationSpace = 120;

        const menuWidth = Math.min(
          dropdown.offsetWidth || 220,
          window.innerWidth - padding * 2
        );

        const menuHeight = dropdown.offsetHeight;

        // Keep menu horizontally inside the tablet viewport.
        const left = Math.max(
          padding,
          Math.min(
            trigger.right - menuWidth,
            window.innerWidth - menuWidth - padding
          )
        );

        // Calculate usable space above and below the trigger.
        const spaceBelow =
          window.innerHeight -
          bottomNavigationSpace -
          padding -
          trigger.bottom -
          gap;

        const spaceAbove =
          trigger.top -
          padding -
          gap;

        let top: number;

        // Downward only if the complete menu fits.
        if (spaceBelow >= menuHeight) {
          top = trigger.bottom + gap;
        }

        // Otherwise open upward if the complete menu fits.
        else if (spaceAbove >= menuHeight) {
          top = trigger.top - menuHeight - gap;
        }

        // If neither side fully fits, use the side with more room.
        else if (spaceAbove > spaceBelow) {
          top = trigger.top - menuHeight - gap;
        } else {
          top = trigger.bottom + gap;
        }

        // Absolute safety boundary.
        const minTop = padding;
        const maxTop =
          window.innerHeight -
          bottomNavigationSpace -
          menuHeight -
          padding;

        top = Math.max(
          minTop,
          Math.min(top, maxTop)
        );

        dropdown.style.left = `${left}px`;
        dropdown.style.top = `${top}px`;
      });
  }}
>
                              <summary aria-label="Appointment actions">•••</summary>

                              <div className="appointment-actions-dropdown">            
              {appointment.status !== 'Cancelled' &&
                appointment.status !== 'Completed' &&
            appointment.status !== 'No-show' && (
                  <button
                    type="button"
                    className="secondary-button"
                    onClick={(event) => {
                      void cancelAppointment(appointment.id)
                      const details = event.currentTarget.closest('details')
                      if (details) {
                        details.open = false
                      }
                    }}
                  >
                    Cancel Appointment
                  </button>
                )}

{appointment.status !== 'Cancelled' &&
  appointment.status !== 'Completed' &&
  appointment.status !== 'No-show' && (
  <button
    type="button"
    className="secondary-button"
    onClick={() => startEditingAppointment(appointment)}
  >
    Edit Appointment
  </button>
)}
            {appointment.status !== 'Cancelled' &&
              appointment.status !== 'Completed' &&
              appointment.status !== 'No-show' && (
                <NavLink
                  to={`/clinical/${appointment.patient_id}?newVisit=true&appointmentId=${appointment.id}`}
                  className="secondary-button"
                >
                  Start Consultation
                </NavLink>
              )}


              


                                <NavLink
                                  to={`/patients/${appointment.patient_id}`}
                                  className="secondary-button"
                                >
                                  Patient
                                </NavLink>

                                {appointment.status !== 'Cancelled' &&
                                 appointment.status !== 'Completed' &&
                                 appointment.status !== 'No-show' && (
                                 <select
                                   value={appointment.status}
                                   onChange={(event) =>
                                     void updateStatus(
                                       appointment.id,
                                       event.target.value
                                     )
                                   }
                                 >
                                   {appointmentStatuses.map((status) => (
                                     <option key={status} value={status}>
                                       {status}
                                     </option>
                                   ))}
                                 </select>
                               )}
                              </div>
                            </details>
                          </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        );
      }
    );
  })()}
</div>
      )}
    <p className="appointments-order-note">
      Showing appointments in chronological order (oldest to newest)
    </p>
    </section>
    </main>
  )
}
