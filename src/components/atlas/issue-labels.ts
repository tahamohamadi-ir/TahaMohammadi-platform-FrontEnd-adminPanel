import type { AtlasValidationIssue } from '@/lib/api/atlas'

/** Blocking codes — spec §20.1 in table order, plus the plan's
 * `DIRECTION_NOT_OVERRIDABLE` (backend `BLOCKING_CODES`, same order). */
export const ATLAS_BLOCKING_CODES: readonly string[] = [
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
]

/** Warning codes — spec §20.2 in table order (backend `WARNING_CODES`). */
export const ATLAS_WARNING_CODES: readonly string[] = [
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
]

/** The whole implemented vocabulary (backend `ATLAS_ISSUE_CODES`). */
export const ATLAS_ISSUE_CODES: readonly string[] = [
  ...ATLAS_BLOCKING_CODES,
  ...ATLAS_WARNING_CODES,
]

const LABELS: Record<string, string> = {
  DANGLING_NODE_HIDDEN_RELATION:
    'A visible relation points to a hidden node. Show the node or hide the relation.',
  DANGLING_RELATION_ENDPOINT:
    'A relation points to a node that no longer exists in this version.',
  CANONICAL_SOURCE_MISSING:
    'The node type requires a canonical record, but none is linked.',
  CANONICAL_SOURCE_UNPUBLISHED:
    'The linked canonical record is not published in a locale without an override.',
  MISSING_LOCALE_PROJECTION:
    'A visible node has no resolvable label and summary for the locale below — neither an override nor a canonical record.',
  AMBIGUOUS_CANONICAL_REF:
    'More than one canonical row matches the linked translation key.',
  NODE_TYPE_INACTIVE:
    'A node uses an inactive node type. Reactivate the type or move the node.',
  RELATION_TYPE_INACTIVE:
    'A relation uses an inactive relation type. Reactivate the type or remove the relation.',
  RELATION_TYPE_NOT_ALLOWED:
    'The relation connects node types its relation type does not allow.',
  HIERARCHY_CYCLE:
    'Hierarchy relations form a cycle. Break the cycle before publishing.',
  SELF_LOOP_FORBIDDEN:
    'A node relates to itself with a type that forbids self-loops.',
  DUPLICATE_PUBLIC_KEY:
    'Two rows share one public key. Keys must be unique within the version.',
  DUPLICATE_RELATION: 'The same relation exists twice in this version.',
  INVALID_PIN:
    'A pin is incomplete, non-finite, or outside the scene bounds. Pins need both x and y.',
  MISSING_LAYOUT:
    'A visible node has no stored coordinate. Recompute the layout.',
  GROUP_LOCALE_MISSING: 'A group has no label for English or Persian.',
  PAYLOAD_CONTRACT_INVALID:
    'The projected payload fails its own contract check.',
  DIRECTION_NOT_OVERRIDABLE:
    'A relation sets a direction its type fixes. Restore the default direction.',
  ISOLATED_NODE: 'A node has no relations and no group membership.',
  NO_INBOUND_RELATIONS: 'A node has no incoming relations.',
  NO_OUTBOUND_RELATIONS: 'A node has no outgoing relations.',
  HIGH_DEGREE_HUB: 'A node carries more than 12 relations.',
  SUMMARY_MISSING: 'A visible node has no summary in a locale.',
  UNUSED_NODE_TYPE: 'An active node type is used by no node in this version.',
  UNUSED_RELATION_TYPE:
    'An active relation type is used by no relation in this version.',
  OVERLAPPING_PINS: 'Two pinned nodes sit closer than their combined radius.',
  SCALE_NODES: 'The version exceeds 100 visible nodes.',
  SCALE_RELATIONS: 'The version exceeds 250 visible relations.',
  SINGLE_LEVEL_HIERARCHY:
    'No hierarchy-role relation exists; the graph declares no structure.',
}

function localeName(messageToken: string): string | null {
  if (messageToken.endsWith('.fa')) return 'Persian (fa)'
  if (messageToken.endsWith('.en')) return 'English (en)'
  return null
}

function entityOf(issue: AtlasValidationIssue): string | null {
  return issue.nodeKey ?? issue.relationKey ?? issue.groupKey ?? null
}

/** The human sentence for one stable issue code.
 *
 * This module is the only UI copy for validation issues — panels render
 * these sentences, never the raw codes.
 */
export function issueLabel(code: string): string {
  return LABELS[code] ?? `Unknown validation issue (${code}).`
}

/** The full sentence for one issue: label plus entity and locale. */
export function issueDetail(issue: AtlasValidationIssue): string {
  const parts = [issueLabel(issue.code)]
  const locale = localeName(issue.messageToken)
  if (locale) {
    parts.push(`Missing locale: ${locale}.`)
  }
  const entity = entityOf(issue)
  if (entity) {
    parts.push(`Entity: ${entity}.`)
  }
  return parts.join(' ')
}

export function isBlockingCode(code: string): boolean {
  return ATLAS_BLOCKING_CODES.includes(code)
}
