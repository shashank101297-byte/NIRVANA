import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { supabase } from '../../lib/supabase'

type TerminologyValue = {
  id: string
  code: string
  display_name: string
  search_terms: string
  source_system: string
  version: string
  metadata: Record<string, unknown>
}

type Props = {
  label: string
  setCode: string
  value: string[]
  onChange: (values: string[]) => void
  placeholder?: string
  multiple?: boolean
  onStructuredChange?: (values: TerminologyValue[]) => void
}

export default function TerminologySelect({
  label,
  setCode,
  value,
  onChange,
  placeholder = 'Search or select...',
  multiple = false,
  onStructuredChange,
}: Props) {
  const [options, setOptions] = useState<TerminologyValue[]>([])
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    let active = true

    async function loadOptions() {
      setLoading(true)

      const { data: setData } = await supabase
        .from('clinical_terminology_sets')
        .select('id, source_system, version, display_name')
        .eq('set_code', setCode)
        .is('organization_id', null)
        .eq('active', true)
        .maybeSingle()

      if (!setData) {
        if (active) setOptions([])
        setLoading(false)
        return
      }

      const { data } = await supabase
        .from('clinical_terminology_values')
        .select('id, code, display_name, search_terms, metadata')
        .eq('set_id', setData.id)
        .eq('active', true)
        .order('sort_order', { ascending: true })

      if (active) {
        setOptions(
          (data ?? []).map((item) => ({
            ...item,
            source_system: setData.source_system,
            version: setData.version,
            metadata:
              (item.metadata as Record<string, unknown> | null) ?? {},
          })) as TerminologyValue[],
        )
      }

      setLoading(false)
    }

    void loadOptions()

    return () => {
      active = false
    }
  }, [setCode])

  const filteredOptions = useMemo(() => {
    const search = query.trim().toLowerCase()

    if (!search) return options

    return options.filter((item) =>
      `${item.display_name} ${item.search_terms} ${item.code}`
        .toLowerCase()
        .includes(search),
    )
  }, [options, query])

  const selectedLabels = value.map(
    (code) =>
      options.find((option) => option.code === code)?.display_name ?? code,
  )

  function selectOption(code: string) {
    const nextValues = multiple
      ? value.includes(code)
        ? value.filter((item) => item !== code)
        : [...value, code]
      : [code]

    onChange(nextValues)

    if (onStructuredChange) {
      onStructuredChange(
        nextValues
          .map((selectedCode) =>
            options.find((option) => option.code === selectedCode),
          )
          .filter((option): option is TerminologyValue => Boolean(option)),
      )
    }

    if (!multiple) {
      setOpen(false)
      setQuery('')
    }
  }

  function removeValue(code: string) {
    onChange(value.filter((item) => item !== code))
  }

  function closePanel() {
    setOpen(false)
    setQuery('')
  }

  const panel =
    open &&
    createPortal(
      <div
        className="nirvana-terminology-overlay"
        onMouseDown={(event) => {
          if (event.target === event.currentTarget) {
            closePanel()
          }
        }}
      >
        <aside
          className="nirvana-terminology-panel"
          role="dialog"
          aria-label={`${label} selection`}
        >
          <div className="nirvana-terminology-header">
            <div>
              <div className="nirvana-terminology-kicker">
                CLINICAL SELECTION
              </div>

              <h3>{label}</h3>
            </div>

            <button
              type="button"
              className="nirvana-terminology-close-icon"
              onClick={closePanel}
              aria-label={`Close ${label} selector`}
            >
              ×
            </button>
          </div>

          <div className="nirvana-terminology-search-wrap">
            <span>⌕</span>

            <input
              autoFocus
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={`Search ${label.toLowerCase()}...`}
            />
          </div>

          <div className="nirvana-terminology-results">
            {loading ? (
              <div className="nirvana-terminology-empty">
                Loading options...
              </div>
            ) : filteredOptions.length === 0 ? (
              <div className="nirvana-terminology-empty">
                No matching options.
              </div>
            ) : (
              filteredOptions.map((option) => {
                const selected = value.includes(option.code)

                return (
                  <button
                    type="button"
                    key={option.id}
                    className={`nirvana-terminology-option${
                      selected ? ' selected' : ''
                    }`}
                    onClick={() => selectOption(option.code)}
                  >
                    <span className="nirvana-terminology-check">
                      {selected ? '✓' : ''}
                    </span>

                    <span className="nirvana-terminology-option-name">
                      {option.display_name}
                    </span>
                  </button>
                )
              })
            )}
          </div>

          {multiple && (
            <div className="nirvana-terminology-footer">
              <span>
                {value.length} selected
              </span>

              <button
                type="button"
                className="nirvana-terminology-done"
                onClick={closePanel}
              >
                Done
              </button>
            </div>
          )}
        </aside>
      </div>,
      document.body,
    )

  return (
    <>
      <div className="form-field terminology-select">
        <label>{label}</label>

        <button
          type="button"
          className="terminology-trigger"
          onClick={() => setOpen(true)}
          aria-expanded={open}
        >
          <span>
            {selectedLabels.length
              ? selectedLabels.join(', ')
              : placeholder}
          </span>

          <span>⌄</span>
        </button>

        {selectedLabels.length > 0 && (
          <div className="terminology-chips">
            {selectedLabels.map((name, index) => (
              <span
                className="terminology-chip"
                key={value[index]}
              >
                {name}

                <button
                  type="button"
                  onClick={() => removeValue(value[index])}
                  aria-label={`Remove ${name}`}
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      {panel}
    </>
  )
}
