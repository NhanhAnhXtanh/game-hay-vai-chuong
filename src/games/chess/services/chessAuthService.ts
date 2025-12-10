import { signInAnonymously, updateProfile } from "firebase/auth";
import { chessAuth } from "../../shared/firebase";

export async function ensureChessAnon(displayName?: string) {
  if (!chessAuth.currentUser) {
    await signInAnonymously(chessAuth);
  }

  if (displayName && chessAuth.currentUser) {
    try {
      await updateProfile(chessAuth.currentUser, { displayName });
    } catch {
      /* ignore display name errors */
    }
  }

  return chessAuth.currentUser!;
}
