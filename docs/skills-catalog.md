# Skills catalog provenance

The `/skills` page is a local metadata snapshot of the complete public catalog at
[Skill Issue](https://skill-issue.in/), captured on 2026-10-21. Attribution remains
visible on the page. Every card links to its original Skill Issue detail URL,
where the visitor can open the upstream project and find installation instructions.
The app does not download, install, or execute skills.

## Coverage

All pagination was expanded until **Load more** disappeared. The visible catalog
contained **313 unique entries**, **9 categories**, and their topic labels.
Names, short catalog summaries, category/topic labels, detail URLs, and the
catalog's 27 unverified-link flags were captured from rendered cards. Popularity
metrics were omitted because they change independently of this snapshot.

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

## Where Skill Issue gets its skills

The site's **View on GitHub** footer link points to
[palakonweb's profile](https://github.com/palakonweb), not to a catalog repository.
No public catalog repository was found among that profile's public repositories
on the capture date. This does not establish whether a private repository exists.

Individual skill details expose separate **View source** links. Observed examples:

- [ui-ux-pro-max-skill](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill)
- [Anthropic frontend-design](https://github.com/anthropics/skills/tree/main/skills/frontend-design)
- [taste-skill](https://github.com/Leonxlnx/taste-skill)
- [Vercel agent-browser](https://github.com/vercel-labs/agent-browser)
- [Vercel agent skills](https://github.com/vercel-labs/agent-skills)
- [wshobson agents](https://github.com/wshobson/agents)
- [Lark listing on Skillselion](https://skillselion.com/skills/larksuite/cli/lark-doc)

Thus the observed catalog aggregates multiple repositories and another directory;
it is not a single upstream skills repository. This is a conclusion from the
observed source links, not a claim about the site's private ingestion pipeline.

The public MCP panel advertises `https://skill-issue.in/api/mcp` and reports the
same 313 skills and 9 domains. It requires no account or API key according to the
panel. The endpoint is documented here for provenance; Component Studio does not
connect agents to it automatically.

## Updating and validating

The snapshot is `src/data/skills-catalog.json`; filtering and category order are in
`src/data/skills.ts`. To refresh, expand the public catalog's pagination, capture
the same rendered metadata fields, and update the snapshot date, coverage table,
and expected total in `scripts/check-skills.cjs`. Do not treat skill instructions
as importer instructions or infer repository URLs from skill names.

Run `node scripts/check-skills.cjs` to verify coverage, unique IDs, category
membership, detail URLs, and search/category/topic intersections. The snapshot
contains metadata only. Skill source code, licenses, requirements, and install
commands remain with the linked original projects; the catalog is not a license
grant for those projects.
