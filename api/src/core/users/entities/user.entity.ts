import {
  JoinColumn,
  Column,
  Entity,
  OneToOne,
  AfterInsert,
  AfterLoad,
  AfterUpdate,
  OneToMany,
} from 'typeorm';
import { Expose } from 'class-transformer';

import { BaseEntity } from '@utils/entities/base.entity';
import { UserJwt } from '@auth-jwt/entities/user-jwt.entity';
import { GROUP_USER, GROUP_ADMIN } from '../serializationGroups/groups';
import { UserRoleEnum } from '../utils/user-role.enum';
import { License } from '@core/security/entities/license.entity';
import { Observation } from '@core/observations/entities/observation.entity';
import { Protocol } from '@core/observations/entities/protocol.entity';
// glutamat: imports

/**
 * Entité User représentant un utilisateur de l'application.
 * Cette entité étend BaseEntity et contient les informations de profil utilisateur,
 * les préférences, les rôles et les relations avec d'autres entités.
 */
@Entity('users')
export class User extends BaseEntity {
  /** Prénom de l'utilisateur (exposé aux groupes USER et ADMIN) */
  @Expose({ groups: [GROUP_USER, GROUP_ADMIN] })
  @Column('varchar', { length: 200, nullable: true })
  firstname!: string | null;

  /** Nom de famille de l'utilisateur (exposé aux groupes USER et ADMIN) */
  @Expose({ groups: [GROUP_USER, GROUP_ADMIN] })
  @Column('varchar', { length: 200, nullable: true })
  lastname!: string | null;

  /** Nom complet de l'utilisateur (généré automatiquement) */
  fullname!: string;

  /**
   * Génère le nom complet à partir du prénom et du nom de famille.
   * Appelé automatiquement après le chargement, l'insertion ou la mise à jour de l'entité.
   */
  @AfterLoad()
  @AfterInsert()
  @AfterUpdate()
  generateFullName(): void {
    this.fullname = `${this.firstname} ${this.lastname}`;
  }

  /** Indique si une réinitialisation de mot de passe est en cours */
  @Column({ nullable: false, default: false })
  resetPasswordOngoing!: boolean;

  /**
   * Liste des rôles de l'utilisateur.
   * Par défaut, l'utilisateur a le rôle "User".
   * Un utilisateur peut avoir plusieurs rôles.
   */
  @Column({
    type: 'simple-array',
    enum: UserRoleEnum,
    default: UserRoleEnum.User,
    nullable: false,
  })
  roles!: UserRoleEnum[];

  /** Préférence de thème sombre de l'utilisateur (par défaut: true) */
  @Column({ nullable: false, default: true })
  preferDarkTheme!: boolean;

  /**
   * Vérifie si l'utilisateur a le rôle administrateur.
   * @returns true si l'utilisateur est administrateur, false sinon
   */
  @Expose()
  get isAdmin(): boolean {
    return this.roles.includes(UserRoleEnum.Admin);
  }

  // ****
  // ! Relations
  // ****
  // glutamat: relations

  /**
   * Relation OneToOne avec UserJwt.
   * Contient les informations d'authentification JWT de l'utilisateur.
   * Cascade: update, remove, soft-remove
   */
  @OneToOne(() => UserJwt, {
    cascade: ['update', 'remove', 'soft-remove'],
    eager: false,
  })
  @JoinColumn()
  userJwt!: UserJwt;

  /** Liste des licences associées à l'utilisateur */
  @OneToMany(() => License, (license) => license.user)
  licenses?: License[];

  /** Liste des observations créées par l'utilisateur */
  @OneToMany(() => Observation, (observation) => observation.user)
  observations?: Observation[];

  /** Liste des protocoles créés par l'utilisateur */
  @OneToMany(() => Protocol, (protocol) => protocol.user)
  protocols?: Protocol[];

  constructor(partial: Partial<User>) {
    super();
    Object.assign(this, partial);
  }
}

/** Liste de toutes les relations de l'entité User (utilisée pour les requêtes avec relations) */
export const allRelations = [];
