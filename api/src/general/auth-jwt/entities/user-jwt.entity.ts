/**
 * Entité et DTO pour l'authentification JWT
 * 
 * Ce fichier définit l'entité UserJwt qui représente un utilisateur
 * dans le système d'authentification JWT, ainsi que le DTO pour la création.
 * 
 * @module UserJwt
 */
import { Column, Entity, Index } from 'typeorm';
import { IsEmail, IsNotEmpty, IsOptional, IsBoolean } from 'class-validator';

import { BaseEntity } from '@utils/entities/base.entity';

/**
 * DTO pour la création d'un utilisateur JWT
 * 
 * Utilisé lors de l'inscription d'un nouvel utilisateur.
 */
export class UserJwtCreateDto {
  /** Nom d'utilisateur (requis) */
  @IsNotEmpty()
  username!: string;

  /** Mot de passe (requis) */
  @IsNotEmpty()
  password!: string;

  /** Indique si le compte est activé (optionnel, défaut: false) */
  @IsOptional()
  @IsBoolean()
  activated?: boolean;
}

/**
 * Entité représentant un utilisateur dans le système d'authentification JWT
 * 
 * Cette entité stocke les informations d'authentification d'un utilisateur,
 * incluant le nom d'utilisateur, le mot de passe hashé, et les tokens
 * d'activation et de réinitialisation de mot de passe.
 */
@Entity('user-jwt')
export class UserJwt extends BaseEntity {
  /** Nom d'utilisateur unique (indexé pour recherche rapide) */
  @Column('varchar', { nullable: false, length: 255 })
  @Index({ unique: true })
  username!: string;

  /** 
   * Mot de passe hashé avec bcrypt
   * 
   * Le champ est exclu des requêtes par défaut (select: false) pour des raisons de sécurité.
   * Il doit être explicitement demandé lors des requêtes nécessitant le mot de passe.
   */
  @Column('varchar', {
    name: 'password',
    nullable: false,
    length: 255,
    select: false,
  })
  password!: string;

  /** 
   * Indique si le compte utilisateur est activé
   * 
   * Par défaut, les nouveaux comptes ne sont pas activés (false).
   * Un compte doit être activé pour pouvoir se connecter.
   */
  @Column('boolean', { name: 'activated', default: false })
  activated = false;

  /** 
   * Token d'activation du compte
   * 
   * Généré lors de la création du compte et utilisé pour activer le compte
   * via un lien d'activation. Exclu des requêtes par défaut (select: false).
   */
  @Column('varchar', {
    name: 'activationToken',
    nullable: true,
    length: 255,
    select: false,
  })
  activationToken!: string | null;

  /** 
   * Token de réinitialisation de mot de passe
   * 
   * Généré lors d'une demande de réinitialisation de mot de passe.
   * Exclu des requêtes par défaut (select: false).
   */
  @Column('varchar', {
    name: 'forgetPasswordToken',
    nullable: true,
    length: 255,
    select: false,
  })
  forgetPasswordToken!: string | null;
} 