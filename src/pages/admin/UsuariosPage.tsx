import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil, X, Check, ShieldCheck, User as UserIcon, ToggleLeft, ToggleRight, ClipboardCheck } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/Card';
import { cn } from '@/utils/cn';
import type { RepresentanteERP } from '@/types';
import {
  fetchUsuarios,
  createUsuario,
  updateUsuario,
  linkRepresentante,
  unlinkRepresentante,
  type UsuarioComReps,
} from '@/services/usuarios';
import { fetchRepresentantes } from '@/services/representantes';

// ─── Tipo do usuário ───────────────────────────────────
type TipoUsuario = 'representante' | 'operador' | 'admin';

function getTipo(u: { admin: boolean; operador: boolean }): TipoUsuario {
  if (u.admin)    return 'admin';
  if (u.operador) return 'operador';
  return 'representante';
}

// ─── Seletor de tipo ───────────────────────────────────
function TipoSelector({ value, onChange }: { value: TipoUsuario; onChange: (t: TipoUsuario) => void }) {
  const tipos: { key: TipoUsuario; label: string; desc: string; icon: React.ElementType; color: string }[] = [
    { key: 'representante', label: 'Representante', desc: 'Cria e envia orçamentos', icon: UserIcon,      color: 'border-blue-300 bg-blue-50 text-blue-700'     },
    { key: 'operador',      label: 'Operador',      desc: 'Aprova e rejeita orçamentos', icon: ClipboardCheck, color: 'border-sky-300 bg-sky-50 text-sky-700'         },
    { key: 'admin',         label: 'Administrador', desc: 'Acesso total ao painel', icon: ShieldCheck,   color: 'border-amber-300 bg-amber-50 text-amber-700'  },
  ];

  return (
    <div>
      <label className="text-xs font-semibold text-gray-500 mb-2 block">Tipo de acesso</label>
      <div className="grid grid-cols-3 gap-2">
        {tipos.map(({ key, label, desc, icon: Icon, color }) => (
          <button
            key={key}
            type="button"
            onClick={() => onChange(key)}
            className={cn(
              'flex flex-col items-center gap-1 p-3 rounded-xl border-2 transition-all text-center',
              value === key ? color + ' border-opacity-100' : 'border-gray-200 bg-gray-50 text-gray-500 hover:border-gray-300'
            )}
          >
            <Icon className="w-5 h-5" />
            <span className="text-xs font-semibold leading-tight">{label}</span>
            <span className="text-[10px] leading-tight opacity-70">{desc}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Modal Criar Usuário ───────────────────────────────
function CriarModal({
  onClose, onSave, saving, error,
}: {
  onClose: () => void;
  onSave: (nome: string, email: string, senha: string, admin: boolean, operador: boolean) => void;
  saving: boolean;
  error?: string;
}) {
  const [nome,  setNome]  = useState('');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [tipo,  setTipo]  = useState<TipoUsuario>('representante');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="font-bold text-gray-900">Novo Usuário</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
        </div>

        <div className="px-5 py-4 space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2 rounded-lg">{error}</div>
          )}

          <div>
            <label className="text-xs font-semibold text-gray-500 mb-1 block">Nome completo</label>
            <input value={nome} onChange={e => setNome(e.target.value)} placeholder="Lillian Silva"
              className="w-full h-9 px-3 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[hsl(142,93%,8%)]" />
          </div>

          <div>
            <label className="text-xs font-semibold text-gray-500 mb-1 block">E-mail</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="lillian@concrem.com.br"
              className="w-full h-9 px-3 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[hsl(142,93%,8%)]" />
          </div>

          <div>
            <label className="text-xs font-semibold text-gray-500 mb-1 block">Senha provisória</label>
            <input type="password" value={senha} onChange={e => setSenha(e.target.value)} placeholder="••••••••"
              className="w-full h-9 px-3 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[hsl(142,93%,8%)]" />
          </div>

          <TipoSelector value={tipo} onChange={setTipo} />
        </div>

        <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-gray-100">
          <button onClick={onClose} className="h-9 px-4 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50">
            Cancelar
          </button>
          <button
            onClick={() => onSave(nome, email, senha, tipo === 'admin', tipo === 'operador')}
            disabled={saving || !nome || !email || !senha}
            className="h-9 px-4 text-sm bg-[hsl(142,93%,8%)] text-white rounded-lg hover:bg-[hsl(142,93%,15%)] disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {saving && <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
            <Check className="w-3.5 h-3.5" />
            Criar usuário
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Modal Editar Usuário ──────────────────────────────
function EditarModal({
  usuario, todosReps, onClose, saving, onUpdate, onLink, onUnlink,
}: {
  usuario: UsuarioComReps;
  todosReps: RepresentanteERP[];
  onClose: () => void;
  saving: boolean;
  onUpdate: (nome: string, admin: boolean, operador: boolean) => void;
  onLink: (repId: string) => void;
  onUnlink: (repId: string) => void;
}) {
  const [nome, setNome] = useState(usuario.nome);
  const [tipo, setTipo] = useState<TipoUsuario>(getTipo(usuario));

  const linkedIds = new Set(usuario.reps.map(r => r.id));
  const ativos = todosReps.filter(r => r.ativo);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 flex-shrink-0">
          <h2 className="font-bold text-gray-900">Editar Usuário</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
        </div>

        <div className="px-5 py-4 space-y-4 overflow-y-auto flex-1">
          <div>
            <label className="text-xs font-semibold text-gray-500 mb-1 block">Nome</label>
            <input value={nome} onChange={e => setNome(e.target.value)}
              className="w-full h-9 px-3 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[hsl(142,93%,8%)]" />
          </div>

          <div>
            <label className="text-xs font-semibold text-gray-500 mb-1 block">E-mail</label>
            <input value={usuario.email} disabled
              className="w-full h-9 px-3 text-sm border border-gray-200 rounded-lg bg-gray-50 text-gray-400" />
          </div>

          <TipoSelector value={tipo} onChange={setTipo} />

          {/* Vínculos com rep codes — só para representante */}
          {tipo === 'representante' && (
            <div>
              <p className="text-xs font-semibold text-gray-500 mb-2">Representantes vinculados</p>
              {ativos.length === 0 ? (
                <p className="text-xs text-gray-400">Nenhum representante ativo cadastrado.</p>
              ) : (
                <div className="space-y-1.5">
                  {ativos.map(rep => {
                    const linked = linkedIds.has(rep.id);
                    return (
                      <label key={rep.id} className="flex items-center gap-2.5 cursor-pointer p-2 rounded-lg hover:bg-gray-50">
                        <input type="checkbox" checked={linked}
                          onChange={() => linked ? onUnlink(rep.id) : onLink(rep.id)}
                          className="w-4 h-4 rounded accent-[hsl(142,93%,8%)]" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900">{rep.nome_erp}</p>
                          <p className="text-xs text-gray-400 font-mono truncate">{rep.representante_erp}</p>
                        </div>
                        <span className="text-xs text-gray-500 flex-shrink-0">{rep.comissao_percentual}%</span>
                      </label>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-gray-100 flex-shrink-0">
          <button onClick={onClose} className="h-9 px-4 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50">
            Fechar
          </button>
          <button
            onClick={() => onUpdate(nome, tipo === 'admin', tipo === 'operador')}
            disabled={saving || !nome}
            className="h-9 px-4 text-sm bg-[hsl(142,93%,8%)] text-white rounded-lg hover:bg-[hsl(142,93%,15%)] disabled:opacity-50 flex items-center gap-2"
          >
            {saving && <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
            <Check className="w-3.5 h-3.5" />
            Salvar
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Badge de tipo ─────────────────────────────────────
function TipoBadge({ u }: { u: UsuarioComReps }) {
  if (u.admin) return (
    <span className="flex items-center gap-1 text-[10px] bg-amber-50 text-amber-700 border border-amber-200 px-1.5 py-0.5 rounded-full font-medium">
      <ShieldCheck className="w-2.5 h-2.5" />Admin
    </span>
  );
  if (u.operador) return (
    <span className="flex items-center gap-1 text-[10px] bg-sky-50 text-sky-700 border border-sky-200 px-1.5 py-0.5 rounded-full font-medium">
      <ClipboardCheck className="w-2.5 h-2.5" />Operador
    </span>
  );
  return (
    <span className="flex items-center gap-1 text-[10px] bg-blue-50 text-blue-700 border border-blue-200 px-1.5 py-0.5 rounded-full font-medium">
      <UserIcon className="w-2.5 h-2.5" />Representante
    </span>
  );
}

// ─── Página ────────────────────────────────────────────
export default function AdminUsuariosPage() {
  const qc = useQueryClient();
  const [showCriar, setShowCriar] = useState(false);
  const [editando, setEditando]   = useState<UsuarioComReps | null>(null);
  const [criarError, setCriarError] = useState('');

  const { data: usuarios = [], isLoading } = useQuery({
    queryKey: ['admin-usuarios'],
    queryFn: fetchUsuarios,
  });

  const { data: todosReps = [] } = useQuery({
    queryKey: ['admin-representantes'],
    queryFn: fetchRepresentantes,
  });

  const criarMutation = useMutation({
    mutationFn: async ({ nome, email, senha, admin, operador }: { nome: string; email: string; senha: string; admin: boolean; operador: boolean }) => {
      const result = await createUsuario(nome, email, senha, admin, operador);
      if (result.error) throw new Error(result.error);
      return result;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-usuarios'] }); setShowCriar(false); setCriarError(''); },
    onError: (err: Error) => setCriarError(err.message),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, nome, admin, operador }: { id: string; nome: string; admin: boolean; operador: boolean }) =>
      updateUsuario(id, { nome, admin, operador }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-usuarios'] }),
  });

  const toggleAtivoMutation = useMutation({
    mutationFn: ({ id, ativo }: { id: string; ativo: boolean }) => updateUsuario(id, { ativo: !ativo }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-usuarios'] }),
  });

  const linkMutation = useMutation({
    mutationFn: ({ usuarioId, repId }: { usuarioId: string; repId: string }) => linkRepresentante(usuarioId, repId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-usuarios'] }),
  });

  const unlinkMutation = useMutation({
    mutationFn: ({ usuarioId, repId }: { usuarioId: string; repId: string }) => unlinkRepresentante(usuarioId, repId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-usuarios'] }),
  });

  const usuarioEditandoAtualizado = editando
    ? usuarios.find(u => u.id === editando.id) ?? editando
    : null;

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Usuários</h1>
          <p className="text-sm text-gray-500 mt-0.5">Representantes, operadores e administradores do portal</p>
        </div>
        <button
          onClick={() => { setCriarError(''); setShowCriar(true); }}
          className="flex items-center gap-1.5 h-9 px-4 bg-[hsl(142,93%,8%)] text-white text-sm rounded-lg hover:bg-[hsl(142,93%,15%)] transition-colors"
        >
          <Plus className="w-4 h-4" />
          Adicionar
        </button>
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <div className="w-7 h-7 border-2 border-[hsl(142,93%,8%)] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : usuarios.length === 0 ? (
            <p className="text-center text-sm text-gray-400 py-12">Nenhum usuário cadastrado</p>
          ) : (
            <div className="divide-y divide-gray-50">
              {usuarios.map(u => (
                <div key={u.id} className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50/50 transition-colors">
                  <div className={cn(
                    'w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0',
                    u.admin ? 'bg-amber-500' : u.operador ? 'bg-sky-500' : 'bg-[hsl(142,93%,8%)]'
                  )}>
                    {u.nome.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-sm text-gray-900">{u.nome}</span>
                      <TipoBadge u={u} />
                      <span className={cn(
                        'text-[10px] px-1.5 py-0.5 rounded-full font-medium',
                        u.ativo ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'
                      )}>
                        {u.ativo ? 'Ativo' : 'Inativo'}
                      </span>
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5">{u.email}</p>
                    {!u.admin && !u.operador && u.reps.length > 0 && (
                      <div className="flex gap-1 mt-1 flex-wrap">
                        {u.reps.map(r => (
                          <span key={r.id} className="text-[10px] bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded font-mono">
                            {r.codigo}
                          </span>
                        ))}
                      </div>
                    )}
                    {!u.admin && !u.operador && u.reps.length === 0 && (
                      <p className="text-[10px] text-amber-600 mt-0.5">Sem representantes vinculados</p>
                    )}
                  </div>

                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button onClick={() => toggleAtivoMutation.mutate({ id: u.id, ativo: u.ativo })}
                      title={u.ativo ? 'Desativar' : 'Ativar'}
                      className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors">
                      {u.ativo ? <ToggleRight className="w-4 h-4 text-green-600" /> : <ToggleLeft className="w-4 h-4" />}
                    </button>
                    <button onClick={() => setEditando(u)} title="Editar"
                      className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors">
                      <Pencil className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {showCriar && (
        <CriarModal
          onClose={() => setShowCriar(false)}
          onSave={(nome, email, senha, admin, operador) => criarMutation.mutate({ nome, email, senha, admin, operador })}
          saving={criarMutation.isPending}
          error={criarError}
        />
      )}

      {usuarioEditandoAtualizado && (
        <EditarModal
          usuario={usuarioEditandoAtualizado}
          todosReps={todosReps}
          onClose={() => setEditando(null)}
          saving={updateMutation.isPending}
          onUpdate={(nome, admin, operador) => updateMutation.mutate({ id: usuarioEditandoAtualizado.id, nome, admin, operador })}
          onLink={repId => linkMutation.mutate({ usuarioId: usuarioEditandoAtualizado.id, repId })}
          onUnlink={repId => unlinkMutation.mutate({ usuarioId: usuarioEditandoAtualizado.id, repId })}
        />
      )}
    </div>
  );
}
