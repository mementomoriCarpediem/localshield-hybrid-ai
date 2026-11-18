/**
 * Firebase bootstrap: app instance + Firebase App Check.
 *
 * App Check is what makes it acceptable to call Gemini directly from the
 * browser: every request carries an attestation token. Because the token needs
 * a reCAPTCHA Enterprise site key that belongs to a real Firebase project, the
 * app degrades cleanly to "demo mode" when no project is configured.
 */

import { initializeApp, type FirebaseApp } from "firebase/app";
import {
  initializeAppCheck,
  ReCaptchaEnterpriseProvider,
  type AppCheck,
} from "firebase/app-check";
import type { AppCheckState } from "../types";
import { appCheckConfig, firebaseConfig, isDev, isFirebaseConfigured } from "./config";

let app: FirebaseApp | null = null;
let appCheck: AppCheck | null = null;
let appCheckState: AppCheckState = { mode: "disabled", detail: "Not initialised" };

declare global {
  interface Window {
    FIREBASE_APPCHECK_DEBUG_TOKEN?: boolean | string;
  }
}

/**
 * Initialise Firebase (idempotent) and App Check.
 * Returns the App Check state for the header badge.
 */
export function initFirebase(): { app: FirebaseApp | null; appCheck: AppCheck | null; state: AppCheckState } {
  if (app) return { app, appCheck, state: appCheckState };

  if (!isFirebaseConfigured()) {
    appCheckState = {
      mode: "disabled",
      detail: "No Firebase project configured — running in demo mode",
    };
    return { app: null, appCheck: null, state: appCheckState };
  }

  try {
    app = initializeApp({
      apiKey: firebaseConfig.apiKey,
      authDomain: firebaseConfig.authDomain,
      projectId: firebaseConfig.projectId,
      storageBucket: firebaseConfig.storageBucket,
      messagingSenderId: firebaseConfig.messagingSenderId,
      appId: firebaseConfig.appId,
    });
  } catch (error) {
    appCheckState = {
      mode: "error",
      detail: `Firebase init failed: ${(error as Error).message}`,
    };
    return { app: null, appCheck: null, state: appCheckState };
  }

  if (!appCheckConfig.siteKey) {
    appCheckState = {
      mode: "disabled",
      detail: "Firebase configured but no App Check site key — cloud calls will be rejected",
    };
    return { app, appCheck: null, state: appCheckState };
  }

  // The debug provider is a *local development* affordance only. It prints a
  // debug token in the console which must be registered in the Firebase console
  // (App Check > Apps > Manage debug tokens). Never enable it in production.
  const useDebug = isDev && appCheckConfig.debug;
  if (useDebug) {
    window.FIREBASE_APPCHECK_DEBUG_TOKEN = appCheckConfig.debugToken ?? true;
  }

  try {
    appCheck = initializeAppCheck(app, {
      provider: new ReCaptchaEnterpriseProvider(appCheckConfig.siteKey),
      isTokenAutoRefreshEnabled: true,
    });
    appCheckState = {
      mode: useDebug ? "debug" : "enforced",
      detail: useDebug
        ? "App Check debug provider (register the token printed in the console)"
        : "App Check reCAPTCHA Enterprise",
    };
  } catch (error) {
    appCheckState = {
      mode: "error",
      detail: `App Check init failed: ${(error as Error).message}`,
    };
  }

  return { app, appCheck, state: appCheckState };
}

export function getAppCheckState(): AppCheckState {
  return appCheckState;
}
