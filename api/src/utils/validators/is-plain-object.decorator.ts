import {
  ValidatorConstraint,
  ValidatorConstraintInterface,
  ValidationArguments,
  registerDecorator,
  ValidationOptions,
} from 'class-validator';

/**
 * Contrainte de validation : accepte uniquement un "plain object"
 * (objet non null, non tableau). Utilisé pour les champs libres de type
 * `Record<string, unknown>` (ex: observation.meta) où `@IsObject()` de
 * class-validator laisse passer les tableaux.
 */
@ValidatorConstraint({ name: 'isPlainObject', async: false })
export class IsPlainObjectConstraint implements ValidatorConstraintInterface {
  validate(value: unknown, _args: ValidationArguments): boolean {
    return (
      value !== null &&
      typeof value === 'object' &&
      !Array.isArray(value)
    );
  }

  defaultMessage(_args: ValidationArguments): string {
    return '$property must be a plain object (arrays and null are not allowed)';
  }
}

/**
 * Décorateur de validation : le champ doit être un plain object.
 * À combiner avec `@IsOptional()` pour autoriser l'absence de valeur.
 */
export function IsPlainObject(
  validationOptions?: ValidationOptions,
): PropertyDecorator {
  return function (object: object, propertyName: string | symbol) {
    registerDecorator({
      name: 'isPlainObject',
      target: object.constructor,
      propertyName: String(propertyName),
      constraints: [],
      options: validationOptions,
      validator: IsPlainObjectConstraint,
    });
  };
}
