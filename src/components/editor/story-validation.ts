import type {
  CompositionSchemaOut,
  CompositionSectionUpdateIn,
} from '@/lib/api/composition'

function object(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value)
}
function blank(value: unknown) {
  return value == null || (typeof value === 'string' && value.trim() === '')
}
function positiveId(value: unknown) {
  return typeof value === 'number' && Number.isSafeInteger(value) && value > 0
}

/** Immediate authoring checks; the backend remains the publication authority. */
export function validateStoryDraft(
  sections: CompositionSectionUpdateIn[],
  schema: CompositionSchemaOut | null | undefined,
): string[] {
  if (!schema) return []
  const issues: string[] = []
  sections.forEach((section, si) =>
    (section.blocks ?? []).forEach((block, bi) => {
      const spec = schema.blockTypes?.find(
        (candidate) => candidate.type === block.blockType,
      )
      if (!spec) return
      const settings = block.settings ?? {}
      const add = (message: string) =>
        issues.push(
          `Section ${si + 1}, Block ${bi + 1} (${block.blockType}): ${message}`,
        )
      for (const key of spec.required ?? []) {
        if (blank(settings[key]))
          add(
            `${spec.fields?.find((field) => field.key === key)?.label ?? key} (${key}) is required.`,
          )
      }
      for (const field of spec.fields ?? []) {
        const value = settings[field.key]
        if (value == null) continue
        const name = field.label
        if (field.type.endsWith('List')) {
          if (!Array.isArray(value)) {
            add(`${name} must be a list.`)
            continue
          }
          if (field.minItems != null && value.length < field.minItems)
            add(`${name} needs at least ${field.minItems} items.`)
          if (field.maxItems != null && value.length > field.maxItems)
            add(`${name} allows at most ${field.maxItems} items.`)
          if (field.type === 'mediaList' && value.some((id) => !positiveId(id)))
            add(`${name}: choose valid media from the library.`)
          if (
            field.type === 'itemList' ||
            field.type === 'referenceList' ||
            field.type === 'relatedList'
          ) {
            value.forEach((item, index) => {
              if (!object(item)) {
                add(`${name}, item ${index + 1} must be an object.`)
                return
              }
              const required =
                field.itemFields
                  ?.filter((itemField) => itemField.required)
                  .map((itemField) => String(itemField.key)) ??
                (field.type === 'referenceList'
                  ? ['label']
                  : field.type === 'relatedList'
                    ? ['family', 'id']
                    : [])
              required.forEach((key) => {
                if (blank(item[key]))
                  add(`${name}, item ${index + 1}: ${key} is required.`)
              })
              if (
                field.type === 'referenceList' &&
                !blank(item.url) &&
                (typeof item.url !== 'string' ||
                  !/^(https?:\/\/|\/)/i.test(item.url))
              )
                add(`${name}, item ${index + 1}: use a web URL or site path.`)
              if (
                field.type === 'relatedList' &&
                !(
                  positiveId(item.id) ||
                  (typeof item.id === 'string' &&
                    /^[1-9][0-9]*$/.test(item.id) &&
                    Number.isSafeInteger(Number(item.id)))
                )
              )
                add(`${name}, item ${index + 1}: choose a content record.`)
            })
          }
        }
        if (['media', 'download'].includes(field.type) && !positiveId(value))
          add(`${name}: choose an item from the library.`)
        if (
          field.type === 'number' &&
          (typeof value !== 'number' || !Number.isFinite(value))
        )
          add(`${name} must be a number.`)
      }
      if (block.blockType === 'table') {
        const columns = Array.isArray(settings.columns) ? settings.columns : []
        const keys = new Set<string>()
        columns.forEach((column, index) => {
          if (!object(column) || blank(column.key)) {
            add(`Column ${index + 1} needs a label and key.`)
            return
          }
          if (blank(column.label)) add(`Column ${index + 1} needs a label.`)
          const key = String(column.key)
          if (keys.has(key)) add(`Duplicate column key: ${key}.`)
          keys.add(key)
        })
        if (!columns.length) add('Add at least one column.')
        if (Array.isArray(settings.rows))
          settings.rows.forEach((row, index) => {
            if (!object(row)) add(`Row ${index + 1} must be an object.`)
            else if (Object.keys(row).some((key) => !keys.has(key)))
              add(`Row ${index + 1} contains an unknown column.`)
          })
      }
    }),
  )
  return issues
}
