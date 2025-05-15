import { Lead } from '../common';

/**
 * Extended Lead type with additional metadata for admin UI
 */
export interface LeadWithMeta extends Lead {
  next_action_at?: number;
  retry_count?: number;
  debug_session_id?: string;
}

/**
 * Environment variables and bindings for admin functionality
 */
export interface AdminEnv {
  // KV Namespaces
  TARGETS: KVNamespace;
  
  // D1 Database
  DB: D1Database;
  
  // Browser binding for Puppeteer
  CRAWLER_BROWSER: any;
  
  // Environment variables
  WEBHOOK_SECRET: string;
  LI_AT: string;
  CSRF: string;
  USERAGENT: string;
}

/**
 * LinkedIn profile data structure
 */
export interface LinkedInProfile {
  urn: string;
  name: string;
  title?: string;
  company?: string;
  location?: string;
  imageUrl?: string | null;
} 