/**
 * SubSquad Types — Type definitions for Squad SubSquads.
 *
 * SubSquads enable horizontal scaling by allowing multiple Squad instances
 * (e.g., in different Codespaces) to each handle a scoped subset of work.
 *
 * @module streams/types
 */

/** Definition of a single SubSquad (team partition). */
export interface SubSquadDefinition {
  /** SubSquad name, e.g., "ui-team", "backend-team" */
  name: string;
  /** GitHub label to filter issues by, e.g., "team:ui" */
  labelFilter: string;
  /** Optional folder restrictions, e.g., ["apps/web"] */
  folderScope?: string[];
  /** Workflow mode. Default: branch-per-issue */
  workflow?: 'branch-per-issue' | 'direct';
  /** Human-readable description of this SubSquad's purpose */
  description?: string;
}

/** @deprecated Use SubSquadDefinition instead */
export type WorkstreamDefinition = SubSquadDefinition;

/** @deprecated Use SubSquadDefinition instead */
export type StreamDefinition = SubSquadDefinition;

/** Top-level SubSquads configuration (stored in .squad/streams.json). */
export interface SubSquadConfig {
  /** All configured SubSquads */
  workstreams: SubSquadDefinition[];
  /** Default workflow for SubSquads that don't specify one */
  defaultWorkflow: 'branch-per-issue' | 'direct';
}

/** @deprecated Use SubSquadConfig instead */
export type WorkstreamConfig = SubSquadConfig;

/** @deprecated Use SubSquadConfig instead */
export type StreamConfig = SubSquadConfig;

/** A resolved SubSquad with provenance information. */
export interface ResolvedSubSquad {
  /** SubSquad name */
  name: string;
  /** Full SubSquad definition */
  definition: SubSquadDefinition;
  /** How this SubSquad was resolved */
  source: 'env' | 'file' | 'config';
}

/** @deprecated Use ResolvedSubSquad instead */
export type ResolvedWorkstream = ResolvedSubSquad;

/** @deprecated Use ResolvedSubSquad instead */
export type ResolvedStream = ResolvedSubSquad;
