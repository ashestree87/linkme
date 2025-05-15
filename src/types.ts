import { Page } from '@cloudflare/puppeteer';

/**
 * Represents a LinkedIn profile lead
 */
export type Lead = {
  urn: string;
  name: string;
  status: "new" | "invited" | "accepted" | "paused" | "failed" | "done";
};

/**
 * Environment configuration interface
 */
export interface LinkedInEnvironment {
  LI_AT: string;
  CSRF: string;
  USERAGENT: string;
  CRAWLER_BROWSER: any;
}

/**
 * Result of LinkedIn authentication check
 */
export interface AuthResult {
  isValid: boolean;
  message: string;
  debugInfo?: any;
}

/**
 * Result of LinkedIn actions
 */
export interface ActionResult {
  success: boolean;
  message: string;
} 