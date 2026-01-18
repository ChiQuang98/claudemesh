export interface ManifestDomain {
  version: string;
  agents: string[];
  skills: string[];
}

export interface Manifest {
  version: string;
  domains: Record<string, ManifestDomain>;
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

export interface AgentFrontmatter {
  name: string;
  description: string;
  tools?: string[];
  disallowedTools?: string[];
  model?: 'sonnet' | 'opus' | 'haiku' | 'inherit';
  permissionMode?: 'default' | 'acceptEdits' | 'dontAsk' | 'bypassPermissions' | 'plan';
  skills?: string[];
}

export interface SkillFrontmatter {
  name: string;
  description: string;
  'allowed-tools'?: string[];
  model?: string;
  context?: 'fork' | 'shared';
  agent?: string;
  'user-invocable'?: boolean;
  'disable-model-invocation'?: boolean;
}
