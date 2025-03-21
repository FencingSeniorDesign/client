import { eq, and, or, inArray, SQL } from 'drizzle-orm';
import { sqliteTable } from 'drizzle-orm/sqlite-core';
import db from './client';

/**
 * Base Repository interface
 * Defines the contract for all repositories
 */
export interface IBaseRepository<T, I> {
  findById(id: number | string): Promise<T | undefined>;
  findAll(): Promise<T[]>;
  findByField(field: keyof T, value: any): Promise<T[]>;
  findOneByField(field: keyof T, value: any): Promise<T | undefined>;
  findByFields(fields: Partial<T>): Promise<T[]>;
  findByIds(ids: (number | string)[]): Promise<T[]>;
  create(data: I): Promise<T>;
  createMany(data: I[]): Promise<T[]>;
  update(id: number | string, data: Partial<T>): Promise<T | undefined>;
  delete(id: number | string): Promise<boolean>;
  deleteByField(field: keyof T, value: any): Promise<number>;
  count(): Promise<number>;
  executeQuery<R>(queryFn: (table: any, db: any) => Promise<R>): Promise<R>;
}

/**
 * Base repository class that provides common database operations
 * for entities in the application using Drizzle ORM.
 * @template T - The entity type
 * @template I - The insert type (for creating new records)
 */
export class BaseRepository<T extends Record<string, any>, I> implements IBaseRepository<T, I> {
  constructor(
    protected table: any, // The Drizzle table definition
    protected primaryKey: keyof T = 'id' as keyof T // Default primary key
  ) {}

  /**
   * Find all records in the table
   */
  async findAll(): Promise<T[]> {
    return db.select().from(this.table);
  }

  /**
   * Find a record by its primary key
   */
  async findById(id: number | string): Promise<T | undefined> {
    const results = await db
      .select()
      .from(this.table)
      .where(eq(this.table[this.primaryKey], id))
      .limit(1);
    
    return results.length > 0 ? results[0] : undefined;
  }

  /**
   * Find records by a field and value
   */
  async findByField(field: keyof T, value: any): Promise<T[]> {
    return db
      .select()
      .from(this.table)
      .where(eq(this.table[field], value));
  }

  /**
   * Find a single record by a field and value
   */
  async findOneByField(field: keyof T, value: any): Promise<T | undefined> {
    const results = await db
      .select()
      .from(this.table)
      .where(eq(this.table[field], value))
      .limit(1);
    
    return results.length > 0 ? results[0] : undefined;
  }

  /**
   * Find records by multiple fields (AND condition)
   */
  async findByFields(fields: Partial<T>): Promise<T[]> {
    const conditions: SQL[] = [];
    
    for (const [key, value] of Object.entries(fields)) {
      conditions.push(eq(this.table[key], value));
    }
    
    return db
      .select()
      .from(this.table)
      .where(and(...conditions));
  }

  /**
   * Find records by IDs
   */
  async findByIds(ids: (number | string)[]): Promise<T[]> {
    if (ids.length === 0) return [];
    
    return db
      .select()
      .from(this.table)
      .where(inArray(this.table[this.primaryKey], ids));
  }

  /**
   * Create a new record
   */
  async create(data: I): Promise<T> {
    const result = await db.insert(this.table).values(data).returning();
    return result[0];
  }

  /**
   * Create multiple records
   */
  async createMany(data: I[]): Promise<T[]> {
    if (data.length === 0) return [];
    
    const result = await db.insert(this.table).values(data).returning();
    return result;
  }

  /**
   * Update a record by ID
   */
  async update(id: number | string, data: Partial<T>): Promise<T | undefined> {
    const result = await db
      .update(this.table)
      .set(data)
      .where(eq(this.table[this.primaryKey], id))
      .returning();
    
    return result.length > 0 ? result[0] : undefined;
  }

  /**
   * Delete a record by ID
   */
  async delete(id: number | string): Promise<boolean> {
    const result = await db
      .delete(this.table)
      .where(eq(this.table[this.primaryKey], id))
      .returning();
    
    return result.length > 0;
  }

  /**
   * Delete records by a field value
   */
  async deleteByField(field: keyof T, value: any): Promise<number> {
    const result = await db
      .delete(this.table)
      .where(eq(this.table[field], value))
      .returning();
    
    return result.length;
  }

  /**
   * Count total records
   */
  async count(): Promise<number> {
    const result = await db.select({ count: this.table }).from(this.table);
    return result.length;
  }

  /**
   * Execute a custom query
   */
  async executeQuery<R>(queryFn: (table: any, db: any) => Promise<R>): Promise<R> {
    return queryFn(this.table, db);
  }
}