// Production-safe logger utility
// Disables console output in production builds to improve performance

const isDev = __DEV__;

type LogLevel = 'log' | 'warn' | 'error' | 'debug' | 'info';

interface Logger {
    log: (...args: any[]) => void;
    warn: (...args: any[]) => void;
    error: (...args: any[]) => void;
    debug: (...args: any[]) => void;
    info: (...args: any[]) => void;
    group: (label: string) => void;
    groupEnd: () => void;
    time: (label: string) => void;
    timeEnd: (label: string) => void;
}

const noop = () => { };

/**
 * Production-safe logger that only outputs in development builds.
 * Use this instead of console.* throughout the app.
 * 
 * @example
 * import { logger } from '../utils/logger';
 * logger.log('Debug info'); // Only shown in DEV
 * logger.error('Critical error'); // Always shown (errors are important)
 */
export const logger: Logger = {
    log: isDev ? console.log.bind(console) : noop,
    warn: isDev ? console.warn.bind(console) : noop,
    error: console.error.bind(console), // Always log errors
    debug: isDev ? console.debug.bind(console) : noop,
    info: isDev ? console.info.bind(console) : noop,
    group: isDev ? console.group.bind(console) : noop,
    groupEnd: isDev ? console.groupEnd.bind(console) : noop,
    time: isDev ? console.time.bind(console) : noop,
    timeEnd: isDev ? console.timeEnd.bind(console) : noop,
};

/**
 * Global console silencer for production builds.
 * Call this once at app startup to disable all console output.
 * NOTE: This is aggressive - prefer using `logger` for gradual migration.
 */
export function silenceConsoleInProduction(): void {
    if (!isDev) {
        console.log = noop;
        console.warn = noop;
        console.debug = noop;
        console.info = noop;
        // Keep console.error for critical issues
    }
}

/**
 * Performance timing utility for development profiling.
 * Automatically disabled in production.
 */
export const perf = {
    start: (label: string) => {
        if (isDev) {
            logger.time(`⏱️ ${label}`);
        }
    },
    end: (label: string) => {
        if (isDev) {
            logger.timeEnd(`⏱️ ${label}`);
        }
    },
};

export default logger;
