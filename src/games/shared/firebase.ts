import { getApp, getApps, initializeApp, type FirebaseOptions } from "firebase/app";
import { getDatabase } from "firebase/database";
import { getAuth, signInAnonymously, updateProfile } from "firebase/auth";

function requireEnv(key: string) {
  const value = import.meta.env[key];
  if (!value) throw new Error(`Missing env: ${key}`);
  return value;
}

const hostConfig: FirebaseOptions = {
  apiKey: requireEnv("VITE_FIREBASE_API_KEY"),
  authDomain: requireEnv("VITE_FIREBASE_AUTH_DOMAIN"),
  databaseURL: requireEnv("VITE_FIREBASE_DATABASE_URL"),
  projectId: requireEnv("VITE_FIREBASE_PROJECT_ID"),
  appId: requireEnv("VITE_FIREBASE_APP_ID")
};

const chessConfig: FirebaseOptions = {
  apiKey: requireEnv("VITE_CHESS_FIREBASE_API_KEY"),
  authDomain: requireEnv("VITE_CHESS_FIREBASE_AUTH_DOMAIN"),
  databaseURL: requireEnv("VITE_CHESS_FIREBASE_DATABASE_URL"),
  projectId: requireEnv("VITE_CHESS_FIREBASE_PROJECT_ID"),
  appId: requireEnv("VITE_CHESS_FIREBASE_APP_ID")
};

const app = getApps().length ? getApp() : initializeApp(hostConfig);
export const db = getDatabase(app);
export const auth = getAuth(app);

const chessAppName = "ChessApp";
const chessApp = getApps().find(a => a.name === chessAppName) ?? initializeApp(chessConfig, chessAppName);
export const chessDb = getDatabase(chessApp);
export const chessAuth = getAuth(chessApp);

export async function ensureAnon(displayName: string) {
  if (!auth.currentUser) await signInAnonymously(auth);
  if (auth.currentUser && displayName) {
    try { await updateProfile(auth.currentUser, { displayName }); } catch {}
  }
  return auth.currentUser!;
}
