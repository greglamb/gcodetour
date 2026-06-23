# Vendored diagram toolchain (pinned)

These are the pinned, in-repo dependencies used to render gCodeTour diagram SVGs.
Nothing here is fetched from a remote URL at render time, and **playback of a
tour requires none of it** — only authoring/re-rendering does (see
[`scripts/render-diagrams.sh`](../../scripts/render-diagrams.sh)).

## Renderer

- **Image:** `yuzutech/kroki:0.29.1`
- **Digest (authoritative):** `sha256:6d70ed44236102613e1155185340680644dded2191ff0be4f559fb31b92065d9`

Kroki bundles PlantUML (and Graphviz), so C4 and activity/swim-lane diagrams all
render from the one pinned image. The render script pins by digest; the tag is
only for humans. To move to a newer Kroki, `docker pull` the new tag, copy its
`Digest:` into the script and this file, and re-render.

## C4-PlantUML (`c4/`)

- **Version:** v2.11.0 (`plantuml-stdlib/C4-PlantUML`)
- **Files:** `C4.puml` (base) + `C4_Context`, `C4_Container`, `C4_Component`,
  `C4_Dynamic`, `C4_Deployment`, `C4_Sequence`.

The files are the authentic upstream copies. Each view file (e.g.
`C4_Container.puml`) selects between a **local** relative include and a remote
URL based on whether the `RELATIVE_INCLUDE` preprocessor variable is defined.
Our diagram sources always define it (`!$RELATIVE_INCLUDE = "."`), so the local
branch is taken and the remote `!include https://…` fallback is never executed.
The render script mounts this directory as the PlantUML include path, so
`!include C4_Container.puml` resolves here.

To update C4-PlantUML, replace these files from the desired upstream tag and
update the version above.
