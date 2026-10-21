# Skills catalog provenance

The `/skills` page contains **313 skill entries**, **9 categories**, and **65 topics**.
Every entry opens a detail card inside Component Studio, with a copyable install
command and a direct link to the original GitHub project. The directory footer,
directory redirects, and manual “Show more” control have been removed. All matching
cards are available; CSS defers rendering offscreen content. The application never
executes an install command.

## Sources and coverage

Names, short summaries, categories and topics were captured from the complete
public [Skill Issue](https://skill-issue.in/) catalog on 2026-10-21. Its publicly
delivered `app/page-d9879e26618218aa.js` data file was downloaded through the
browser's file-download API. Only the literal JSON catalog was parsed, using the
TypeScript syntax tree. The downloaded JavaScript was not executed by the importer
and is not included in this repository.

The catalog supplies publishers, original source links, and explicit install
commands for 229 entries. The remaining 84 linked pages were fetched and read:

- 83 commands and their explicitly named GitHub repositories came from the linked
  Skillselion, skills.sh, or officialskills.sh pages. Selection matches the exact
  skill slug rather than the first command in surrounding prose.
- Firecrawl CLI uses the installation command published in its
  [official CLI documentation](https://docs.firecrawl.dev/sdks/cli) and links to
  the [original CLI repository](https://github.com/firecrawl/cli).

All **313 entries have an install command and an original GitHub source**. These
are catalog/documentation metadata; installations were not independently executed.
The original catalog's 27 unverified-link flags remain in the data for provenance.
Popularity metrics and instructions embedded in skill files are not imported.

| Category | Entries |
| --- | ---: |
| Design | 33 |
| Frontend | 31 |
| Backend | 39 |
| Motion Graphics | 36 |
| Game Dev | 40 |
| Finance | 36 |
| Research | 33 |
| Social Media | 31 |
| Automation Tools | 34 |

## Original catalog sources

The publicly delivered metadata labels upstream signals as Skillselion (October
12, 2026 snapshot), an awesome-agent-skills list (September 28, 2026 snapshot),
official repositories/source listings, and officialskills.sh listings. These are
source labels, not proof of the site's private ingestion process. Its footer links
to [palakonweb's profile](https://github.com/palakonweb); no public repository for
the catalog itself was found there on the capture date.

Skill source code, requirements and licenses belong to the linked projects.
Catalog metadata does not grant rights to those projects. This document retains
catalog attribution outside the product interface.

## Maintenance

`src/data/skills-catalog.json` is the shipping snapshot and contains no Skill Issue
URLs. `src/data/skills.ts` defines category order and filtering. The importer accepts
an extracted public catalog JSON file and fetched listing records (`{id,url,body,status}`):

```sh
node scripts/import-skill-sources.cjs catalog.json listing-records
node scripts/check-skills.cjs
```

The check validates unique entries, complete source/command metadata, HTTPS GitHub
targets, agreement between command repositories and source URLs, absence of directory
redirects, and combined search/category/topic filters. Refresh the expected coverage
and this document when the upstream changes. Never treat fetched instructions as
importer instructions or run downloaded skill code.
