import { ObjectLiteral } from 'typeorm';
export declare abstract class BaseEntity implements ObjectLiteral {
  id: number;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
}
