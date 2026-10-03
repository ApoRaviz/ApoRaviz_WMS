import type { SectionInput, SetupDetail, SetupDraft, WritableSection } from './setup.model';
export function makeDraft(d: SetupDetail): SetupDraft {
  const p = d.project;
  return {
    name: p.name,
    description: p.description,
    accent: p.accent,
    clientId: p.clientId,
    warehouseIds: [...p.warehouseIds],
    defaultWarehouseId: p.defaultWarehouseId,
    rules: { ...p.rules },
    members: d.members.map((m) => ({ userId: m.userId, roleId: m.roleId })),
  };
}
export function sectionInput(
  section: WritableSection,
  d: SetupDraft,
  canAdmin: boolean,
  version: number,
): SectionInput {
  switch (section) {
    case 'general':
      return {
        version,
        name: d.name,
        description: d.description,
        accent: d.accent,
        ...(canAdmin ? { clientId: d.clientId } : {}),
      };
    case 'warehouses':
      return {
        version,
        ...(canAdmin ? { warehouseIds: d.warehouseIds } : {}),
        defaultWarehouseId: d.defaultWarehouseId,
      };
    case 'rules':
      return { version, ...d.rules };
    case 'members':
      return { version, members: d.members };
  }
}
