# MindVault Developer Guide

## How to Use New Components

### 1. Error Boundary

**Location:** `src/components/ErrorBoundary.tsx`

**Usage:**
```tsx
import { ErrorBoundary } from '../src/components/ErrorBoundary';

// Wrap any component tree that might throw
<ErrorBoundary>
  <YourComponent />
</ErrorBoundary>

// With custom fallback UI
<ErrorBoundary fallback={<CustomErrorScreen />}>
  <YourComponent />
</ErrorBoundary>
```

**Why it exists:**
- Catches JavaScript errors anywhere in the child component tree
- Prevents the entire app from crashing on unhandled errors
- Shows user-friendly "Try Again" button

---

### 2. Offline Banner

**Location:** `src/components/OfflineBanner.tsx`

**Usage:**
```tsx
import { OfflineBanner } from '../src/components/OfflineBanner';
import { useNetworkStatus } from '../src/hooks/useNetworkStatus';

function MyScreen() {
  const network = useNetworkStatus();
  
  return (
    <View>
      <OfflineBanner isVisible={network.isConnected === false} />
      {/* Your content */}
    </View>
  );
}
```

**Why it exists:**
- Visual indicator when device loses internet connection
- Animates in/out smoothly
- Prevents user confusion when AI features fail

---

### 3. Network Status Hook

**Location:** `src/hooks/useNetworkStatus.ts`

**Usage:**
```tsx
import { useNetworkStatus } from '../src/hooks/useNetworkStatus';

function MyComponent() {
  const { isConnected, isInternetReachable, type } = useNetworkStatus();
  
  if (!isConnected) {
    // Disable network-dependent features
    return <OfflineUI />;
  }
  
  return <OnlineUI />;
}
```

**Properties:**
- `isConnected`: `boolean | null` - Device has network connection
- `isInternetReachable`: `boolean | null` - Can reach the internet
- `type`: `string` - Connection type (wifi, cellular, etc.)

---

### 4. Data Migrations

**Location:** `src/utils/migrations.ts`

**How to add a new migration:**

1. Open `src/utils/migrations.ts`
2. Add a new migration object to the `migrations` array:

```ts
const migrations: Migration[] = [
  // ... existing migrations
  {
    version: 2, // Increment from last version
    name: 'Add new field to friction',
    migrate: async () => {
      const friction = await AsyncStorage.getItem('mindvault_friction');
      if (friction) {
        const parsed = JSON.parse(friction);
        parsed.newField = 'default_value';
        await AsyncStorage.setItem('mindvault_friction', JSON.stringify(parsed));
      }
    },
  },
];
```

3. Update `CURRENT_SCHEMA_VERSION` constant to match your new version number.

**Why it exists:**
- Handles schema changes between app versions
- Runs automatically on app startup
- Prevents data corruption when AsyncStorage structure changes

---

### 5. Scheduler Service

**Location:** `src/services/scheduler.ts`

**Key functions:**

```ts
import { generateAdaptiveSchedule, buildTimeSlots, computeChapterPriority } from '../src/services/scheduler';

// Generate a full study schedule
const { days, summary } = generateAdaptiveSchedule(
  startDate,
  numDays,
  chapters,
  exams,
  blockers,
  friction,
  config
);

// Build time slots for a specific day
const slots = buildTimeSlots(
  '2024-01-15',
  blockers,
  '08:00',
  '22:00',
  60, // slot minutes
  15  // mini slot minutes
);
```

**Configuration options:**
- `mode`: 'base' | 'assisted' | 'power'
- `daily_max_hours`: Maximum study hours per day
- `slot_minutes`: Standard study slot duration
- `target_completion_date`: Fallback deadline if no exams

---

### 6. Success Modal

**Location:** `app/modals/success.tsx`

**Usage:**
```tsx
import { useRouter } from 'expo-router';

// Navigate with params
router.push({
  pathname: '/modals/success',
  params: {
    title: 'Quiz Complete!',
    message: 'You scored 85%',
    nextRoute: '/study/analytics', // Optional: redirect after Continue
  }
});
```

**Parameters:**
- `title`: Modal title (default: "Success!")
- `message`: Description text
- `nextRoute`: Where to navigate on Continue (optional)

---

## File Structure

```
src/
├── components/
│   ├── ErrorBoundary.tsx    # React error boundary
│   ├── OfflineBanner.tsx    # Network status banner
│   ├── GlassLayout.tsx      # Base layout with gradient
│   ├── GlassCard.tsx        # Glassmorphic card
│   └── Skeleton.tsx         # Loading skeleton
├── hooks/
│   ├── useNetworkStatus.ts  # Network connectivity hook
│   ├── useHaptics.ts        # Haptic feedback
│   └── useThemeColors.ts    # Theme-aware colors
├── services/
│   ├── ai.ts                # AI service (Groq/Gemini)
│   ├── database.ts          # SQLite database
│   └── scheduler.ts         # Adaptive scheduler
├── stores/
│   ├── index.ts             # Main Zustand stores
│   ├── flashcards.ts        # Flashcard store
│   └── scheduler.ts         # Scheduler store
├── utils/
│   └── migrations.ts        # AsyncStorage migrations
└── constants/
    └── index.ts             # App constants
```

---

## Common Patterns

### Adding a new screen

1. Create file in `app/(tabs)/` or `app/modals/`
2. Use `GlassLayout` as the root component
3. Add `ErrorBoundary` if the screen makes API calls
4. Register in `app/_layout.tsx` if it's a modal

### Adding a new store

1. Create file in `src/stores/`
2. Export the hook (e.g., `useMyStore`)
3. Add `loadMyData()` call in `app/_layout.tsx` init

### Adding a new API feature

1. Add function to `src/services/ai.ts`
2. Wrap in try-catch with proper error type
3. Add loading state in the calling component
4. Show `OfflineBanner` if network-dependent
