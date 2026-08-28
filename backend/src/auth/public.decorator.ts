import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';

/**
 * Opts a route out of authentication.
 *
 * The guard is global — everything is protected unless it says otherwise —
 * so that adding a new endpoint can never accidentally leave it open. Only
 * /health and /auth/login carry this.
 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
