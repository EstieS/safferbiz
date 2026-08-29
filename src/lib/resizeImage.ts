'use client'

// Client-side logo processing: downscale to a square canvas and re-encode so the
// bytes leaving the browser are tiny (~15-40 KB) regardless of the source file.
// The server still validates type + size as a backstop.

const CANVAS_DIM = 400
const QUALITY = 0.85

export interface ResizedImage {
  blob: Blob
  type: string
}

export async function resizeLogo(file: File): Promise<ResizedImage> {
  if (!file.type.startsWith('image/')) {
    throw new Error('Please choose an image file.')
  }

  const source = await loadImage(file)
  const { width, height } = source

  // Scale to fit inside the square, never upscaling.
  const scale = Math.min(1, CANVAS_DIM / Math.max(width, height))
  const drawW = Math.round(width * scale)
  const drawH = Math.round(height * scale)

  const canvas = document.createElement('canvas')
  canvas.width = CANVAS_DIM
  canvas.height = CANVAS_DIM
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Could not process the image in this browser.')

  // Transparent padding — a wide logo is letterboxed rather than cropped.
  ctx.clearRect(0, 0, CANVAS_DIM, CANVAS_DIM)
  ctx.drawImage(source, (CANVAS_DIM - drawW) / 2, (CANVAS_DIM - drawH) / 2, drawW, drawH)

  if (typeof ImageBitmap !== 'undefined' && source instanceof ImageBitmap) {
    source.close()
  }

  const webp = await toBlob(canvas, 'image/webp', QUALITY)
  if (webp) return { blob: webp, type: 'image/webp' }

  const jpeg = await toBlob(canvas, 'image/jpeg', QUALITY)
  if (jpeg) return { blob: jpeg, type: 'image/jpeg' }

  throw new Error('Could not process the image in this browser.')
}

async function loadImage(file: File): Promise<ImageBitmap | HTMLImageElement> {
  if (typeof createImageBitmap === 'function') {
    try {
      return await createImageBitmap(file)
    } catch {
      // Fall through to the <img> path.
    }
  }

  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      URL.revokeObjectURL(url)
      resolve(img)
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Could not read that image file.'))
    }
    img.src = url
  })
}

function toBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, type, quality))
}
