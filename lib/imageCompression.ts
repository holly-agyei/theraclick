/**
 * Advanced Image Compression Service
 * Automatically reduces image size to fit within target size limit
 * Works for all image uploads in the app
 */

export interface CompressionOptions {
  targetSizeBytes?: number; // Default: 400KB
  maxWidth?: number; // Default: 1200px
  maxHeight?: number; // Default: 1200px
  quality?: number; // Starting quality (0-1), default: 0.85
  minQuality?: number; // Minimum quality before reducing dimensions, default: 0.3
}

/**
 * Compresses an image file to fit within the target size
 * Uses intelligent quality reduction and dimension scaling
 */
export async function compressImage(
  file: File,
  options: CompressionOptions = {}
): Promise<File> {
  const {
    targetSizeBytes = 400 * 1024, // 400KB default
    maxWidth = 1200,
    maxHeight = 1200,
    quality = 0.85,
    minQuality = 0.3,
  } = options;

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let width = img.width;
        let height = img.height;

        // First, resize if image is too large dimensionally
        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width = width * ratio;
          height = height * ratio;
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Could not create canvas context"));
          return;
        }

        // Use high-quality image rendering
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = "high";
        ctx.drawImage(img, 0, 0, width, height);

        // Recursive function to compress with quality adjustment
        const compressWithQuality = (q: number, currentWidth: number, currentHeight: number): Promise<File> => {
          return new Promise((res, rej) => {
            // Update canvas dimensions if needed
            if (canvas.width !== currentWidth || canvas.height !== currentHeight) {
              canvas.width = currentWidth;
              canvas.height = currentHeight;
              ctx.clearRect(0, 0, canvas.width, canvas.height);
              ctx.drawImage(img, 0, 0, currentWidth, currentHeight);
            }

            canvas.toBlob(
              (blob) => {
                if (!blob) {
                  rej(new Error("Compression failed"));
                  return;
                }

                // If we're at or below target size, accept it
                if (blob.size <= targetSizeBytes) {
                  const compressedFile = new File(
                    [blob],
                    file.name.replace(/\.[^/.]+$/, ".jpg"),
                    {
                      type: "image/jpeg",
                      lastModified: Date.now(),
                    }
                  );
                  res(compressedFile);
                } else if (q > minQuality) {
                  // Reduce quality and try again
                  compressWithQuality(Math.max(q - 0.1, minQuality), currentWidth, currentHeight)
                    .then(res)
                    .catch(rej);
                } else {
                  // Quality is at minimum, reduce dimensions if possible
                  if (currentWidth > 400 && currentHeight > 400) {
                    const newWidth = Math.max(currentWidth * 0.8, 400);
                    const newHeight = Math.max(currentHeight * 0.8, 400);
                    compressWithQuality(0.7, newWidth, newHeight).then(res).catch(rej);
                  } else {
                    // Accept the file even if slightly over target (better than failing)
                    const compressedFile = new File(
                      [blob],
                      file.name.replace(/\.[^/.]+$/, ".jpg"),
                      {
                        type: "image/jpeg",
                        lastModified: Date.now(),
                      }
                    );
                    res(compressedFile);
                  }
                }
              },
              "image/jpeg",
              q
            );
          });
        };

        compressWithQuality(quality, width, height).then(resolve).catch(reject);
      };
      img.onerror = () => reject(new Error("Failed to load image"));
    };
    reader.onerror = () => reject(new Error("Failed to read file"));
  });
}

/**
 * Converts a file to base64 string for Firestore storage
 * Validates size before conversion
 */
export async function convertToBase64(file: File, maxSizeBytes: number = 400 * 1024): Promise<string> {
  if (file.size > maxSizeBytes) {
    throw new Error(
      `Image too large (${Math.round(file.size / 1024)}KB). Maximum size is ${Math.round(maxSizeBytes / 1024)}KB.`
    );
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const base64 = reader.result as string;
      // Check if base64 string is too large (Firestore limit is 1MB per document)
      if (base64.length > 800 * 1024) {
        // ~800KB base64 = ~600KB image
        reject(
          new Error(
            "Compressed image is still too large. Please use a smaller image (under 300KB)."
          )
        );
        return;
      }
      resolve(base64);
    };
    reader.onerror = reject;
  });
}
