const ACTOGRAPH_API_URL = 'https://actograph.io/api';

const STORAGE_KEYS = {
  TOKEN: 'actograph_cloud_token',
  EMAIL: 'actograph_cloud_email',
  PASSWORD: 'actograph_cloud_password', // Note: localStorage n'est pas sécurisé, mais acceptable pour desktop
};

export interface IAuthToken {
  value: string;
  createdAt: string;
  id: number;
}

export interface ILoginResult {
  success: boolean;
  error?: string;
}

/**
 * Service d'authentification vers actograph.io pour l'application desktop
 * 
 * Gère :
 * - Login avec email/password
 * - Stockage des credentials dans localStorage
 * - Reconnexion automatique si token expiré
 */
class ActographAuthService {
  private token: string | null = null;
  private email: string | null = null;

  /**
   * Initialise le service en chargeant les credentials sauvegardés
   */
  async init(): Promise<void> {
    await this.loadStoredCredentials();
  }

  /**
   * Charge les credentials depuis localStorage
   */
  private async loadStoredCredentials(): Promise<void> {
    try {
      this.email = localStorage.getItem(STORAGE_KEYS.EMAIL);
      this.token = localStorage.getItem(STORAGE_KEYS.TOKEN);
    } catch (error) {
      console.error('Error loading stored credentials:', error);
    }
  }

  /**
   * Récupère le mot de passe stocké
   */
  private getStoredPassword(): string | null {
    try {
      return localStorage.getItem(STORAGE_KEYS.PASSWORD);
    } catch (error) {
      return null;
    }
  }

  /**
   * Sauvegarde les credentials
   */
  private saveCredentials(email: string, password: string, token: string): void {
    localStorage.setItem(STORAGE_KEYS.EMAIL, email);
    localStorage.setItem(STORAGE_KEYS.TOKEN, token);
    localStorage.setItem(STORAGE_KEYS.PASSWORD, password);

    this.email = email;
    this.token = token;
  }

  /**
   * Efface tous les credentials
   */
  private clearCredentials(): void {
    localStorage.removeItem(STORAGE_KEYS.EMAIL);
    localStorage.removeItem(STORAGE_KEYS.TOKEN);
    localStorage.removeItem(STORAGE_KEYS.PASSWORD);

    this.email = null;
    this.token = null;
  }

  /**
   * Connexion à actograph.io
   */
  async login(email: string, password: string): Promise<ILoginResult> {
    try {
      const response = await fetch(`${ACTOGRAPH_API_URL}/auth-tokens`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          login: email,
          password: password,
        }),
      });

      const data = await response.json();

      // Vérifier les erreurs
      if (data.code || data.message === 'Invalid credentials' || !data.value) {
        return {
          success: false,
          error: data.message || 'Identifiants invalides',
        };
      }

      // Sauvegarder les credentials
      this.saveCredentials(email, password, data.value);

      return { success: true };
    } catch (error) {
      console.error('Login error:', error);
      return {
        success: false,
        error: 'Erreur de connexion. Vérifiez votre connexion internet.',
      };
    }
  }

  /**
   * Déconnexion
   */
  async logout(): Promise<void> {
    this.clearCredentials();
  }

  /**
   * Tente une reconnexion automatique avec les credentials sauvegardés
   */
  async tryAutoReconnect(): Promise<boolean> {
    const password = this.getStoredPassword();

    if (!this.email || !password) {
      return false;
    }

    const result = await this.login(this.email, password);
    return result.success;
  }

  /**
   * Retourne le token actuel
   */
  getToken(): string | null {
    return this.token;
  }

  /**
   * Retourne l'email du compte connecté
   */
  getEmail(): string | null {
    return this.email;
  }

  /**
   * Vérifie si l'utilisateur est authentifié (a un token)
   */
  isAuthenticated(): boolean {
    return !!this.token;
  }

  /**
   * Vérifie si des credentials sont sauvegardés (pour reconnexion auto)
   */
  hasStoredCredentials(): boolean {
    const password = this.getStoredPassword();
    return !!this.email && !!password;
  }
}

// Singleton
export const actographAuthService = new ActographAuthService();
