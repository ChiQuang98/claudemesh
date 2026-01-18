import * as fs from 'fs-extra';
import matter from 'gray-matter';
import { ValidationResult, AgentFrontmatter, SkillFrontmatter } from '../types';

const VALID_TOOLS = ['Read', 'Glob', 'Grep', 'Bash', 'Write', 'Edit', 'Task', 'WebFetch', 'WebSearch'];

export function validateAgent(filePath: string): ValidationResult {
  const errors: string[] = [];

  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const { data } = matter(content);
    const frontmatter = data as AgentFrontmatter;

    // Required fields
    if (!frontmatter.name) {
      errors.push('name is required');
    } else if (!/^[a-z0-9-]+$/.test(frontmatter.name)) {
      errors.push('name must be lowercase letters, numbers, and hyphens only');
    }

    if (!frontmatter.description) {
      errors.push('description is required');
    } else if (frontmatter.description.length > 1024) {
      errors.push('description must be 1024 characters or less');
    }

    // Valid tools
    if (frontmatter.tools) {
      if (!Array.isArray(frontmatter.tools)) {
        errors.push('tools must be an array');
      } else {
        frontmatter.tools.forEach(tool => {
          if (!VALID_TOOLS.includes(tool)) {
            errors.push(`Invalid tool: ${tool}. Valid tools: ${VALID_TOOLS.join(', ')}`);
          }
        });
      }
    }

    // Valid model
    if (frontmatter.model) {
      const validModels = ['sonnet', 'opus', 'haiku', 'inherit'];
      if (!validModels.includes(frontmatter.model)) {
        errors.push(`Invalid model: ${frontmatter.model}. Valid models: ${validModels.join(', ')}`);
      }
    }

  } catch (error) {
    errors.push(`Failed to parse file: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

export function validateSkill(filePath: string): ValidationResult {
  const errors: string[] = [];

  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const { data } = matter(content);
    const frontmatter = data as SkillFrontmatter;

    // Required fields
    if (!frontmatter.name) {
      errors.push('name is required');
    } else if (!/^[a-z0-9-]+$/.test(frontmatter.name)) {
      errors.push('name must be lowercase letters, numbers, and hyphens only');
    } else if (frontmatter.name.length > 64) {
      errors.push('name must be 64 characters or less');
    }

    if (!frontmatter.description) {
      errors.push('description is required');
    } else if (frontmatter.description.length > 1024) {
      errors.push('description must be 1024 characters or less');
    }

    // Valid context
    if (frontmatter.context && !['fork', 'shared'].includes(frontmatter.context)) {
      errors.push('context must be either "fork" or "shared"');
    }

  } catch (error) {
    errors.push(`Failed to parse file: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

export async function validateAllFiles(): Promise<{ agents: Map<string, ValidationResult>; skills: Map<string, ValidationResult> }> {
  const results = {
    agents: new Map<string, ValidationResult>(),
    skills: new Map<string, ValidationResult>(),
  };

  // Validate agents
  const agentsDir = '.claude/agents';
  if (await fs.pathExists(agentsDir)) {
    const agentFiles = await fs.readdir(agentsDir);
    for (const file of agentFiles) {
      if (file.endsWith('.md')) {
        const filePath = `${agentsDir}/${file}`;
        results.agents.set(file, validateAgent(filePath));
      }
    }
  }

  // Validate skills
  const skillsDir = '.claude/skills';
  if (await fs.pathExists(skillsDir)) {
    const skillDirs = await fs.readdir(skillsDir);
    for (const dir of skillDirs) {
      const skillFile = `${skillsDir}/${dir}/SKILL.md`;
      if (await fs.pathExists(skillFile)) {
        results.skills.set(dir, validateSkill(skillFile));
      }
    }
  }

  return results;
}
