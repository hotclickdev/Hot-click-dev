import { describe, expect, it } from 'vitest'
import { extractBucketPath, getOptimizedUrl } from './imageUtils'

describe('imageUtils (S3 de AWS, sin Supabase)', () => {
  it('pasa por el proxy las URLs del bucket S3', () => {
    expect(extractBucketPath('https://hotclick-media.s3.us-east-2.amazonaws.com/productos/abc.jpg')).toBe('productos/abc.jpg')
    expect(getOptimizedUrl('https://hotclick-media.s3.us-east-2.amazonaws.com/productos/abc.jpg', { width: 320 }))
      .toBe('/api/img?p=productos%2Fabc.jpg&q=82&w=320')
  })
  it('sigue reconociendo URLs viejas guardadas con formato de bucket HOT_CLICK', () => {
    expect(extractBucketPath('https://x.example/storage/v1/render/image/public/HOT_CLICK/a/b.png?width=10')).toBe('HOT_CLICK/a/b.png')
  })
  it('deja intactas las URLs ajenas y no acepta traversal', () => {
    expect(getOptimizedUrl('https://images.example.com/x.jpg')).toBe('https://images.example.com/x.jpg')
    // El parser de URL resuelve %2E%2E; el path que llega al proxy nunca trae '..'.
    expect(extractBucketPath('https://hotclick-media.s3.us-east-2.amazonaws.com/a/%2E%2E/b.jpg')).toBe('b.jpg')
    expect(extractBucketPath('https://hotclick-media.s3.us-east-2.amazonaws.com/a/%252E%252E/b.jpg')).toBeNull()
    expect(getOptimizedUrl(null)).toBe('')
  })
})
