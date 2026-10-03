import { sectionInput } from './setup-draft';
import type { SetupDraft } from './setup.model';
describe('Project setup section payloads', () => {
  const draft: SetupDraft = {
    name: 'Apo',
    description: 'Work',
    accent: 'violet',
    clientId: 'private-client',
    warehouseIds: ['A', 'B'],
    defaultWarehouseId: 'B',
    rules: { lot: 'item', expiry: 'required', inspection: true },
    members: [{ userId: 'u', roleId: 'manager' }],
  };
  it('manager requests contain only editable general and default-warehouse fields', () => {
    expect(sectionInput('general', draft, false, 7)).toEqual({
      version: 7,
      name: 'Apo',
      description: 'Work',
      accent: 'violet',
    });
    expect(sectionInput('warehouses', draft, false, 7)).toEqual({
      version: 7,
      defaultWarehouseId: 'B',
    });
  });
  it('section saves do not overwrite edits owned by another section', () => {
    expect(sectionInput('rules', draft, true, 8)).toEqual({
      version: 8,
      lot: 'item',
      expiry: 'required',
      inspection: true,
    });
    expect(sectionInput('members', draft, true, 8)).toEqual({ version: 8, members: draft.members });
  });
});
