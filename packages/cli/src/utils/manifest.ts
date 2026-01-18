import * as fs from 'fs-extra';
import * as path from 'path';
import * as os from 'os';
import { Manifest, ManifestDomain } from '../types';

const LOCAL_MANIFEST_PATH = '.claude/claudemesh.json';

function getManifestPath(global = false): string {
  if (global) {
    return path.join(os.homedir(), '.claude', 'claudemesh.json');
  }
  return LOCAL_MANIFEST_PATH;
}

export async function readManifest(global = false): Promise<Manifest> {
  const manifestPath = getManifestPath(global);
  if (await fs.pathExists(manifestPath)) {
    return await fs.readJSON(manifestPath);
  }

  return {
    version: '1.0.0',
    domains: {},
  };
}

export async function writeManifest(manifest: Manifest, global = false): Promise<void> {
  const manifestPath = getManifestPath(global);
  await fs.writeJSON(manifestPath, manifest, { spaces: 2 });
}

export async function addDomainToManifest(
  domainName: string,
  version: string,
  agents: string[],
  skills: string[],
  global = false
): Promise<void> {
  const manifest = await readManifest(global);

  manifest.domains[domainName] = {
    version,
    agents,
    skills,
  };

  await writeManifest(manifest, global);
}

export async function removeDomainFromManifest(domainName: string, global = false): Promise<void> {
  const manifest = await readManifest(global);
  delete manifest.domains[domainName];
  await writeManifest(manifest, global);
}

export async function getDomainInfo(domainName: string, global = false): Promise<ManifestDomain | null> {
  const manifest = await readManifest(global);
  return manifest.domains[domainName] || null;
}

export async function getAllDomains(global = false): Promise<Record<string, ManifestDomain>> {
  const manifest = await readManifest(global);
  return manifest.domains;
}

export async function getAllDomainsCombined(): Promise<{
  global: Record<string, ManifestDomain>;
  local: Record<string, ManifestDomain>;
}> {
  const globalDomains = await readManifest(true);
  const localDomains = await readManifest(false);

  return {
    global: globalDomains.domains,
    local: localDomains.domains,
  };
}

export async function initManifest(global = false): Promise<void> {
  const manifest: Manifest = {
    version: '1.0.0',
    domains: {},
  };
  await writeManifest(manifest, global);
}
