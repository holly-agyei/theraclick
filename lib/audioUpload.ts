import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage } from "./firebase";

const UPLOAD_TIMEOUT_MS = 5000;

/**
 * Upload an audio blob to Firebase Storage and get the download URL.
 * Falls back to base64 data URL if Storage fails or times out.
 */
export async function uploadVoiceMessage(
  audioBlob: Blob,
  chatId: string,
  senderId: string
): Promise<string | undefined> {
  if (!audioBlob || audioBlob.size === 0) {
    console.error("Audio blob is empty");
    return undefined;
  }

  // Try Firebase Storage first (with timeout to prevent hanging)
  if (storage) {
    try {
      const timestamp = Date.now();
      const ext = getExtension(audioBlob.type);
      const path = `voice-messages/${chatId}/${senderId}/voice_${timestamp}${ext}`;

      const storageRef = ref(storage, path);

      const snapshot = await withTimeout(
        uploadBytes(storageRef, audioBlob, {
          contentType: audioBlob.type || "audio/webm",
        }),
        UPLOAD_TIMEOUT_MS,
        "Storage upload timed out"
      );

      const url = await withTimeout(
        getDownloadURL(snapshot.ref),
        UPLOAD_TIMEOUT_MS,
        "getDownloadURL timed out"
      );

      return url;
    } catch (error: any) {
      console.warn("Firebase Storage failed, falling back to base64:", error?.message || error?.code);
    }
  }

  // Fallback: base64 data URL stored directly in Firestore
  try {
    const dataUrl = await blobToBase64(audioBlob);
    if (dataUrl) return dataUrl;
  } catch (error: any) {
    console.error("Base64 conversion failed:", error?.message);
  }

  return undefined;
}

function withTimeout<T>(
  promise: Promise<T>,
  ms: number,
  message: string
): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(message)), ms)
    ),
  ]);
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      if (result && result.length > 0) {
        if (result.length > 800_000) {
          reject(
            new Error(
              "Audio too large for base64 storage. Try a shorter recording."
            )
          );
          return;
        }
        resolve(result);
      } else {
        reject(new Error("Empty result from FileReader"));
      }
    };
    reader.onerror = () => reject(new Error("FileReader error"));
    reader.readAsDataURL(blob);
  });
}

function getExtension(mimeType: string): string {
  if (!mimeType) return ".webm";
  if (mimeType.includes("webm")) return ".webm";
  if (mimeType.includes("mp4")) return ".m4a";
  if (mimeType.includes("mp3") || mimeType.includes("mpeg")) return ".mp3";
  if (mimeType.includes("ogg")) return ".ogg";
  if (mimeType.includes("wav")) return ".wav";
  return ".webm";
}
