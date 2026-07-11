import { IsPlainObjectConstraint } from './is-plain-object.decorator';

describe('IsPlainObjectConstraint', () => {
  const constraint = new IsPlainObjectConstraint();
  const fakeArgs = {} as any;

  it('accepte un objet plain', () => {
    expect(constraint.validate({ uiScale: 1.2 }, fakeArgs)).toBe(true);
  });

  it('accepte un objet vide', () => {
    expect(constraint.validate({}, fakeArgs)).toBe(true);
  });

  it('rejette un tableau', () => {
    expect(constraint.validate([1, 2, 3], fakeArgs)).toBe(false);
    expect(constraint.validate([], fakeArgs)).toBe(false);
  });

  it('rejette null', () => {
    expect(constraint.validate(null, fakeArgs)).toBe(false);
  });

  it('rejette les types primitifs', () => {
    expect(constraint.validate('string', fakeArgs)).toBe(false);
    expect(constraint.validate(42, fakeArgs)).toBe(false);
    expect(constraint.validate(true, fakeArgs)).toBe(false);
    expect(constraint.validate(undefined, fakeArgs)).toBe(false);
  });

  it('expose un message par défaut', () => {
    expect(constraint.defaultMessage(fakeArgs)).toContain('plain object');
  });
});
