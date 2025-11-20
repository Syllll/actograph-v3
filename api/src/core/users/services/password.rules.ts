/**
 * Valide un mot de passe selon les règles de sécurité définies.
 *
 * Règles de validation :
 * - Le mot de passe ne doit pas être vide
 * - Longueur minimale : 6 caractères
 * - Longueur maximale : 554 caractères
 * - Doit contenir au moins une lettre minuscule
 * - Doit contenir au moins une lettre majuscule
 * - Doit contenir au moins un chiffre
 *
 * @param password - Le mot de passe à valider
 * @returns `true` si le mot de passe est valide, sinon un message d'erreur en français
 */
export const passwordCheckRules = (password: string): boolean | string => {
  if (!password) return 'Pas de mot de passe';
  else if (password.length >= 555) return 'Mot de passe trop long';
  else if (password.length < 6) return 'Mot de passe trop court';
  else if (!/[a-z]/.test(password)) return 'Format du mot de passe erroné';
  else if (!/[A-Z]/.test(password)) return 'Format du mot de passe erroné';
  else if (!/[0-9]/.test(password)) return 'Format du mot de passe erroné';
  // else if (!/[$&+,:;=?@#|'<>.^*()%!-]/.test(password))
  //  return 'Format du mot de passe erroné';

  return true;
};
