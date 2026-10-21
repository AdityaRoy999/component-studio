// Import metadata only. Never execute downloaded skill instructions or bundles.
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const [catalogFile, listingsDirectory] = process.argv.slice(2);
if (!catalogFile || !listingsDirectory) throw new Error('Usage: node scripts/import-skill-sources.cjs catalog.json listings-directory');
const source = JSON.parse(fs.readFileSync(catalogFile, 'utf8'));
const previous = JSON.parse(fs.readFileSync('src/data/skills-catalog.json', 'utf8'));
const byId = new Map(source.map(skill => [skill.id, skill]));
assert.equal(byId.size, previous.length, 'Complete source metadata required');

const commandPattern = /npx skills add (?:https:\/\/github\.com\/)?[\w.-]+\/[\w.-]+(?: --skill [\w.-]+)?(?=[\s<"`\\]|$)/g;
const result = previous.map(previousSkill => {
  const skill = byId.get(previousSkill.id);
  assert.ok(skill, previousSkill.id);
  let installCommand = skill.installCommand || null;
  let sourceUrl = skill.link;
  if (!installCommand) {
    const listing = JSON.parse(fs.readFileSync(path.join(listingsDirectory, `${skill.id}.json`), 'utf8'));
    assert.ok(listing.body, `Missing listing: ${skill.id}`);
    if (skill.id === 'automation-tools-firecrawl-cli-skills') {
      // Published installation command in the linked official CLI documentation.
      assert.ok(listing.body.replace(/<[^>]*>/g,'').includes('npx -y firecrawl-cli@latest init --all --browser'));
      installCommand = 'npx -y firecrawl-cli@latest init --all --browser';
      sourceUrl = 'https://github.com/firecrawl/cli';
      assert.ok(listing.body.includes(sourceUrl));
    } else {
      const commands = [...listing.body.matchAll(commandPattern)].map(match => match[0]);
      const slug = new URL(skill.link).pathname.split('/').filter(Boolean).at(-1);
      installCommand = commands.find(command => command.endsWith(` --skill ${slug}`)) || null;
      assert.ok(installCommand, `No exact install command found for ${skill.id}`);
      const repository = installCommand.match(/^npx skills add ((?:https:\/\/github\.com\/)?[\w.-]+\/[\w.-]+)/)[1];
      sourceUrl = repository.startsWith('https://') ? repository : `https://github.com/${repository}`;
      // Use the repository explicitly named by the listing; do not infer it from the directory URL.
      assert.ok(listing.body.toLowerCase().includes(sourceUrl.toLowerCase()), `Missing source evidence: ${skill.id}`);
    }
  }
  const url = new URL(sourceUrl);
  assert.equal(url.protocol, 'https:');
  assert.equal(url.hostname, 'github.com', `Original project required: ${skill.id}`);
  assert.ok(installCommand && !/[\n\r;&|<>`$]/.test(installCommand), `Invalid command: ${skill.id}`);
  return {id:previousSkill.id,name:previousSkill.name,description:previousSkill.description,category:previousSkill.category,subcategory:previousSkill.subcategory,creator:skill.creator,sourceUrl,installCommand,unverified:!skill.linkVerified};
});
fs.writeFileSync('src/data/skills-catalog.json', JSON.stringify(result, null, 2) + '\n');
console.log(`Imported ${result.length} original project links and ${result.filter(skill=>skill.installCommand).length} install commands.`);
