// ─────────────────────────────────────────────────────────────────────────────
// Perfis do Concrem Connect — rótulos e helpers de role.
// Fonte de verdade: coluna `perfil` em concremapprep_usuarios. Para
// compatibilidade durante a transição, se `perfil` não estiver preenchido,
// derivamos do par de flags admin/operador já existente.
// ─────────────────────────────────────────────────────────────────────────────
import type { Perfil, Usuario } from '@/types';

export const PERFIL_LABEL: Record<Perfil, string> = {
  representante: 'Representante',
  operador: 'Operador',
  admin: 'Administrador',
  diretor: 'Diretor',
  diretor_geral: 'Diretor Geral',
};

/** Perfil efetivo do usuário: usa a coluna `perfil`; se ausente, cai nos flags. */
export function perfilDoUsuario(u?: Usuario | null): Perfil {
  if (u?.perfil) return u.perfil;
  if (u?.admin) return 'admin';
  if (u?.operador) return 'operador';
  return 'representante';
}

/** Visão global (vê tudo, sem filtro de escopo): admin e diretor geral. */
export const isGlobal = (p: Perfil): boolean => p === 'admin' || p === 'diretor_geral';
export const isDiretor = (p: Perfil): boolean => p === 'diretor';
export const isRepresentante = (p: Perfil): boolean => p === 'representante';
