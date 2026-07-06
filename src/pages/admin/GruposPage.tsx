import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Check, X, Pencil, ToggleLeft, ToggleRight, Layers, Users, Briefcase } from 'lucide-react';
import PageContainer from '@/components/ui/PageContainer';
import { Card, CardContent } from '@/components/ui/Card';
import { cn } from '@/utils/cn';
import { fetchClientGroupsAdmin, createClientGroup, updateClientGroup } from '@/services/clientGroups';

export default function AdminGruposPage() {
  const qc = useQueryClient();
  const { data: grupos = [], isLoading, error } = useQuery({
    queryKey: ['client-groups-admin'],
    queryFn: fetchClientGroupsAdmin,
  });
  const [novo, setNovo] = useState('');
  const [editId, setEditId] = useState<string | null>(null);
  const [editNome, setEditNome] = useState('');
  const [erro, setErro] = useState('');

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['client-groups-admin'] });
    qc.invalidateQueries({ queryKey: ['client-groups'] });
  };

  const criar = useMutation({
    mutationFn: (name: string) => createClientGroup(name),
    onSuccess: () => { setNovo(''); setErro(''); invalidate(); },
    onError: (e: Error) => setErro(e.message),
  });
  const atualizar = useMutation({
    mutationFn: ({ id, fields }: { id: string; fields: { name?: string; is_active?: boolean } }) => updateClientGroup(id, fields),
    onSuccess: () => { setEditId(null); setErro(''); invalidate(); },
    onError: (e: Error) => setErro(e.message),
  });

  return (
    <PageContainer size="lg">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Grupos de Clientes</h1>
        <p className="text-sm text-gray-500 mt-0.5">Grupos que definem o escopo de dados dos diretores</p>
      </div>

      {(erro || error) && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">
          {erro || (error as Error)?.message}
        </div>
      )}

      {/* Novo grupo */}
      <Card>
        <CardContent className="flex items-center gap-2">
          <input value={novo} onChange={e => setNovo(e.target.value)} placeholder="Nome do novo grupo"
            onKeyDown={e => { if (e.key === 'Enter' && novo.trim()) criar.mutate(novo.trim()); }}
            className="flex-1 h-9 px-3 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[hsl(142,93%,8%)]" />
          <button onClick={() => novo.trim() && criar.mutate(novo.trim())} disabled={!novo.trim() || criar.isPending}
            className="h-9 px-4 text-sm bg-[hsl(142,93%,8%)] text-white rounded-lg hover:bg-[hsl(142,93%,15%)] disabled:opacity-50 flex items-center gap-1.5 flex-shrink-0">
            <Plus className="w-4 h-4" /> Adicionar
          </button>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="py-16 text-center text-sm text-gray-400">Carregando…</div>
          ) : grupos.length === 0 ? (
            <div className="py-16 text-center text-sm text-gray-400">Nenhum grupo cadastrado.</div>
          ) : (
            <div className="divide-y divide-gray-100">
              {grupos.map(g => (
                <div key={g.id} className="flex items-center gap-3 px-4 py-3">
                  <Layers className={cn('w-4 h-4 flex-shrink-0', g.is_active ? 'text-[hsl(142,93%,8%)]' : 'text-gray-300')} />
                  <div className="flex-1 min-w-0">
                    {editId === g.id ? (
                      <div className="flex items-center gap-2">
                        <input value={editNome} onChange={e => setEditNome(e.target.value)} autoFocus
                          onKeyDown={e => { if (e.key === 'Enter' && editNome.trim()) atualizar.mutate({ id: g.id, fields: { name: editNome.trim() } }); }}
                          className="flex-1 h-8 px-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[hsl(142,93%,8%)]" />
                        <button onClick={() => editNome.trim() && atualizar.mutate({ id: g.id, fields: { name: editNome.trim() } })} className="text-emerald-600 p-1" title="Salvar"><Check className="w-4 h-4" /></button>
                        <button onClick={() => setEditId(null)} className="text-gray-400 p-1" title="Cancelar"><X className="w-4 h-4" /></button>
                      </div>
                    ) : (
                      <p className={cn('text-sm font-medium truncate', g.is_active ? 'text-gray-800' : 'text-gray-400 line-through')}>{g.name}</p>
                    )}
                    <p className="text-[11px] text-gray-400 mt-0.5 flex items-center gap-3">
                      <span className="inline-flex items-center gap-1"><Users className="w-3 h-3" />{g.clientes.toLocaleString('pt-BR')} cliente(s)</span>
                      <span className="inline-flex items-center gap-1"><Briefcase className="w-3 h-3" />{g.diretores} diretor(es)</span>
                    </p>
                  </div>
                  {editId !== g.id && (
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button onClick={() => { setEditId(g.id); setEditNome(g.name); }} title="Renomear" className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg"><Pencil className="w-4 h-4" /></button>
                      <button onClick={() => atualizar.mutate({ id: g.id, fields: { is_active: !g.is_active } })} title={g.is_active ? 'Desativar' : 'Ativar'} className="p-1.5 rounded-lg hover:bg-gray-100">
                        {g.is_active ? <ToggleRight className="w-6 h-6 text-[hsl(142,93%,8%)]" /> : <ToggleLeft className="w-6 h-6 text-gray-300" />}
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </PageContainer>
  );
}
