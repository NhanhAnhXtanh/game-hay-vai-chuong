const INVITE_PREFIX = "TTI1:";
// Secret key derivation string (có thể thay đổi để tăng bảo mật)
const SECRET_SALT = "tictactoe-invite-token-v2";

function toUrlSafeBase64(input: string): string {
  return btoa(input).replace(/=+$/u, "").replace(/\+/gu, "-").replace(/\//gu, "_");
}

function fromUrlSafeBase64(input: string): string {
  const base = input.replace(/-/gu, "+").replace(/_/gu, "/");
  const padLength = (4 - (base.length % 4)) % 4;
  const padded = base + "=".repeat(padLength);
  return atob(padded);
}

// Derive encryption key từ secret salt
async function getEncryptionKey(): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    encoder.encode(SECRET_SALT),
    "PBKDF2",
    false,
    ["deriveBits", "deriveKey"]
  );
  
  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: encoder.encode("tictactoe-salt"),
      iterations: 100000,
      hash: "SHA-256"
    },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

// Mã hóa với AES-GCM
async function encryptAES(plaintext: string): Promise<string> {
  const key = await getEncryptionKey();
  const encoder = new TextEncoder();
  const data = encoder.encode(plaintext);
  
  // Tạo IV (Initialization Vector) ngẫu nhiên
  const iv = crypto.getRandomValues(new Uint8Array(12));
  
  const encrypted = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    data
  );
  
  // Kết hợp IV + encrypted data và encode thành base64
  const combined = new Uint8Array(iv.length + encrypted.byteLength);
  combined.set(iv);
  combined.set(new Uint8Array(encrypted), iv.length);
  
  // Convert Uint8Array sang base64 an toàn hơn
  let binary = "";
  for (let i = 0; i < combined.length; i++) {
    binary += String.fromCharCode(combined[i]);
  }
  return toUrlSafeBase64(binary);
}

// Giải mã với AES-GCM
async function decryptAES(ciphertext: string): Promise<string | null> {
  try {
    const key = await getEncryptionKey();
    
    // fromUrlSafeBase64 đã decode về binary string rồi, không cần atob nữa
    const binaryString = fromUrlSafeBase64(ciphertext);
    
    // Convert binary string sang Uint8Array
    const combined = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      combined[i] = binaryString.charCodeAt(i);
    }
    
    // Tách IV và encrypted data
    const iv = combined.slice(0, 12);
    const encrypted = combined.slice(12);
    
    const decrypted = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv },
      key,
      encrypted
    );
    
    const decoder = new TextDecoder();
    return decoder.decode(decrypted);
  } catch (error) {
    console.error("Decrypt error:", error);
    return null;
  }
}

export async function encodeInviteToken(roomId: string, password?: string): Promise<string> {
  const payload = {
    r: roomId,
    p: password || null,
    v: 2 // Version 2: AES encrypted
  };
  const json = JSON.stringify(payload);
  return await encryptAES(json);
}

export async function decodeInviteToken(token: string): Promise<{ roomId: string; password?: string } | null> {
  if (!token || !token.trim()) {
    console.error("Empty token");
    return null;
  }
  
  // React Router đã tự decode URL params, nhưng có thể một số ký tự vẫn bị encode
  // Thử decode URI component, nhưng nếu fail thì dùng token gốc
  let raw = token.trim();
  try {
    // Chỉ decode nếu token có dấu % (URL encoded)
    if (raw.includes("%")) {
      raw = decodeURIComponent(raw);
    }
  } catch {
    // Nếu decodeURIComponent fail, dùng token gốc
    raw = token.trim();
  }
  
  // Hỗ trợ cả token cũ có prefix và token mới không prefix
  if (raw.startsWith(INVITE_PREFIX)) {
    raw = raw.slice(INVITE_PREFIX.length);
  }
  
  try {
    // Thử giải mã AES trước (version 2)
    const decrypted = await decryptAES(raw);
    if (decrypted) {
      try {
        const data = JSON.parse(decrypted) as { r?: unknown; p?: unknown; v?: unknown };
        if (data?.v === 2 && typeof data.r === "string" && data.r.trim()) {
          const roomId = data.r.trim();
          const password =
            typeof data.p === "string" && data.p.length
              ? data.p
              : undefined;
          return { roomId, password };
        }
      } catch (parseError) {
        console.error("JSON parse error after decrypt:", parseError);
      }
    }
    
    // Fallback: thử decode Base64 cũ (version 1) để backward compatibility
    try {
      const json = fromUrlSafeBase64(raw);
      const data = JSON.parse(json) as { r?: unknown; p?: unknown; v?: unknown };
      if (!data || typeof data.r !== "string" || !data.r.trim()) return null;
      const roomId = data.r.trim();
      const password =
        typeof data.p === "string" && data.p.length
          ? data.p
          : undefined;
      return { roomId, password };
    } catch (base64Error) {
      console.error("Base64 decode error:", base64Error);
    }
    
    return null;
  } catch (error) {
    console.error("Token decode error:", error);
    return null;
  }
}

