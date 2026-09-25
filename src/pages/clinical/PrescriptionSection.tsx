import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'

type Item = {
  therapy_system: 'Ayurvedic' | 'Modern'
  medicine_name: string
  formulation: string
  strength: string
  dose: string
  route: string
  frequency: string
  timing: string
  duration_value: string
  duration_unit: 'Days' | 'Weeks' | 'Months'
  quantity: string
  anupana: string
  instructions: string
}

const emptyItem: Item = {
  therapy_system: 'Ayurvedic',
  medicine_name: '',
  formulation: '',
  strength: '',
  dose: '',
  route: 'Oral',
  frequency: '',
  timing: '',
  duration_value: '',
  duration_unit: 'Days',
  quantity: '',
  anupana: '',
  instructions: '',
}

type Props = {
  encounterId: string
  patientId: string
  organizationId: string
}

export default function PrescriptionSection({
  encounterId,
  patientId,
  organizationId,
}: Props) {
  const [items, setItems] = useState<Item[]>([{ ...emptyItem }])
  const [notes, setNotes] = useState('')
  const [prescriptionId, setPrescriptionId] = useState<string | null>(null)
  const [status, setStatus] = useState<'Active' | 'Cancelled' | null>(null)
  const [editing, setEditing] = useState(false)
  const [changeReason, setChangeReason] = useState('')
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  async function loadPrescription() {
    setLoading(true)
    setError('')

    const { data, error: prescriptionError } = await supabase
      .from('prescriptions')
      .select('id, status, notes')
      .eq('encounter_id', encounterId)
      .eq('patient_id', patientId)
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (prescriptionError) {
      setError(prescriptionError.message)
      setLoading(false)
      return
    }

    if (!data) {
      setPrescriptionId(null)
      setStatus(null)
      setNotes('')
      setItems([{ ...emptyItem }])
      setLoading(false)
      return
    }

    const { data: itemData, error: itemError } = await supabase
      .from('prescription_items')
      .select(
        'therapy_system, medicine_name, formulation, strength, dose, route, frequency, timing, duration_value, duration_unit, quantity, anupana, instructions',
      )
      .eq('prescription_id', data.id)
      .order('line_no', { ascending: true })

    if (itemError) {
      setError(itemError.message)
      setLoading(false)
      return
    }

    setPrescriptionId(data.id)
    setStatus(data.status)
    setNotes(data.notes ?? '')

    setItems(
      itemData?.length
        ? itemData.map((item) => ({
            ...item,
            duration_value:
              item.duration_value === null
                ? ''
                : String(item.duration_value),
          })) as Item[]
        : [{ ...emptyItem }],
    )

    setLoading(false)
  }

  useEffect(() => {
    void loadPrescription()
  }, [encounterId, patientId, organizationId])

  function updateItem(
    index: number,
    field: keyof Item,
    value: string,
  ) {
    setItems((current) =>
      current.map((item, itemIndex) =>
        itemIndex === index
          ? { ...item, [field]: value }
          : item,
      ),
    )
  }

  function addItem() {
    setItems((current) => [...current, { ...emptyItem }])
  }

  function removeItem(index: number) {
    setItems((current) =>
      current.filter((_, itemIndex) => itemIndex !== index),
    )
  }

  async function savePrescription() {
    const validItems = items.filter(
      (item) => item.medicine_name.trim() !== '',
    )

    if (!validItems.length) {
      setError('Add at least one medicine.')
      return
    }

    if (prescriptionId && !changeReason.trim()) {
      setError('Enter the reason for modifying the treatment.')
      return
    }

    setSaving(true)
    setError('')
    setMessage('')

    const { error: transactionError } = await supabase.rpc(
      'create_prescription_transaction',
      {
        p_organization_id: organizationId,
        p_patient_id: patientId,
        p_encounter_id: encounterId,
        p_notes: notes.trim(),
        p_change_reason: changeReason.trim(),
        p_supersedes_prescription_id: prescriptionId,
        p_items: validItems.map((item) => ({
          therapy_system: item.therapy_system,
          medicine_name: item.medicine_name.trim(),
          formulation: item.formulation.trim(),
          strength: item.strength.trim(),
          dose: item.dose.trim(),
          route: item.route.trim(),
          frequency: item.frequency.trim(),
          timing: item.timing.trim(),
          duration_value:
            item.duration_value === ''
              ? null
              : Number(item.duration_value),
          duration_unit: item.duration_unit,
          quantity: item.quantity.trim(),
          anupana: item.anupana.trim(),
          instructions: item.instructions.trim(),
        })),
      },
    )

    if (transactionError) {
      setError(
        `Prescription could not be saved: ${transactionError.message}`,
      )
      setSaving(false)
      return
    }

    setEditing(false)
    setChangeReason('')

    setMessage(
      prescriptionId
        ? 'Prescription updated successfully.'
        : 'Prescription saved successfully.',
    )

    window.dispatchEvent(
      new CustomEvent('nirvana:prescription-updated', {
        detail: {
          prescriptionId: prescriptionId ?? null,
          encounterId,
        },
      }),
    )

    setSaving(false)
    await loadPrescription()
  }

  async function cancelPrescription() {
    if (!prescriptionId) return

    setSaving(true)
    setError('')

    const { error: updateError } = await supabase
      .from('prescriptions')
      .update({
        status: 'Cancelled',
        updated_at: new Date().toISOString(),
      })
      .eq('id', prescriptionId)
      .eq('organization_id', organizationId)

    if (updateError) {
      setError(updateError.message)
    } else {
      setStatus('Cancelled')
      setMessage('Prescription cancelled.')
    }

    setSaving(false)
  }

  if (loading) {
    return (
      <section className="clinical-panel">
        <p className="eyebrow">PRESCRIPTION</p>
        <h2>Loading prescription...</h2>
      </section>
    )
  }

  return (
    <section className="clinical-panel">
      <div className="clinical-section-header">
        <div>
          <p className="eyebrow">PRESCRIPTION</p>
          <h2>Structured Prescription</h2>
        </div>

        {!editing && status === 'Active' && (
          <div className="clinical-actions">
            <button
              type="button"
              className="secondary-button"
              onClick={() => setEditing(true)}
            >
              Create New / Modify Treatment
            </button>

            <button
              type="button"
              className="secondary-button"
              disabled={saving}
              onClick={() => void cancelPrescription()}
            >
              Cancel Prescription
            </button>
          </div>
        )}

        {!editing && !prescriptionId && (
          <button
            type="button"
            className="primary-button"
            onClick={() => setEditing(true)}
          >
            + Add Prescription
          </button>
        )}
      </div>

      {error && (
        <div className="nirvana-error" role="alert">
          {error}
        </div>
      )}

      {message && (
        <div className="nirvana-success" role="status">
          {message}
        </div>
      )}

      {!editing && prescriptionId ? (
        <div className="encounter-documentation-grid">
          <div className="account-card">
            <span>Status</span>
            <strong>{status}</strong>
          </div>

          {items.map((item, index) => (
            <div className="account-card" key={index}>
              <span>
                {item.therapy_system} · {item.medicine_name}
              </span>

              <p>
                {[
                  item.formulation,
                  item.strength,
                  item.dose,
                  item.route,
                  item.frequency,
                  item.timing,
                  item.duration_value &&
                    item.duration_unit
                    ? `${item.duration_value} ${item.duration_unit}`
                    : '',
                  item.anupana,
                  item.instructions,
                ]
                  .filter(Boolean)
                  .join(' · ')}
              </p>

              {item.quantity && (
                <small>Quantity: {item.quantity}</small>
              )}
            </div>
          ))}

          {notes && (
            <div className="account-card">
              <span>Prescription Notes</span>
              <p>{notes}</p>
            </div>
          )}
        </div>
      ) : editing ? (
        <div className="clinical-visit-form">
          {prescriptionId && (
            <div className="form-field form-field-full">
              <label>Reason for Treatment Modification</label>
              <textarea
                value={changeReason}
                onChange={(event) =>
                  setChangeReason(event.target.value)
                }
                rows={2}
                placeholder="e.g. adverse effect, inadequate response, new symptom..."
              />
            </div>
          )}

          <div className="form-field form-field-full">
            <label>Prescription Notes</label>
            <textarea
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              rows={3}
              placeholder="General counselling, precautions or treatment instructions..."
            />
          </div>

          {items.map((item, index) => (
            <div className="account-card" key={index}>
              <div className="clinical-section-header">
                <div>
                  <p className="eyebrow">MEDICINE {index + 1}</p>
                  <h3>
                    {item.medicine_name || 'New medicine'}
                  </h3>
                </div>

                {items.length > 1 && (
                  <button
                    type="button"
                    className="secondary-button"
                    onClick={() => removeItem(index)}
                  >
                    Remove
                  </button>
                )}
              </div>

              <div className="form-grid">
                <div className="form-field">
                  <label>System</label>
                  <select
                    value={item.therapy_system}
                    onChange={(event) =>
                      updateItem(
                        index,
                        'therapy_system',
                        event.target.value,
                      )
                    }
                  >
                    <option value="Ayurvedic">Ayurvedic</option>
                    <option value="Modern">Modern</option>
                  </select>
                </div>

                <div className="form-field">
                  <label>Medicine</label>
                  <input
                    value={item.medicine_name}
                    onChange={(event) =>
                      updateItem(
                        index,
                        'medicine_name',
                        event.target.value,
                      )
                    }
                    placeholder="Medicine name"
                  />
                </div>

                <div className="form-field">
                  <label>Formulation</label>
                  <input
                    value={item.formulation}
                    onChange={(event) =>
                      updateItem(
                        index,
                        'formulation',
                        event.target.value,
                      )
                    }
                    placeholder="Tablet, Churna, Kashaya..."
                  />
                </div>


                {item.therapy_system === 'Modern' && (
                  <div className="form-field">
                    <label>Strength</label>
                    <input
                      value={item.strength}
                      onChange={(event) =>
                        updateItem(index, 'strength', event.target.value)
                      }
                      placeholder="e.g. 500 mg, 10 mg/5 mL"
                    />
                  </div>
                )}

                <div className="form-field">
                  <label>Dose</label>
                  <input
                    value={item.dose}
                    onChange={(event) =>
                      updateItem(index, 'dose', event.target.value)
                    }
                    placeholder="1 tablet / 10 ml"
                  />
                </div>

                <div className="form-field">
                  <label>Route</label>
                  <input
                    value={item.route}
                    onChange={(event) =>
                      updateItem(index, 'route', event.target.value)
                    }
                    placeholder="Oral / topical..."
                  />
                </div>

                <div className="form-field">
                  <label>Frequency</label>
                  <input
                    value={item.frequency}
                    onChange={(event) =>
                      updateItem(
                        index,
                        'frequency',
                        event.target.value,
                      )
                    }
                    placeholder="OD / BD / TDS / HS"
                  />
                </div>

                <div className="form-field">
                  <label>Timing</label>
                  <input
                    value={item.timing}
                    onChange={(event) =>
                      updateItem(index, 'timing', event.target.value)
                    }
                    placeholder="Before food / after food"
                  />
                </div>

                <div className="form-field">
                  <label>Duration</label>
                  <input
                    type="number"
                    min="0"
                    step="0.5"
                    value={item.duration_value}
                    onChange={(event) =>
                      updateItem(
                        index,
                        'duration_value',
                        event.target.value,
                      )
                    }
                    placeholder="7"
                  />
                </div>

                <div className="form-field">
                  <label>Duration Unit</label>
                  <select
                    value={item.duration_unit}
                    onChange={(event) =>
                      updateItem(
                        index,
                        'duration_unit',
                        event.target.value,
                      )
                    }
                  >
                    <option value="Days">Days</option>
                    <option value="Weeks">Weeks</option>
                    <option value="Months">Months</option>
                  </select>
                </div>

                <div className="form-field">
                  <label>Quantity</label>
                  <input
                    value={item.quantity}
                    onChange={(event) =>
                      updateItem(
                        index,
                        'quantity',
                        event.target.value,
                      )
                    }
                    placeholder="30 tablets / 100 g"
                  />
                </div>

                <div className="form-field">
                  <label>Anupana</label>
                  <input
                    value={item.anupana}
                    onChange={(event) =>
                      updateItem(
                        index,
                        'anupana',
                        event.target.value,
                      )
                    }
                    placeholder="Jala / Madhu / Koshna jala"
                  />
                </div>

                <div className="form-field form-field-full">
                  <label>Instructions</label>
                  <textarea
                    value={item.instructions}
                    onChange={(event) =>
                      updateItem(
                        index,
                        'instructions',
                        event.target.value,
                      )
                    }
                    rows={3}
                    placeholder="Special instructions and counselling..."
                  />
                </div>
              </div>
            </div>
          ))}

          <div className="form-actions">
            <button
              type="button"
              className="secondary-button"
              disabled={saving}
              onClick={() => {
                setEditing(false)
                void loadPrescription()
              }}
            >
              Cancel
            </button>

            <button
              type="button"
              className="secondary-button"
              disabled={saving}
              onClick={addItem}
            >
              + Add Medicine
            </button>

            <button
              type="button"
              className="primary-button"
              disabled={saving}
              onClick={() => void savePrescription()}
            >
              {saving ? 'Saving...' : 'Save Prescription'}
            </button>
          </div>
        </div>
      ) : (
        <div className="empty-patients">
          <div className="empty-icon">💊</div>
          <h3>No prescription recorded</h3>
          <p>
            Add structured Ayurvedic or modern medicines for this encounter.
          </p>
        </div>
      )}
    </section>
  )
}
