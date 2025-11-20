# Authentification

Ce document décrit le système d'authentification de l'application ActoGraph v3, basé sur JWT (JSON Web Tokens).

## Vue d'ensemble

L'application utilise un système d'authentification JWT pour sécuriser l'accès à l'API. Les tokens JWT sont émis lors de la connexion et doivent être inclus dans toutes les requêtes authentifiées.

## Architecture

### Backend

L'authentification est gérée par le module `auth-jwt` dans `api/src/general/auth-jwt/` :

- **Strategy** : `JwtStrategy` utilise Passport pour valider les tokens JWT
- **Service** : `UserJwtService` gère la création et la validation des tokens
- **Controller** : `AuthJwtController` expose les endpoints d'authentification
- **Guard** : `JwtAuthGuard` protège les routes nécessitant une authentification

### Frontend

L'authentification côté frontend est gérée par le composable `use-auth` dans `front/lib-improba/composables/use-auth/` :

- Gestion de l'état de connexion
- Stockage du token dans les cookies
- Configuration d'Axios pour inclure le token dans les requêtes
- Protection des routes via le router

## Flux d'authentification

### 1. Connexion (Login)

```typescript
// Frontend
const { methods } = useAuth(router);
await methods.login(username, password);
```

**Processus :**
1. L'utilisateur saisit son nom d'utilisateur et son mot de passe
2. Le frontend envoie une requête POST à `/auth-jwt/login`
3. Le backend vérifie les identifiants avec `bcrypt`
4. Si valides, un token JWT est généré et retourné
5. Le token est stocké dans un cookie sécurisé
6. Le token est ajouté aux en-têtes HTTP d'Axios

**Endpoint backend :**
```
POST /auth-jwt/login
Body: { username: string, password: string }
Response: { token: string }
```

### 2. Validation du token

À chaque requête authentifiée :

1. Le token est extrait de l'en-tête `Authorization: Bearer <token>`
2. `JwtStrategy` valide le token avec le secret JWT
3. Le payload du token contient l'ID de l'utilisateur
4. L'utilisateur est chargé depuis la base de données
5. L'utilisateur est attaché à la requête (`req.user`)

### 3. Rafraîchissement du token

Le token peut être rafraîchi sans reconnecter l'utilisateur :

```typescript
// Frontend
await methods.attemptLogin();
```

**Endpoint backend :**
```
POST /auth-jwt/refreshToken
Body: { token: string }
Response: { token: string }
```

### 4. Déconnexion (Logout)

```typescript
// Frontend
methods.logout();
```

Le token est supprimé des cookies et l'utilisateur est redirigé vers la page d'accueil.

## Configuration

### Variables d'environnement

**Backend (`api/.env`) :**
```env
JWT_SECRET=votre_secret_jwt_tres_securise
```

⚠️ **Important** : Utilisez un secret JWT fort et unique en production. Ne commitez jamais le secret dans le dépôt Git.

### Configuration JWT Strategy

```typescript:api/src/core/users/jwt.strategy.ts
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt-user') {
  constructor(private readonly userService: UserService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET,
    });
  }

  async validate(payload: any): Promise<User> {
    const authId = payload.id;
    const user = await this.userService.findFromUserJwtId(authId);
    if (!user) throw new NotFoundException('User not found');
    return user;
  }
}
```

## Protection des routes

### Backend

Utilisez le guard `JwtAuthGuard` pour protéger les routes :

```typescript
@Controller('observations')
export class ObservationController extends BaseController {
  @Get()
  @UseGuards(JwtAuthGuard)
  async findAll(@Req() req: any) {
    // req.user contient l'utilisateur authentifié
    const userId = req.user.id;
    // ...
  }
}
```

### Frontend

Le router Vue est configuré pour vérifier l'authentification :

```typescript
// Les routes protégées nécessitent une authentification
// Le composable use-auth gère la redirection si non authentifié
```

## Gestion des utilisateurs

### Création d'un utilisateur

**Endpoint :**
```
POST /auth-jwt/register
Body: { username: string, password: string }
```

Le mot de passe est automatiquement hashé avec `bcrypt` avant stockage.

### Rôles et permissions

L'application utilise un système de rôles (`UserRoleEnum`) :

- **User** : Utilisateur standard
- **Admin** : Administrateur avec droits étendus

Les permissions sont vérifiées avec `UserRolesGuard` :

```typescript
@Get()
@UseGuards(JwtAuthGuard, UserRolesGuard)
@Roles(UserRoleEnum.Admin)
async adminOnly() {
  // ...
}
```

## Sécurité

### Bonnes pratiques

1. **Secrets JWT** : Utilisez des secrets forts et uniques par environnement
2. **HTTPS** : Toujours utiliser HTTPS en production pour protéger les tokens
3. **Expiration** : Les tokens JWT ont une expiration (configurée dans la stratégie)
4. **Cookies** : Les cookies sont configurés avec les options de sécurité appropriées
5. **Validation** : Toujours valider les entrées utilisateur côté serveur

### Stockage du token

Le token est stocké dans un cookie avec les options suivantes :

```typescript
const cookieOptions = {
  expires: 7, // 7 jours
  httpOnly: false, // Accessible depuis JavaScript (nécessaire pour Axios)
  secure: process.env.NODE_ENV === 'production', // HTTPS uniquement en production
  sameSite: 'strict',
};
```

### Hashage des mots de passe

Les mots de passe sont hashés avec `bcrypt` (10 rounds) :

```typescript
const hashedPassword = await bcrypt.hash(password, 10);
const isValid = await bcrypt.compare(password, hashedPassword);
```

## Réinitialisation de mot de passe

### Demande de réinitialisation

**Endpoint :**
```
POST /auth-jwt/password-forgot
Body: { username: string, resetPasswordUrl: string }
```

Un token de réinitialisation est généré et envoyé par email.

### Réinitialisation

**Endpoint :**
```
POST /auth-jwt/reset-password
Body: { token: string, newPassword: string }
```

## Dépannage

### Token invalide ou expiré

Si vous recevez une erreur 401 (Unauthorized) :

1. Vérifiez que le token est bien inclus dans les en-têtes
2. Vérifiez que le token n'est pas expiré
3. Vérifiez que `JWT_SECRET` est correctement configuré
4. Tentez de rafraîchir le token avec `attemptLogin()`

### Problèmes de cookies

Si les cookies ne sont pas stockés :

1. Vérifiez les paramètres du navigateur (cookies bloqués)
2. Vérifiez que le domaine et le chemin sont corrects
3. En développement, vérifiez que `secure: false` si vous utilisez HTTP

### Utilisateur non trouvé

Si l'authentification échoue avec "User not found" :

1. Vérifiez que l'utilisateur existe dans la base de données
2. Vérifiez que l'utilisateur est activé (`activated = true`)
3. Vérifiez que le payload JWT contient le bon ID utilisateur

## Exemples

### Connexion complète

```typescript
// Frontend
import { useAuth } from '@lib-improba/composables/use-auth';
import { useRouter } from 'vue-router';

const router = useRouter();
const { methods } = useAuth(router);

try {
  await methods.login('username', 'password');
  // Redirection automatique vers la page d'accueil
} catch (error) {
  console.error('Erreur de connexion:', error);
}
```

### Requête authentifiée

```typescript
// Le token est automatiquement inclus par Axios
const response = await api().get('/observations');
// Les en-têtes incluent : Authorization: Bearer <token>
```

### Vérification de l'état de connexion

```typescript
const { sharedState } = useAuth(router);

if (sharedState.user) {
  console.log('Utilisateur connecté:', sharedState.user);
} else {
  console.log('Non connecté');
}
```

