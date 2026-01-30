/**
 * Offline storage wrapper using IndexedDB for transaction queuing
 * Used for offline-first POS functionality
 */

import { openDB, type DBSchema, type IDBPDatabase } from 'idb';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export type QueuedTransactionStatus = 'pending' | 'syncing' | 'synced' | 'failed';

export interface TransactionPayload {
  items: Array<{
    productId: number;
    productName: string;
    sku?: string;
    price: number;
    quantity: number;
  }>;
  subtotal: number;
  discount: number;
  taxAmount: number;
  total: number;
  paymentType: string;
  paymentInfo?: string;
  amountTendered?: number;
  customerId?: number;
  userId: number;
  idempotencyKey: string;
}

export interface QueuedTransaction {
  id: string; // UUID v7 (time-ordered)
  idempotencyKey: string;
  payload: TransactionPayload;
  status: QueuedTransactionStatus;
  timestamp: number;
  retryCount: number;
  lastError?: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// DATABASE SCHEMA
// ═══════════════════════════════════════════════════════════════════════════════

interface OfflineQueueDB extends DBSchema {
  transactions: {
    key: string;
    value: QueuedTransaction;
    indexes: {
      'by-status': QueuedTransactionStatus;
      'by-timestamp': number;
      'by-idempotency': string;
    };
  };
  metadata: {
    key: string;
    value: {
      key: string;
      value: string | number | boolean;
    };
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════════

const DB_NAME = 'pos-offline';
const DB_VERSION = 1;
const MAX_RETRY_COUNT = 5;
const DEVICE_ID_KEY = 'deviceId';

// ═══════════════════════════════════════════════════════════════════════════════
// DATABASE INITIALIZATION
// ═══════════════════════════════════════════════════════════════════════════════

let dbPromise: Promise<IDBPDatabase<OfflineQueueDB>> | null = null;

/**
 * Get or initialize the IndexedDB database
 */
export async function getDB(): Promise<IDBPDatabase<OfflineQueueDB>> {
  if (!dbPromise) {
    dbPromise = openDB<OfflineQueueDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        // Create transactions store with indexes
        if (!db.objectStoreNames.contains('transactions')) {
          const txStore = db.createObjectStore('transactions', { keyPath: 'id' });
          txStore.createIndex('by-status', 'status');
          txStore.createIndex('by-timestamp', 'timestamp');
          txStore.createIndex('by-idempotency', 'idempotencyKey', { unique: true });
        }

        // Create metadata store for device ID and other config
        if (!db.objectStoreNames.contains('metadata')) {
          db.createObjectStore('metadata', { keyPath: 'key' });
        }
      },
    });
  }
  return dbPromise;
}

/**
 * Check if IndexedDB is available
 */
export function isIndexedDBAvailable(): boolean {
  return typeof window !== 'undefined' && 'indexedDB' in window;
}

// ═══════════════════════════════════════════════════════════════════════════════
// DEVICE ID MANAGEMENT
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Get or generate a persistent device ID
 */
export async function getDeviceId(): Promise<string> {
  const db = await getDB();
  const stored = await db.get('metadata', DEVICE_ID_KEY);

  if (stored) {
    return stored.value as string;
  }

  // Generate new device ID
  const newId = `device-${crypto.randomUUID()}`;
  await db.put('metadata', { key: DEVICE_ID_KEY, value: newId });
  return newId;
}

// ═══════════════════════════════════════════════════════════════════════════════
// TRANSACTION QUEUE OPERATIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Add a transaction to the offline queue
 * @param payload - Transaction data to queue
 * @param idempotencyKey - Unique key for deduplication
 * @returns The queued transaction
 */
export async function queueTransaction(
  payload: TransactionPayload,
  idempotencyKey: string
): Promise<QueuedTransaction> {
  const db = await getDB();

  // Check for existing transaction with same idempotency key
  const existing = await db.getFromIndex(
    'transactions',
    'by-idempotency',
    idempotencyKey
  );
  if (existing) {
    // Return existing transaction if already queued
    return existing;
  }

  const transaction: QueuedTransaction = {
    id: crypto.randomUUID(),
    idempotencyKey,
    payload,
    status: 'pending',
    timestamp: Date.now(),
    retryCount: 0,
  };

  await db.add('transactions', transaction);
  return transaction;
}

/**
 * Get all pending transactions ready for sync
 * @returns Array of pending transactions, ordered by timestamp
 */
export async function getPendingTransactions(): Promise<QueuedTransaction[]> {
  const db = await getDB();
  const all = await db.getAllFromIndex('transactions', 'by-status', 'pending');
  // Sort by timestamp (oldest first)
  return all.sort((a, b) => a.timestamp - b.timestamp);
}

/**
 * Get count of pending transactions
 */
export async function getPendingCount(): Promise<number> {
  const db = await getDB();
  return db.countFromIndex('transactions', 'by-status', 'pending');
}

/**
 * Get a transaction by ID
 */
export async function getTransaction(id: string): Promise<QueuedTransaction | undefined> {
  const db = await getDB();
  return db.get('transactions', id);
}

/**
 * Update transaction status
 */
export async function updateTransactionStatus(
  id: string,
  status: QueuedTransactionStatus,
  error?: string
): Promise<void> {
  const db = await getDB();
  const tx = await db.get('transactions', id);

  if (!tx) {
    throw new Error(`Transaction ${id} not found`);
  }

  const updated: QueuedTransaction = {
    ...tx,
    status,
    lastError: error,
    retryCount: status === 'failed' ? tx.retryCount + 1 : tx.retryCount,
  };

  await db.put('transactions', updated);
}

/**
 * Mark transaction as syncing
 */
export async function markSyncing(id: string): Promise<void> {
  await updateTransactionStatus(id, 'syncing');
}

/**
 * Mark transaction as successfully synced
 */
export async function markSynced(id: string): Promise<void> {
  await updateTransactionStatus(id, 'synced');
}

/**
 * Mark transaction as failed with error
 */
export async function markFailed(id: string, error: string): Promise<void> {
  await updateTransactionStatus(id, 'failed', error);
}

/**
 * Retry failed transactions that haven't exceeded max retries
 */
export async function retryFailedTransactions(): Promise<QueuedTransaction[]> {
  const db = await getDB();
  const failed = await db.getAllFromIndex('transactions', 'by-status', 'failed');

  const retriable = failed.filter((tx) => tx.retryCount < MAX_RETRY_COUNT);

  // Reset retriable transactions to pending
  for (const tx of retriable) {
    await db.put('transactions', { ...tx, status: 'pending' });
  }

  return retriable;
}

/**
 * Remove synced transactions older than specified age
 * @param maxAge - Maximum age in milliseconds (default: 24 hours)
 */
export async function cleanupSyncedTransactions(
  maxAge: number = 24 * 60 * 60 * 1000
): Promise<number> {
  const db = await getDB();
  const synced = await db.getAllFromIndex('transactions', 'by-status', 'synced');

  const cutoff = Date.now() - maxAge;
  const toDelete = synced.filter((tx) => tx.timestamp < cutoff);

  for (const tx of toDelete) {
    await db.delete('transactions', tx.id);
  }

  return toDelete.length;
}

/**
 * Clear all transactions (use with caution!)
 */
export async function clearAllTransactions(): Promise<void> {
  const db = await getDB();
  await db.clear('transactions');
}

/**
 * Get all transactions for debugging/display
 */
export async function getAllTransactions(): Promise<QueuedTransaction[]> {
  const db = await getDB();
  const all = await db.getAll('transactions');
  return all.sort((a, b) => b.timestamp - a.timestamp);
}

/**
 * Get transaction statistics
 */
export async function getQueueStats(): Promise<{
  pending: number;
  syncing: number;
  synced: number;
  failed: number;
  total: number;
}> {
  const db = await getDB();
  const [pending, syncing, synced, failed] = await Promise.all([
    db.countFromIndex('transactions', 'by-status', 'pending'),
    db.countFromIndex('transactions', 'by-status', 'syncing'),
    db.countFromIndex('transactions', 'by-status', 'synced'),
    db.countFromIndex('transactions', 'by-status', 'failed'),
  ]);

  return {
    pending,
    syncing,
    synced,
    failed,
    total: pending + syncing + synced + failed,
  };
}
