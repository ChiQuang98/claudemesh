import chalk from 'chalk';
import { getAllDomains, getAllDomainsCombined } from '../utils/manifest';

export async function list(): Promise<void> {
  console.log(chalk.blue.bold('\n📋 Installed ccmesh Domains\n'));

  try {
    const { global: globalDomains, local: localDomains } = await getAllDomainsCombined();

    const globalDomainNames = Object.keys(globalDomains);
    const localDomainNames = Object.keys(localDomains);

    // Show global domains
    if (globalDomainNames.length > 0) {
      console.log(chalk.magenta.bold('🌍 Globally Installed:\n'));

      for (const domainName of globalDomainNames) {
        const domain = globalDomains[domainName];
        console.log(chalk.cyan.bold(`@claudemesh/${domainName}`) + chalk.gray(` (v${domain.version})`) + chalk.magenta(' [global]'));

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
    }

    // Show local domains
    if (localDomainNames.length > 0) {
      if (globalDomainNames.length > 0) {
        console.log(chalk.gray('─────────────────────────────────────\n'));
      }
      console.log(chalk.cyan.bold('📁 Locally Installed:\n'));

      for (const domainName of localDomainNames) {
        // Skip if already shown in global
        if (globalDomains[domainName]) {
          continue;
        }

        const domain = localDomains[domainName];
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
    }

    // No domains installed
    if (globalDomainNames.length === 0 && localDomainNames.length === 0) {
      console.log(chalk.gray('No domains installed yet.'));
      console.log(chalk.gray('\nAdd domains with:'));
      console.log(chalk.cyan('  ccmesh add git'));
      console.log(chalk.cyan('  ccmesh add backend-node'));
      console.log(chalk.magenta('\nOr add globally:'));
      console.log(chalk.magenta('  ccmesh add --global git\n'));
      return;
    }

    // Summary
    const totalGlobal = globalDomainNames.length;
    const totalLocal = localDomainNames.filter(name => !globalDomains[name]).length;
    const allDomains = { ...globalDomains, ...localDomains };
    const totalAgents = Object.keys(allDomains).reduce((sum, name) => sum + allDomains[name].agents.length, 0);
    const totalSkills = Object.keys(allDomains).reduce((sum, name) => sum + allDomains[name].skills.length, 0);

    console.log(chalk.blue('─────────────────────────────────────'));
    console.log(chalk.green(`Total: ${totalGlobal} global, ${totalLocal} local domains | ${totalAgents} agents, ${totalSkills} skills\n`));
  } catch (error) {
    console.error(chalk.red('\n❌ Error:'), error instanceof Error ? error.message : 'Unknown error');
    process.exit(1);
  }
}
