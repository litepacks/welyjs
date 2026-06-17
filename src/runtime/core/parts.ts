/**
 * Kept as a dedicated module so core rendering primitives stay discoverable.
 * Concrete part implementations live in `renderer.ts` for now.
 */
export type PartKind = 'attr' | 'boolean' | 'property' | 'event' | 'child'
