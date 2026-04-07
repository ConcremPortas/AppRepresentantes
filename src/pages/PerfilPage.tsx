import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { Mail, LogOut, ShieldCheck, Briefcase, Hash, Percent } from 'lucide-react';
import { cn } from '@/utils/cn';

export default function PerfilPage() {
  const { user, logout } = useAuth();

  const nome      = user?.usuario?.nome ?? user?.representante?.nome ?? 'Usuário';
  const email     = user?.email ?? '';
  const isAdmin   = user?.usuario?.admin ?? false;
  const repCodes  = user?.repCodes ?? [];

  const initials = nome
    .split(' ')
    .filter(Boolean)
    .map(w => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <div className="p-5 space-y-5 max-w-2xl mx-auto">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">Meu Perfil</h1>
        <Button variant="outline" size="sm" onClick={logout}>
          <LogOut className="w-4 h-4" />
          Sair
        </Button>
      </div>

      {/* Identificação */}
      <Card>
        <CardContent className="py-6">
          <div className="flex items-center gap-5">
            <div className={cn(
              'w-16 h-16 rounded-2xl flex items-center justify-center text-white text-xl font-bold flex-shrink-0',
              isAdmin ? 'bg-amber-600' : 'bg-[hsl(142,93%,8%)]',
            )}>
              {initials}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg font-bold text-gray-900 truncate">{nome}</h2>
                {isAdmin && (
                  <span className="flex items-center gap-1 text-[10px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                    <ShieldCheck className="w-3 h-3" />
                    Administrador
                  </span>
                )}
                {!isAdmin && (
                  <span className="text-[10px] font-semibold text-green-700 bg-green-50 px-2 py-0.5 rounded-full border border-green-200">
                    Representante
                  </span>
                )}
              </div>

              <div className="flex items-center gap-1.5 mt-2 text-sm text-gray-500">
                <Mail className="w-4 h-4 text-gray-400 flex-shrink-0" />
                <span className="truncate">{email}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Rep codes */}
      {repCodes.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Briefcase className="w-4 h-4 text-gray-400" />
              <CardTitle>Códigos de Representante</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {repCodes.map(rep => (
              <div
                key={rep.id}
                className="flex items-center justify-between gap-3 bg-gray-50 rounded-xl px-4 py-3"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <Hash className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                    <span className="font-mono text-sm font-semibold text-gray-800">{rep.codigo}</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5 truncate">{rep.nome_erp}</p>
                </div>
                <div className="flex items-center gap-1 text-sm font-bold text-[hsl(142,93%,8%)] flex-shrink-0">
                  <Percent className="w-3.5 h-3.5" />
                  {rep.comissao_percentual}%
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Sem rep codes (admin sem vínculos) */}
      {!isAdmin && repCodes.length === 0 && (
        <Card>
          <CardContent className="py-8 text-center">
            <Briefcase className="w-8 h-8 text-gray-200 mx-auto mb-2" />
            <p className="text-sm text-gray-400">Nenhum código de representante vinculado</p>
            <p className="text-xs text-gray-300 mt-1">Solicite ao administrador para configurar seu acesso</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
