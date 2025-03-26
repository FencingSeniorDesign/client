// src/networking/ServerPushManager.ts
import { EventEmitter } from 'events';
import {
    EntityType,
    UpdateOperation,
    EntityUpdateMessage,
    BulkEntityUpdateMessage
} from './MessageTypes';
import tournamentServer from './TournamentServer';

/**
 * Interface for update tracking
 */
interface EntityUpdate {
    entityType: EntityType;
    entityId: number;
    operation: UpdateOperation;
    data: any;
    timestamp: string;
    version: number;
}

/**
 * ServerPushManager handles tracking changes and broadcasting them to clients
 * It maintains a version counter and history of updates to support reconnection scenarios
 */
class ServerPushManager extends EventEmitter {
    private static instance: ServerPushManager;
    private updateHistory: EntityUpdate[] = [];
    private currentVersion: number = 0;
    private historyMaxSize: number = 1000; // Max number of updates to keep in history
    private initialized: boolean = false;

    /**
     * Private constructor to enforce singleton pattern
     */
    private constructor() {
        super();
    }

    /**
     * Get the singleton instance
     */
    public static getInstance(): ServerPushManager {
        if (!ServerPushManager.instance) {
            ServerPushManager.instance = new ServerPushManager();
        }
        return ServerPushManager.instance;
    }

    /**
     * Initialize the push manager
     */
    public initialize(): void {
        if (this.initialized) return;

        // Set up event listeners to respond to server events that might
        // require broadcasting updates

        console.log('[ServerPushManager] Initialized');
        this.initialized = true;
    }

    /**
     * Track and broadcast an entity update
     */
    public trackEntityUpdate(
        entityType: EntityType,
        entityId: number,
        operation: UpdateOperation,
        data: any
    ): void {
        // Increment version counter
        this.currentVersion++;

        // Create update object
        const update: EntityUpdate = {
            entityType,
            entityId,
            operation,
            data,
            timestamp: new Date().toISOString(),
            version: this.currentVersion
        };

        // Add to history
        this.updateHistory.push(update);

        // Trim history if needed
        if (this.updateHistory.length > this.historyMaxSize) {
            this.updateHistory = this.updateHistory.slice(-this.historyMaxSize);
        }

        // Broadcast the update
        this.broadcastUpdate(update);

        console.log(`[ServerPushManager] Tracked ${operation} for ${entityType} #${entityId}`);
    }

    /**
     * Track and broadcast multiple entity updates in a single message
     */
    public trackBulkEntityUpdates(
        entityType: EntityType,
        updates: { entityId: number; operation: UpdateOperation; data: any }[]
    ): void {
        if (updates.length === 0) return;

        // Increment version counter
        this.currentVersion++;

        // Add individual updates to history
        const timestamp = new Date().toISOString();

        updates.forEach(update => {
            this.updateHistory.push({
                entityType,
                entityId: update.entityId,
                operation: update.operation,
                data: update.data,
                timestamp,
                version: this.currentVersion
            });
        });

        // Trim history if needed
        if (this.updateHistory.length > this.historyMaxSize) {
            this.updateHistory = this.updateHistory.slice(-this.historyMaxSize);
        }

        // Broadcast the bulk update
        this.broadcastBulkUpdates(entityType, updates, timestamp);

        console.log(`[ServerPushManager] Tracked bulk update for ${updates.length} ${entityType} entities`);
    }

    /**
     * Broadcast an entity update to all connected clients
     */
    private broadcastUpdate(update: EntityUpdate): void {
        if (!tournamentServer.isServerRunning()) return;

        const message: EntityUpdateMessage = {
            type: 'entity_update',
            entityType: update.entityType,
            entityId: update.entityId,
            operation: update.operation,
            data: update.data,
            timestamp: update.timestamp,
            version: update.version
        };

        tournamentServer.broadcastMessage(message);
    }

    /**
     * Broadcast bulk updates to all connected clients
     */
    private broadcastBulkUpdates(
        entityType: EntityType,
        updates: { entityId: number; operation: UpdateOperation; data: any }[],
        timestamp: string
    ): void {
        if (!tournamentServer.isServerRunning()) return;

        const message: BulkEntityUpdateMessage = {
            type: 'bulk_entity_update',
            entityType,
            updates,
            timestamp,
            version: this.currentVersion
        };

        tournamentServer.broadcastMessage(message);
    }

    /**
     * Get missed updates since a specific version
     */
    public getMissedUpdates(sinceVersion: number, entityTypes?: EntityType[]): EntityUpdate[] {
        // Filter updates by version and optionally by entity type
        return this.updateHistory.filter(update => {
            const versionMatch = update.version > sinceVersion;
            const typeMatch = !entityTypes || entityTypes.includes(update.entityType);
            return versionMatch && typeMatch;
        });
    }

    /**
     * Get the current version number
     */
    public getCurrentVersion(): number {
        return this.currentVersion;
    }
}

// Export singleton instance
export default ServerPushManager.getInstance();