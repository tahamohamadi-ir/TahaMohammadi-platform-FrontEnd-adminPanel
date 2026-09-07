# Admin Panel Manifest

<!-- PRODUCT-V2.1 -->

Current execution target: research-first bilingual portfolio, independently publishable detail pages and broad CMS editing under ADR-0010. Dispatch only this repository's packets from `../../Docs/05-delivery/concept-alignment-v2/EXECUTION.md` (paths here are repository-relative). Older scaffold/phase status below is a dated baseline, not current feature acceptance. Preserve current endpoints until the additive target contract is implemented and exported.
<!-- /PRODUCT-V2.1 -->

| Item                  | Value                                                                                  |
| --------------------- | -------------------------------------------------------------------------------------- |
| Repository            | `tahamohamadi-ir/TahaMohammadi-platform-FrontEnd-adminPanel`                           |
| Local path            | `D:\Project\tahamohammadi-platform\Front-End\admin-panel`                              |
| Product role          | Authenticated CMS administration frontend                                              |
| Status                | Existing source baseline; V2.1 product implementation and acceptance OPEN              |
| Primary upstream      | Backend admin API at `/api/v1/admin/`                                                  |
| Canonical shared docs | `D:\Project\tahamohammadi-platform\Docs`                                               |
| Design authority      | `D:\Project\tahamohammadi-platform\Docs\references\frontend-design-authority`          |
| Local intake policy   | `..\Assets` is ignored input only; imports and implementation decisions are prohibited |
| Legacy source policy  | Workflow evidence only; code reuse prohibited                                          |
| Accepted stack        | React, TypeScript, Vite                                                                |

## Owned outcomes

Authentication UI, content authoring, translation status, media library, composition, timelines, graph editing/validation, scheduling, revision history, publishing workflow, site configuration, and operational feedback.

## Explicitly not owned

Authorization truth, database models, server validation, published public rendering, backup execution, secret management, and release approval.
