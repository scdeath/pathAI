/**
 * PATCH /api/admin/institutions/:code
 * Body: { is_featured?, priority?, featured_until?, plan_slug? }
 * Actualiza destaque/priority y opcionalmente registra una suscripción.
 */
import { requireAdmin } from '~/server/utils/require-admin'

export default defineEventHandler(async (event) => {
  const { supabase } = await requireAdmin(event)
  const code = Number(getRouterParam(event, 'code'))
  if (!code) throw createError({ statusCode: 400, statusMessage: 'code inválido' })

  const body = await readBody<{
    is_featured?: boolean
    priority?: number
    featured_until?: string | null
    plan_slug?: string
  }>(event) || {}

  // Si viene plan_slug, tomar priority/features desde catalog
  let computedPriority = body.priority
  if (body.plan_slug) {
    const { data: plan } = await supabase
      .from('plans')
      .select('priority')
      .eq('slug', body.plan_slug)
      .maybeSingle()
    if (!plan) throw createError({ statusCode: 400, statusMessage: 'Plan inexistente' })
    computedPriority = plan.priority
  }

  const patch: Record<string, any> = {}
  if (body.is_featured !== undefined)   patch.is_featured = body.is_featured
  if (computedPriority !== undefined)   patch.priority = computedPriority
  if (body.featured_until !== undefined) patch.featured_until = body.featured_until

  if (!Object.keys(patch).length) {
    throw createError({ statusCode: 400, statusMessage: 'Sin cambios' })
  }

  const { data, error } = await supabase
    .from('institutions')
    .update(patch)
    .eq('institution_code', code)
    .select('institution_code, nombre_institucion, is_featured, priority, featured_until')
    .maybeSingle()

  if (error) throw createError({ statusCode: 500, statusMessage: error.message })
  if (!data)  throw createError({ statusCode: 404, statusMessage: 'Institución no encontrada' })

  // Si plan_slug viene, registrar suscripción
  if (body.plan_slug) {
    await supabase
      .from('institution_subscriptions')
      .update({ is_active: false })
      .eq('institution_code', code)
      .eq('is_active', true)

    await supabase.from('institution_subscriptions').insert({
      institution_code: code,
      plan_slug: body.plan_slug,
      expires_at: body.featured_until ?? null,
      is_active: true,
    })
  }

  return { ok: true, institution: data }
})
