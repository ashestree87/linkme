import adminHandlers from './admin/index';
import { AdminEnv } from './admin/types';

/**
 * @deprecated This file is kept for backward compatibility.
 * Use the modular implementation in the 'admin' directory instead.
 * This will be removed in a future version.
 */

export interface Env extends AdminEnv {}

/**
 * Compatibility wrapper to redirect to the new implementation
 * @deprecated Use the modular implementation in the 'admin' directory instead.
 */
export default {
  // Forward all requests to the new implementation
  async fetch(request: Request, env: Env): Promise<Response> {
    console.warn('adminUI.ts is deprecated. Use the modular implementation in the admin directory instead.');
    return adminHandlers.fetch(request, env);
  }
}; 