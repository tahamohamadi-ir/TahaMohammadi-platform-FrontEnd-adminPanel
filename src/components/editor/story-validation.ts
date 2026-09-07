import type {
  CompositionSchemaOut,
  CompositionSectionUpdateIn,
} from '@/lib/api/composition'

export function validateStoryDraft(
  sections: CompositionSectionUpdateIn[],
  schema: CompositionSchemaOut | null | undefined,
): string[] {
  if (!schema || !Array.isArray(schema.blockTypes)) {
    return []
  }

  const issues: string[] = []
  const specMap = new Map(schema.blockTypes.map((b) => [b.type, b]))

  sections.forEach((section, sIdx) => {
    const blocks = section.blocks ?? []
    blocks.forEach((block, bIdx) => {
      const spec = specMap.get(block.blockType)
      if (!spec) return

      const requiredKeys = spec.required ?? []
      const settings = block.settings ?? {}

      for (const key of requiredKeys) {
        const val = settings[key]
        let isMissing = false

        if (val === undefined || val === null) {
          isMissing = true
        } else if (typeof val === 'string' && val.trim() === '') {
          isMissing = true
        } else if (Array.isArray(val) && val.length === 0) {
          isMissing = true
        }

        if (isMissing) {
          const fieldSpec = spec.fields?.find((f) => f.key === key)
          const fieldLabel = fieldSpec?.label || key
          issues.push(
            `Section ${sIdx + 1}, Block ${bIdx + 1} (${block.blockType}): "${fieldLabel}" (${key}) is required.`,
          )
        }
      }
    })
  })

  return issues
}
