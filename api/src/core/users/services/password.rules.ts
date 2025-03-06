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
