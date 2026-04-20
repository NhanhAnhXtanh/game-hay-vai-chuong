import { ref, onValue, off } from "firebase/database";
import { db } from "../../shared/firebase";

export function listenConnection(cb: (online: boolean) => void) {
  const r = ref(db, ".info/connected");
  const unsub = onValue(r, snap => cb(snap.val() === true));
  return () => { off(r); unsub(); };
}
