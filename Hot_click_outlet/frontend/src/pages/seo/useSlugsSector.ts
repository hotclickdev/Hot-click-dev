import { useQuery } from '@tanstack/react-query'
import { seoService } from '@/services/seoService'

/** Slugs de sectores con landing indexable. Cache compartida entre home y catálogo. */
export function useSlugsSector() {
  const query = useQuery({
    queryKey: ['seo-sectores'],
    queryFn: () => seoService.sectores(),
    staleTime: 60_000,
  })
  return new Set((query.data ?? []).map(sector => sector.slug))
}
