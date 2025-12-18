// AsyncStorage Migration System
// Handles schema versioning and data migrations
import AsyncStorage from '@react-native-async-storage/async-storage';

const SCHEMA_VERSION_KEY = 'mindvault_schema_version';
const CURRENT_SCHEMA_VERSION = 1;

interface Migration {
    version: number;
    name: string;
    migrate: () => Promise<void>;
}

// Define migrations in order
const migrations: Migration[] = [
    {
        version: 1,
        name: 'Initial schema',
        migrate: async () => {
            // Initial schema - no migration needed
            // Future migrations will transform data from previous versions
            console.log('[Migration] Running initial schema setup');
        },
    },
    // Add future migrations here:
    // {
    //     version: 2,
    //     name: 'Add scheduler friction fields',
    //     migrate: async () => {
    //         const friction = await AsyncStorage.getItem('mindvault_friction');
    //         if (friction) {
    //             const parsed = JSON.parse(friction);
    //             parsed.newField = 'default';
    //             await AsyncStorage.setItem('mindvault_friction', JSON.stringify(parsed));
    //         }
    //     },
    // },
];

export async function runMigrations(): Promise<void> {
    try {
        const storedVersion = await AsyncStorage.getItem(SCHEMA_VERSION_KEY);
        const currentVersion = storedVersion ? parseInt(storedVersion, 10) : 0;

        console.log(`[Migration] Current schema version: ${currentVersion}, Target: ${CURRENT_SCHEMA_VERSION}`);

        if (currentVersion >= CURRENT_SCHEMA_VERSION) {
            console.log('[Migration] Schema is up to date');
            return;
        }

        // Run pending migrations
        const pendingMigrations = migrations.filter(m => m.version > currentVersion);

        for (const migration of pendingMigrations) {
            console.log(`[Migration] Running migration v${migration.version}: ${migration.name}`);
            try {
                await migration.migrate();
                await AsyncStorage.setItem(SCHEMA_VERSION_KEY, migration.version.toString());
                console.log(`[Migration] Completed migration v${migration.version}`);
            } catch (error) {
                console.error(`[Migration] Failed migration v${migration.version}:`, error);
                throw error; // Stop migrations on failure
            }
        }

        console.log('[Migration] All migrations completed successfully');
    } catch (error) {
        console.error('[Migration] Migration system error:', error);
        // Don't throw - app should still work with stale data
    }
}

export async function getSchemaVersion(): Promise<number> {
    const version = await AsyncStorage.getItem(SCHEMA_VERSION_KEY);
    return version ? parseInt(version, 10) : 0;
}

export async function resetSchemaVersion(): Promise<void> {
    await AsyncStorage.removeItem(SCHEMA_VERSION_KEY);
}

export { CURRENT_SCHEMA_VERSION };
