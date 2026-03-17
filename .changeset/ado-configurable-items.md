---
"@bradygaster/squad-sdk": minor
---

ADO configurable work item types, area paths, and iteration support (#240)

- Add `getAvailableWorkItemTypes(org, project)` for process template introspection
- Add `validateWorkItemType(org, project, typeName)` for pre-creation validation
- Add `WorkItemTypeInfo` interface for type metadata
- Enhance `AzureDevOpsAdapter` with instance-level `getAvailableWorkItemTypes()` and `validateWorkItemType()` methods
- Support optional `validateType` flag in `createWorkItem()` to check type before creation
- Enhance `squad init` to introspect available work item types and store `_availableTypes` hint in `.squad/config.json`
- Support `adoConfig` in `InitOptions` for explicit work item type, area path, and iteration path during init
- Graceful fallback to default types (User Story, Bug, Task) when az CLI is unavailable
