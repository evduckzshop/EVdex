// Shrink phone photos before upload.
//
// A modern phone photo is 3-5MB, and uploadPhoto awaits the upload before the
// sale is inserted — so on venue wifi the photo is the thing most likely to
// leave you waiting with a customer in front of you.
//
// Every failure path returns the original file untouched. A slow upload is a
// far better outcome than a failed save.

const MAX_DIMENSION = 1600
const JPEG_QUALITY = 0.72
const SKIP_UNDER_BYTES = 400 * 1024

export async function compressImage(file) {
  if (!file) return file
  // Re-encoding a GIF to JPEG would drop the animation, and files already
  // this small gain nothing worth the CPU.
  if (file.type === 'image/gif' || file.size <= SKIP_UNDER_BYTES) return file

  try {
    const source = await loadImage(file)
    const srcW = source.width || source.naturalWidth
    const srcH = source.height || source.naturalHeight
    if (!srcW || !srcH) return file

    const scale = Math.min(1, MAX_DIMENSION / Math.max(srcW, srcH))
    const w = Math.round(srcW * scale)
    const h = Math.round(srcH * scale)

    const canvas = document.createElement('canvas')
    canvas.width = w
    canvas.height = h
    const ctx = canvas.getContext('2d')
    if (!ctx) return file
    ctx.drawImage(source, 0, 0, w, h)
    if (typeof source.close === 'function') source.close()

    const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', JPEG_QUALITY))
    // Never hand back something bigger than what we were given.
    if (!blob || blob.size >= file.size) return file

    return new File([blob], swapExtension(file.name, 'jpg'), {
      type: 'image/jpeg',
      lastModified: Date.now(),
    })
  } catch (e) {
    console.warn('Image compression failed — uploading the original:', e)
    return file
  }
}

// createImageBitmap applies EXIF orientation; drawing a bare <img> to canvas
// does not in every browser. Without this, portrait phone photos upload
// rotated sideways.
async function loadImage(file) {
  if (typeof createImageBitmap === 'function') {
    try {
      return await createImageBitmap(file, { imageOrientation: 'from-image' })
    } catch {
      // Option unsupported on this browser — fall through to the <img> path.
    }
  }
  return await loadViaImageElement(file)
}

function loadViaImageElement(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => { URL.revokeObjectURL(url); resolve(img) }
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Could not read image')) }
    img.src = url
  })
}

function swapExtension(name, ext) {
  const base = (name || 'photo').replace(/\.[^.]+$/, '')
  return `${base}.${ext}`
}
