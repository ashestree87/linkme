/**
 * Common functionality for the LinkedIn automation
 * 
 * This file re-exports functionality from other modules for backward compatibility
 * and provides a single import point for commonly used functions.
 */

// Re-export all the types and functions from the modular files
export * from './types';
export * from './utils';
export * from './auth';
export * from './browser';
export * from './human-behavior';
export * from './linkedin-actions';

// Note: To avoid circular dependencies, we don't directly import
// human-behavior in browser.ts. Instead, we implement simplified
// versions of those functions directly in withHumanBrowser.
