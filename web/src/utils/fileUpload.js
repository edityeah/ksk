// File → base64 data URL helpers + a thin <FileDropzone /> component.
//
// We don't have multer on the backend; every "upload" is a JSON POST whose
// body carries a base64 data URL. Express body limit is 5 MB which fits the
// scanned-PDF / phone-photo cases that demo flows produce.
//
// PDFs aren't directly vision-readable by gpt-4o, so for PDF inputs we render
// the first page to a JPEG via pdf.js. To avoid adding pdf.js as a dep we just
// reject PDFs with a friendly message — the demo flow asks users to upload a
// photo of the letter (camera or image file), which is the realistic mobile
// path anyway.

export const ACCEPT_IMAGE = 'image/png,image/jpeg,image/webp,image/heic'
export const MAX_SIZE_MB = 4

export function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    if (!file) return reject(new Error('no_file'))
    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      return reject(new Error(`File too large (>${MAX_SIZE_MB} MB). Try a smaller photo.`))
    }
    const fr = new FileReader()
    fr.onerror = () => reject(fr.error || new Error('read_failed'))
    fr.onload = () => resolve(String(fr.result || ''))
    fr.readAsDataURL(file)
  })
}
