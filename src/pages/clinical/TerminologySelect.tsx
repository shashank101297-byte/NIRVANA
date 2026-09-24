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
  allowCustom?: boolean
  customValue?: string
  onCustomChange?: (value: string) => void
}

export default function TerminologySelect({
  label,
  setCode,
  value,
  onChange,
  placeholder = 'Search or select...',
  multiple = false,
  onStructuredChange,
  allowCustom = false,
  customValue = '',
  onCustomChange,
}: Props) {
  const [options, setOptions] = useState<TerminologyValue[]>([])
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [showCustom, setShowCustom] = useState(false)
  const [customDraft, setCustomDraft] = useState(customValue)

  useEffect(() => {
    setCustomDraft(customValue)
  }, [customValue])

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

  const categories = useMemo(() => {
    const counts = new Map<string, number>()

    options.forEach((option) => {
      const category =
        typeof option.metadata.category === 'string'
          ? option.metadata.category
          : 'Other'

      counts.set(category, (counts.get(category) ?? 0) + 1)
    })

    return Array.from(counts.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => a.name.localeCompare(b.name))
  }, [options])

  const isCategorized = categories.length > 1

  const filteredOptions = useMemo(() => {
    const search = query.trim().toLowerCase()

    let source = options

    if (selectedCategory) {
      source = source.filter(
        (option) => option.metadata.category === selectedCategory,
      )
    }

    if (!search) return source

    return source.filter((item) =>
      `${item.display_name} ${item.search_terms} ${item.code} ${
        typeof item.metadata.category === 'string'
          ? item.metadata.category
          : ''
      }`
        .toLowerCase()
        .includes(search),
    )
  }, [options, query, selectedCategory])

  const selectedLabels = value.map(
    (code) =>
      options.find((option) => option.code === code)?.display_name ?? code,
  )

  function updateStructured(nextValues: string[]) {
    if (!onStructuredChange) return

    onStructuredChange(
      nextValues
        .map((selectedCode) =>
          options.find((option) => option.code === selectedCode),
        )
        .filter((option): option is TerminologyValue => Boolean(option)),
    )
  }

  function selectOption(code: string) {
    const nextValues = multiple
      ? value.includes(code)
        ? value.filter((item) => item !== code)
        : [...value, code]
      : [code]

    onChange(nextValues)
    updateStructured(nextValues)

    if (!multiple) {
      setOpen(false)
      setQuery('')
      setSelectedCategory(null)
    }
  }

  function removeValue(code: string) {
    const nextValues = value.filter((item) => item !== code)

    onChange(nextValues)
    updateStructured(nextValues)
  }

  function closePanel() {
    setOpen(false)
    setQuery('')
    setSelectedCategory(null)
    setShowCustom(false)
  }

  function saveCustom() {
    const nextValue = customDraft.trim()

    if (!onCustomChange) return

    onCustomChange(nextValue)
    setShowCustom(false)
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

              {isCategorized && (
                <div className="nirvana-terminology-library-label">
                  NIRVANA Clinical Diagnosis Library
                </div>
              )}
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

          {isCategorized && !query && (
            <div className="nirvana-terminology-breadcrumb">
              {selectedCategory ? (
                <button
                  type="button"
                  onClick={() => setSelectedCategory(null)}
                >
                  ← All categories
                </button>
              ) : (
                <span>Browse by category</span>
              )}
            </div>
          )}

          <div className="nirvana-terminology-results">
            {loading ? (
              <div className="nirvana-terminology-empty">
                Loading options...
              </div>
            ) : isCategorized && !selectedCategory && !query ? (
              <div className="nirvana-terminology-categories">
                {categories.map((category) => (
                  <button
                    type="button"
                    key={category.name}
                    className="nirvana-terminology-category"
                    onClick={() => setSelectedCategory(category.name)}
                  >
                    <span className="nirvana-terminology-category-name">
                      {category.name}
                    </span>

                    <span className="nirvana-terminology-category-count">
                      {category.count}
                    </span>

                    <span className="nirvana-terminology-category-arrow">
                      ›
                    </span>
                  </button>
                ))}
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

                    <span className="nirvana-terminology-option-content">
                      <span className="nirvana-terminology-option-name">
                        {option.display_name}
                      </span>

                      {isCategorized && query && (
                        <span className="nirvana-terminology-option-category">
                          {typeof option.metadata.category === 'string'
                            ? option.metadata.category
                            : ''}
                        </span>
                      )}
                    </span>
                  </button>
                )
              })
            )}
          </div>

          {allowCustom && (
            <div className="nirvana-terminology-custom">
              {!showCustom ? (
                <button
                  type="button"
                  className="nirvana-terminology-add-custom"
                  onClick={() => setShowCustom(true)}
                >
                  ＋ Add custom {label.toLowerCase()}
                </button>
              ) : (
                <div className="nirvana-terminology-custom-editor">
                  <input
                    type="text"
                    value={customDraft}
                    onChange={(event) => setCustomDraft(event.target.value)}
                    placeholder={`Enter custom ${label.toLowerCase()}...`}
                    autoFocus
                  />

                  <div className="nirvana-terminology-custom-actions">
                    <button
                      type="button"
                      onClick={() => {
                        setCustomDraft(customValue)
                        setShowCustom(false)
                      }}
                    >
                      Cancel
                    </button>

                    <button
                      type="button"
                      className="primary"
                      onClick={saveCustom}
                    >
                      Add
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {multiple && (
            <div className="nirvana-terminology-footer">
              <span>
                {value.length} selected
                {customValue.trim() ? ' + custom' : ''}
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
            {selectedLabels.length || customValue.trim()
              ? [
                  ...selectedLabels,
                  ...(customValue.trim() ? [customValue.trim()] : []),
                ].join(', ')
              : placeholder}
          </span>

          <span>⌄</span>
        </button>

        {(selectedLabels.length > 0 || customValue.trim()) && (
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

            {customValue.trim() && (
              <span className="terminology-chip custom">
                {customValue.trim()}

                <button
                  type="button"
                  onClick={() => onCustomChange?.('')}
                  aria-label={`Remove custom ${label}`}
                >
                  ×
                </button>
              </span>
            )}
          </div>
        )}
      </div>

      {panel}
    </>
  )
}
