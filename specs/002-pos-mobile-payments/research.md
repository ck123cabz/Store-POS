# Research: POS Mobile Optimization & Payment Methods

**Branch**: `002-pos-mobile-payments` | **Date**: 2026-01-27

## Research Summary

This document consolidates technical research for implementing multi-payment methods (Cash, GCash, Tab), split payments, offline transaction queuing, and mobile-optimized UI for the Store-POS application.

---

## 1. Offline Transaction Queue

### Decision: IndexedDB with Idempotency Keys

**Rationale**: IndexedDB provides structured storage with indexes, supports large datasets (MBs to GBs), and offers atomic operations within transaction scopes. localStorage is unsuitable due to 5-10MB limit and lack of indexing.

**Alternatives Rejected**:
- localStorage: Size limits, synchronous blocking, no indexing
- SQLite (via sql.js): Adds 400KB+ dependency, overkill for queue
- PouchDB: Unnecessary sync complexity for our use case

### Implementation Pattern

```typescript
// src/lib/offline-storage.ts
import { openDB, DBSchema } from 'idb';

interface OfflineQueueDB extends DBSchema {
  transactions: {
    key: string;
    value: QueuedTransaction;
    indexes: {
      'by-status': string;
      'by-timestamp': number;
      'by-idempotency': string;
    };
  };
}

interface QueuedTransaction {
  id: string;                    // UUID v7 (time-ordered)
  idempotencyKey: string;        // Composite: transactionId:deviceId:seq:hash
  payload: TransactionPayload;
  status: 'pending' | 'syncing' | 'synced' | 'failed';
  timestamp: number;
  retryCount: number;
  lastError?: string;
}

export const db = openDB<OfflineQueueDB>('pos-offline', 1, {
  upgrade(db) {
    const store = db.createObjectStore('transactions', { keyPath: 'id' });
    store.createIndex('by-status', 'status');
    store.createIndex('by-timestamp', 'timestamp');
    store.createIndex('by-idempotency', 'idempotencyKey');
  },
});
```

### Idempotency Key Strategy

Composite key format: `{transactionId}:{deviceId}:{sequence}:{payloadHash}`

- **transactionId**: UUID v7 for time-ordering
- **deviceId**: Persisted device identifier (localStorage)
- **sequence**: Monotonic counter per device
- **payloadHash**: SHA-256 first 8 chars of payload JSON

Server caches responses by idempotency key for 24 hours, returning cached response on duplicate submissions.

### Sync Strategy

1. **Online**: Immediate sync with retry on failure
2. **Offline**: Queue locally, sync on reconnection
3. **Batch sync**: Every 5 seconds or 50 transactions, whichever first
4. **Background Sync**: Service Worker `sync` event as fallback

### Conflict Resolution

For POS transactions: **Last-write-wins with audit trail**
- Transaction amounts: Trust most recent
- Status: Priority order (paid > voided > pending)
- All conflicts logged to audit trail

---

## 2. Camera Capture for GCash Verification

### Decision: MediaDevices API with File Input Fallback

**Rationale**: Native browser API provides best performance and user experience. File input with `capture="environment"` attribute provides seamless fallback when camera unavailable.

**Alternatives Rejected**:
- Third-party camera libraries: Unnecessary dependency
- QR code scanning: Not applicable (capturing confirmation screen)
- Screenshot API: Browser security restrictions

### Implementation Pattern

```typescript
// src/components/pos/gcash-camera.tsx
export function GCashCamera({ onCapture }: { onCapture: (blob: Blob) => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<Error | null>(null);

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 } },
        audio: false,
      });
      if (videoRef.current) videoRef.current.srcObject = mediaStream;
      setStream(mediaStream);
    } catch (err) {
      setError(err as Error);
    }
  };

  const capturePhoto = async () => {
    if (!videoRef.current) return;
    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    canvas.getContext('2d')?.drawImage(videoRef.current, 0, 0);
    canvas.toBlob((blob) => blob && onCapture(blob), 'image/jpeg', 0.85);
  };

  // Render video OR file input fallback based on error state
}
```

### Image Compression

- Target: JPEG at 85% quality
- Max dimensions: 1280x720 (readable receipt details)
- Compression via canvas `toBlob()` with quality parameter
- Expected file size: 50-200KB per image

### File Upload Security

- Validate MIME type: `image/jpeg`, `image/png`, `image/webp`
- Max file size: 5MB
- Min file size: 10KB (reject empty/corrupt)
- Unique filename: `gcash-{timestamp}-{uuid}.jpg`
- Store in: `public/uploads/gcash-proofs/`

---

## 3. Mobile-Optimized UI

### Decision: Tailwind CSS Responsive Utilities + Radix UI

**Rationale**: Tailwind's mobile-first approach and Radix UI's accessible primitives integrate seamlessly with existing codebase. No new dependencies needed.

**Alternatives Rejected**:
- Separate mobile app: Scope creep, maintenance burden
- React Native Web: Migration complexity
- CSS-in-JS: Existing Tailwind setup sufficient

### Touch Target Sizing

```css
/* Minimum 44x44px touch targets */
.touch-target {
  min-height: 44px; /* min-h-11 in Tailwind */
  min-width: 44px;
  padding: 12px 16px;
}

/* Recommended 48x48px for primary actions */
.touch-target-lg {
  min-height: 48px; /* min-h-12 in Tailwind */
  min-width: 48px;
}
```

### Responsive Breakpoints

| Breakpoint | Width | Use Case |
|------------|-------|----------|
| Default | 320px+ | Mobile phones (1 column grid) |
| `sm:` | 640px+ | Large phones (2 column grid) |
| `md:` | 768px+ | Tablets portrait (3 column grid) |
| `lg:` | 1024px+ | Tablets landscape (4 column grid) |
| `xl:` | 1280px+ | Desktop (5 column grid) |

### Product Grid Pattern

```tsx
<div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 sm:gap-3">
  {products.map(p => <ProductCard key={p.id} product={p} />)}
</div>
```

### Orientation Change Handling

```typescript
// src/hooks/use-orientation.ts
export function useOrientation() {
  const [orientation, setOrientation] = useState<'portrait' | 'landscape'>(
    () => window.innerHeight > window.innerWidth ? 'portrait' : 'landscape'
  );

  useEffect(() => {
    const handler = () => {
      setOrientation(window.innerHeight > window.innerWidth ? 'portrait' : 'landscape');
    };
    window.addEventListener('resize', handler);
    window.addEventListener('orientationchange', handler);
    return () => {
      window.removeEventListener('resize', handler);
      window.removeEventListener('orientationchange', handler);
    };
  }, []);

  return orientation;
}
```

### Safe Area Support

```css
/* For notched devices */
body {
  padding-top: env(safe-area-inset-top);
  padding-bottom: env(safe-area-inset-bottom);
  padding-left: env(safe-area-inset-left);
  padding-right: env(safe-area-inset-right);
}
```

---

## 4. Tab/Store Credit System

### Decision: Extend Customer Model + Atomic Transactions

**Rationale**: Adding credit fields to existing Customer model is simpler than creating separate CreditAccount table. Prisma's `$transaction()` ensures atomicity for balance updates.

**Alternatives Rejected**:
- Separate CreditAccount model: Over-engineering for single-store use
- Event sourcing: Complexity not justified for current scale
- Third-party credit system: Scope creep

### Database Schema Extension

```prisma
model Customer {
  // ... existing fields ...

  // Tab/Credit System
  tabBalance     Decimal   @default(0) @map("tab_balance") @db.Decimal(10, 2)
  creditLimit    Decimal   @default(0) @map("credit_limit") @db.Decimal(10, 2)
  tabStatus      String    @default("active") @map("tab_status") // active, suspended, frozen

  // Relations
  tabSettlements TabSettlement[]
}

model TabSettlement {
  id            Int       @id @default(autoincrement())
  customerId    Int       @map("customer_id")
  amount        Decimal   @db.Decimal(10, 2)
  paymentType   String    @map("payment_type") // Cash, GCash
  paymentInfo   String?   @map("payment_info") // GCash ref number
  createdAt     DateTime  @default(now()) @map("created_at")
  userId        Int       @map("user_id")

  customer      Customer  @relation(fields: [customerId], references: [id])

  @@map("tab_settlements")
}
```

### Atomic Balance Update Pattern

```typescript
// src/app/api/transactions/route.ts (extended)
await prisma.$transaction(async (tx) => {
  // 1. Create transaction
  const transaction = await tx.transaction.create({ ... });

  // 2. If Tab payment, update customer balance
  if (paymentType === 'Tab') {
    const customer = await tx.customer.findUnique({ where: { id: customerId } });

    // Validate credit limit
    const newBalance = customer.tabBalance.add(total);
    if (newBalance.greaterThan(customer.creditLimit) && !overrideApproved) {
      throw new Error('Credit limit exceeded');
    }

    await tx.customer.update({
      where: { id: customerId },
      data: { tabBalance: newBalance },
    });
  }

  // 3. Decrement stock (existing logic)
  // ...

  return transaction;
});
```

### Credit Limit Override

- Requires user with `permSettings` (manager/admin role)
- Override logged to audit trail with reason
- Per-transaction approval (not blanket override)

### Customer Deletion Protection

```typescript
// src/app/api/customers/[id]/route.ts
export async function DELETE(request, { params }) {
  const customer = await prisma.customer.findUnique({ where: { id: params.id } });

  if (customer.tabBalance.greaterThan(0)) {
    return NextResponse.json(
      { error: true, message: 'Cannot delete customer with outstanding tab balance' },
      { status: 400 }
    );
  }

  // Proceed with deletion...
}
```

---

## 5. Split Payment Support

### Decision: JSON Field for Payment Components

**Rationale**: Storing payment components as JSON array in Transaction allows flexible combinations without schema changes for each new payment type.

**Implementation Pattern**

```typescript
interface PaymentComponent {
  method: 'Cash' | 'GCash';
  amount: number;
  reference?: string; // GCash ref number
}

// Transaction.paymentInfo stores JSON string
// paymentType = 'Split' when multiple components
```

### Validation Rules

1. Sum of all payment components must equal or exceed transaction total
2. Change returned only in cash
3. Each GCash component requires reference number
4. Maximum 2 payment components per split (Cash + GCash only)

---

## 6. Network Status Detection

### Decision: Navigator.onLine + Custom Events

**Rationale**: Browser's `navigator.onLine` API combined with actual fetch testing provides reliable offline detection without Service Worker complexity.

### Implementation Pattern

```typescript
// src/hooks/use-network-status.ts
export function useNetworkStatus() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [lastChecked, setLastChecked] = useState(Date.now());

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Periodic actual connectivity check
    const interval = setInterval(async () => {
      try {
        await fetch('/api/health', { method: 'HEAD' });
        setIsOnline(true);
      } catch {
        setIsOnline(false);
      }
      setLastChecked(Date.now());
    }, 30000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(interval);
    };
  }, []);

  return { isOnline, lastChecked };
}
```

---

## Dependencies

### New Dependencies: None

All features implemented with existing stack:
- **IndexedDB**: Native browser API, wrapped with `idb` (already available via npm)
- **Camera**: Native MediaDevices API
- **Image compression**: Canvas API (native)
- **Responsive UI**: Tailwind CSS (existing)
- **Atomic transactions**: Prisma (existing)

### NPM Package Addition

```bash
npm install idb
```

Single lightweight package (3KB gzipped) for IndexedDB wrapper with TypeScript support.

---

## Risk Assessment

| Risk | Mitigation |
|------|------------|
| Camera permission denied | File input fallback with `capture="environment"` |
| IndexedDB unavailable | Graceful degradation to online-only mode |
| Offline sync conflicts | Idempotency keys + last-write-wins + audit trail |
| Credit limit bypass | Server-side validation + manager override logging |
| Large GCash photo files | Canvas compression to 85% JPEG quality |

---

## References

- MDN Web APIs: MediaDevices, IndexedDB, Service Worker
- Prisma Documentation: Interactive Transactions
- Stripe/Square: Offline transaction patterns
- Apple HIG / Material Design: Touch target guidelines
