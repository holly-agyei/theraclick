import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage } from "./firebase";

/**
 * Upload an audio blob to Firebase Storage and get the download URL
 * Falls back to base64 data URL if Storage fails
 */
export async function uploadVoiceMessage(
  audioBlob: Blob,
  chatId: string,
  senderId: string
): Promise<string | undefined> {
  console.log("=== UPLOADING VOICE MESSAGE ===");
  console.log("Blob size:", audioBlob.size);
  console.log("Blob type:", audioBlob.type);
  console.log("Chat ID:", chatId);
  console.log("Sender ID:", senderId);

  // If blob is empty, return undefined
  if (!audioBlob || audioBlob.size === 0) {
    console.error("Audio blob is empty");
    return undefined;
  }

  // Try Firebase Storage first
  if (storage) {
    try {
      const timestamp = Date.now();
      const ext = getExtension(audioBlob.type);
      const path = `voice-messages/${chatId}/${senderId}/voice_${timestamp}${ext}`;
      
      console.log("Uploading to Firebase Storage:", path);
      
      const storageRef = ref(storage, path);
      const snapshot = await uploadBytes(storageRef, audioBlob, {
        contentType: audioBlob.type || "audio/webm",
      });
      
      const url = await getDownloadURL(snapshot.ref);
      console.log("✓ Upload successful:", url);
      return url;
    } catch (error: any) {
      console.error("Firebase Storage error:", error?.code, error?.message);
      // Fall through to base64 fallback
    }
  } else {
    console.log("Firebase Storage not available");
  }

  // Fallback: Convert to base64 data URL
  console.log("Using base64 fallback...");
  try {
    const dataUrl = await blobToBase64(audioBlob);
    if (dataUrl) {
      console.log("✓ Base64 conversion successful, length:", dataUrl.length);
      return dataUrl;
    }
  } catch (error) {
    console.error("Base64 conversion failed:", error);
  }

  return undefined;
}

/**
 * Convert blob to base64 data URL
 */
function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      if (result && result.length > 0) {
        // Check size - Firestore has limits
        if (result.length > 900000) {
          reject(new Error("Audio too large for base64 storage"));
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
