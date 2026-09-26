import { describe, expect, it } from 'vitest'

import {
  ATLAS_BLOCKING_CODES,
  ATLAS_ISSUE_CODES,
  ATLAS_WARNING_CODES,
  issueDetail,
  issueLabel,
} from '@/components/atlas/issue-labels'

describe('issue-labels (Plan B Task 15)', () => {
  it('covers every blocking code from the wire vocabulary', () => {
    expect(ATLAS_BLOCKING_CODES).toEqual([
      'DANGLING_NODE_HIDDEN_RELATION',
      'DANGLING_RELATION_ENDPOINT',
      'CANONICAL_SOURCE_MISSING',
      'CANONICAL_SOURCE_UNPUBLISHED',
      'MISSING_LOCALE_PROJECTION',
      'AMBIGUOUS_CANONICAL_REF',
      'NODE_TYPE_INACTIVE',
      'RELATION_TYPE_INACTIVE',
      'RELATION_TYPE_NOT_ALLOWED',
      'HIERARCHY_CYCLE',
      'SELF_LOOP_FORBIDDEN',
      'DUPLICATE_PUBLIC_KEY',
      'DUPLICATE_RELATION',
      'INVALID_PIN',
      'MISSING_LAYOUT',
      'GROUP_LOCALE_MISSING',
      'PAYLOAD_CONTRACT_INVALID',
      'DIRECTION_NOT_OVERRIDABLE',
    ])
  })

  it('covers every warning code from the wire vocabulary', () => {
    expect(ATLAS_WARNING_CODES).toEqual([
      'ISOLATED_NODE',
      'NO_INBOUND_RELATIONS',
      'NO_OUTBOUND_RELATIONS',
      'HIGH_DEGREE_HUB',
      'SUMMARY_MISSING',
      'UNUSED_NODE_TYPE',
      'UNUSED_RELATION_TYPE',
      'OVERLAPPING_PINS',
      'SCALE_NODES',
      'SCALE_RELATIONS',
      'SINGLE_LEVEL_HIERARCHY',
    ])
  })

  it('has a human sentence for every stable code', () => {
    expect(ATLAS_ISSUE_CODES).toHaveLength(
      ATLAS_BLOCKING_CODES.length + ATLAS_WARNING_CODES.length,
    )
    for (const code of ATLAS_ISSUE_CODES) {
      const label = issueLabel(code)
      expect(label).not.toContain(code)
      expect(label.length).toBeGreaterThan(10)
    }
  })

  it('names the missing locale for parity blockers in both directions', () => {
    const fa = issueDetail({
      code: 'MISSING_LOCALE_PROJECTION',
      nodeKey: 'research-area-1a2b3c4d',
      messageToken: 'parity.missing.fa',
    })
    expect(fa).toMatch(/persian|fa/i)
    expect(fa).toContain('research-area-1a2b3c4d')
    const en = issueDetail({
      code: 'MISSING_LOCALE_PROJECTION',
      nodeKey: 'project-9f8e7d6c',
      messageToken: 'parity.missing.en',
    })
    expect(en).toMatch(/english|en/i)
    expect(en).toContain('project-9f8e7d6c')
  })

  it('names the entity for relation and group issues', () => {
    expect(
      issueDetail({
        code: 'HIERARCHY_CYCLE',
        relationKey: 'a~contains~b',
        messageToken: 'atlas.hierarchyCycle',
      }),
    ).toContain('a~contains~b')
    expect(
      issueDetail({
        code: 'GROUP_LOCALE_MISSING',
        groupKey: 'group-1a2b3c4d',
        messageToken: 'atlas.groupLocaleMissing',
      }),
    ).toContain('group-1a2b3c4d')
  })

  it('falls back honestly for an unknown code', () => {
    expect(issueLabel('SOMETHING_NEW')).toContain('SOMETHING_NEW')
  })
})
