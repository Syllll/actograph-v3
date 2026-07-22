import { TypeEnum } from '@utils/repositories/base.repositories';
import { buildExcludeArchivedFilterConditions } from './archived-filter.conditions';

describe('buildExcludeArchivedFilterConditions', () => {
  it('marks both OR leaves with type OR for processQuery', () => {
    const filter = buildExcludeArchivedFilterConditions();
    const orGroup = filter.conditions?.[0];
    expect(orGroup?.type).toBe(TypeEnum.OR);
    expect(orGroup?.conditions).toHaveLength(2);
    for (const leaf of orGroup?.conditions ?? []) {
      expect(leaf.type).toBe(TypeEnum.OR);
      expect(leaf.key).toBeDefined();
    }
  });
});
