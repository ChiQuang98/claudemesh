import * as fs from 'fs-extra';
import * as path from 'path';
import chalk from 'chalk';

export interface CopyResult {
  agents: string[];
  skills: string[];
}

export async function copyDomainFiles(
  domainName: string,
  packagePath: string
): Promise<CopyResult> {
  const result: CopyResult = {
    agents: [],
    skills: [],
  };

  // Copy agents
  const agentsSource = path.join(packagePath, 'src', 'agents');
  if (await fs.pathExists(agentsSource)) {
    const agentFiles = await fs.readdir(agentsSource);

    for (const file of agentFiles) {
      const sourcePath = path.join(agentsSource, file);
      const stat = await fs.stat(sourcePath);

      if (stat.isFile() && file.endsWith('.md')) {
        const destPath = path.join('.claude', 'agents', file);
        await fs.copy(sourcePath, destPath);
        result.agents.push(path.basename(file, '.md'));
        console.log(chalk.green('  ✓'), `Copied agent: ${file}`);
      }
    }
  }

  // Copy skills
  const skillsSource = path.join(packagePath, 'src', 'skills');
  if (await fs.pathExists(skillsSource)) {
    const skillDirs = await fs.readdir(skillsSource);

    for (const dir of skillDirs) {
      const sourcePath = path.join(skillsSource, dir);
      const stat = await fs.stat(sourcePath);

      if (stat.isDirectory()) {
        const destPath = path.join('.claude', 'skills', dir);
        await fs.copy(sourcePath, destPath);
        result.skills.push(dir);
        console.log(chalk.green('  ✓'), `Copied skill: ${dir}/`);
      }
    }
  }

  return result;
}

export async function removeDomainFiles(
  agents: string[],
  skills: string[]
): Promise<void> {
  // Remove agent files
  for (const agent of agents) {
    const agentPath = path.join('.claude', 'agents', `${agent}.md`);
    if (await fs.pathExists(agentPath)) {
      await fs.remove(agentPath);
      console.log(chalk.yellow('  ✓'), `Removed agent: ${agent}.md`);
    }
  }

  // Remove skill directories
  for (const skill of skills) {
    const skillPath = path.join('.claude', 'skills', skill);
    if (await fs.pathExists(skillPath)) {
      await fs.remove(skillPath);
      console.log(chalk.yellow('  ✓'), `Removed skill: ${skill}/`);
    }
  }
}

export async function ensureClaudeDirectory(): Promise<void> {
  await fs.ensureDir('.claude/agents');
  await fs.ensureDir('.claude/skills');
}
