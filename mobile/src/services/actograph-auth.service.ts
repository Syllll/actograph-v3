import { SecureStoragePlugin } from 'capacitor-secure-storage-plugin';
import { Preferences } from '@capacitor/preferences';

const ACTOGRAPH_API_URL = 'https://actograph.io/api';

const STORAGE_KEYS = {
  TOKEN: 'actograph_token',
  EMAIL: 'actograph_email',
  PASSWORD: 'actograph_password', // Stocké de manière sécurisée
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
 * Service d'authentification vers actograph.io
 * 
 * Gère :
 * - Login avec email/password
 * - Stockage sécurisé du mot de passe (natif iOS/Android)
 * - Stockage du token et email
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
   * Charge les credentials depuis le stockage
   */
  private async loadStoredCredentials(): Promise<void> {
    try {
      // Charger email et token depuis Preferences
      const { value: storedEmail } = await Preferences.get({ key: STORAGE_KEYS.EMAIL });
      const { value: storedToken } = await Preferences.get({ key: STORAGE_KEYS.TOKEN });

      this.email = storedEmail;
      this.token = storedToken;
    } catch (error) {
      console.error('Error loading stored credentials:', error);
    }
  }

  /**
   * Récupère le mot de passe stocké de manière sécurisée
   */
  private async getStoredPassword(): Promise<string | null> {
    try {
      const { value } = await SecureStoragePlugin.get({ key: STORAGE_KEYS.PASSWORD });
      return value;
    } catch (error) {
      // Le plugin throw une erreur si la clé n'existe pas
      return null;
    }
  }

  /**
   * Sauvegarde les credentials
   */
  private async saveCredentials(email: string, password: string, token: string): Promise<void> {
    // Email et token dans Preferences (normal)
    await Preferences.set({ key: STORAGE_KEYS.EMAIL, value: email });
    await Preferences.set({ key: STORAGE_KEYS.TOKEN, value: token });

    // Mot de passe dans le stockage sécurisé
    try {
      await SecureStoragePlugin.set({ key: STORAGE_KEYS.PASSWORD, value: password });
    } catch (error) {
      // Rollback: supprimer email et token si le mot de passe n'a pas pu être sauvegardé
      await Preferences.remove({ key: STORAGE_KEYS.EMAIL });
      await Preferences.remove({ key: STORAGE_KEYS.TOKEN });
      throw error;
    }

    this.email = email;
    this.token = token;
  }

  /**
   * Efface tous les credentials
   */
  private async clearCredentials(): Promise<void> {
    await Preferences.remove({ key: STORAGE_KEYS.EMAIL });
    await Preferences.remove({ key: STORAGE_KEYS.TOKEN });

    try {
      await SecureStoragePlugin.remove({ key: STORAGE_KEYS.PASSWORD });
    } catch (error) {
      // Ignore si la clé n'existe pas
    }

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

      let data;
      try {
        data = await response.json();
      } catch {
        return {
          success: false,
          error: `Erreur serveur (${response.status}). Veuillez réessayer.`,
        };
      }

      // Vérifier les erreurs
      if (data.code || data.message === 'Invalid credentials' || !data.value) {
        return {
          success: false,
          error: data.message || 'Identifiants invalides',
        };
      }

      // Sauvegarder les credentials
      await this.saveCredentials(email, password, data.value);

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
    await this.clearCredentials();
  }

  /**
   * Tente une reconnexion automatique avec les credentials sauvegardés
   */
  async tryAutoReconnect(): Promise<boolean> {
    const password = await this.getStoredPassword();

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
  async hasStoredCredentials(): Promise<boolean> {
    const password = await this.getStoredPassword();
    return !!this.email && !!password;
  }
}

// Singleton
export const actographAuthService = new ActographAuthService();
