import chalk from 'chalk';
import { getAllDomains } from '../utils/manifest';

export async function list(): Promise<void> {
  console.log(chalk.blue.bold('\n📋 Installed ClaudeMesh Domains\n'));

  try {
    const domains = await getAllDomains();
    const domainNames = Object.keys(domains);

    if (domainNames.length === 0) {
      console.log(chalk.gray('No domains installed yet.'));
      console.log(chalk.gray('\nAdd domains with:'));
      console.log(chalk.cyan('  claudemesh add git'));
      console.log(chalk.cyan('  claudemesh add backend-node\n'));
      return;
    }

    for (const domainName of domainNames) {
      const domain = domains[domainName];
      console.log(chalk.cyan.bold(`@claudemesh/${domainName}`) + chalk.gray(` (v${domain.version})`));

      if (domain.agents.length > 0) {
        console.log(chalk.gray(`  ├── agents (${domain.agents.length})`));
        domain.agents.forEach((agent, index) => {
          const isLast = index === domain.agents.length - 1 && domain.skills.length === 0;
          const prefix = isLast ? '  │   └──' : '  │   ├──';
          console.log(chalk.gray(prefix), agent);
        });
      }

      if (domain.skills.length > 0) {
        console.log(chalk.gray(`  └── skills (${domain.skills.length})`));
        domain.skills.forEach((skill, index) => {
          const isLast = index === domain.skills.length - 1;
          const prefix = isLast ? '      └──' : '      ├──';
          console.log(chalk.gray(prefix), skill);
        });
      }

      console.log();
    }

    const totalAgents = domainNames.reduce((sum, name) => sum + domains[name].agents.length, 0);
    const totalSkills = domainNames.reduce((sum, name) => sum + domains[name].skills.length, 0);

    console.log(chalk.green(`Total: ${domainNames.length} domains, ${totalAgents} agents, ${totalSkills} skills\n`));
  } catch (error) {
    console.error(chalk.red('\n❌ Error:'), error instanceof Error ? error.message : 'Unknown error');
    process.exit(1);
  }
}
