/**
 * Runtime configuration.
 *
 * The Firebase web config consists of public client identifiers (they identify
 * the project, they are not secrets), but they are still kept in `.env.local` so
 * that every deployment can point at its own project and nothing project-specific
 * is baked into the repository.
 */

const env = import.meta.env;

export const firebaseConfig = {
  apiKey: env.VITE_FIREBASE_API_KEY as string | undefined,
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN as string | undefined,
  projectId: env.VITE_FIREBASE_PROJECT_ID as string | undefined,
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET as string | undefined,
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID as string | undefined,
  appId: env.VITE_FIREBASE_APP_ID as string | undefined,
};

export const appCheckConfig = {
  siteKey: env.VITE_APPCHECK_SITE_KEY as string | undefined,
  /** Local development only: generate/print an App Check debug token. */
  debug: String(env.VITE_APPCHECK_DEBUG ?? "false").toLowerCase() === "true",
  /** A registered debug token, or empty to let the SDK generate one. */
  debugToken: (env.VITE_APPCHECK_DEBUG_TOKEN as string | undefined) || undefined,
};

/** Cloud fallback model. `gemini-3.5-flash-lite` is the SDK default. */
export const CLOUD_MODEL = (env.VITE_CLOUD_MODEL as string | undefined) || "gemini-3.5-flash-lite";

/** True when a Firebase project has been wired up. */
export function isFirebaseConfigured(): boolean {
  return Boolean(firebaseConfig.apiKey && firebaseConfig.projectId && firebaseConfig.appId);
}

/** True when the build is a local dev server (App Check debug provider allowed). */
export const isDev = Boolean(env.DEV);
