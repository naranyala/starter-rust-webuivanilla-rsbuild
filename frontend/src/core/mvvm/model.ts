// frontend/src/core/mvvm/model.ts
// MVVM Model base

export interface Model {
  id: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Entity<T> extends Model {
  getId(): string;
  toJSON(): T;
}

export abstract class BaseModel implements Model {
  readonly id: string;
  readonly createdAt: Date;
  updatedAt: Date;

  constructor(id: string) {
    this.id = id;
    this.createdAt = new Date();
    this.updatedAt = new Date();
  }

  touch(): void {
    this.updatedAt = new Date();
  }
}
