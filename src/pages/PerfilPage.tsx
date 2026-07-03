// ─────────────────────────────────────────────────────────────────────────────
// SQL NECESSÁRIO (rodar manualmente no Supabase — SQL Editor):
// A coluna `telefone` não existe em concremapprep_usuarios. Sem ela, salvar os
// dados pessoais falha. Rode uma vez:
//
//   ALTER TABLE concremapprep_usuarios ADD COLUMN IF NOT EXISTS telefone TEXT;
//
// O update do próprio perfil já é permitido pela policy `usuarios_update_self`
// (id = auth.uid()); o trigger guard só bloqueia admin/operador/ativo/email.
// A troca de senha usa Supabase Auth (auth.updateUser) — não a RPC antiga.
// ─────────────────────────────────────────────────────────────────────────────
import { useState, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Avatar from '@/components/ui/Avatar';
import {
  Mail, LogOut, ShieldCheck, Briefcase, Hash, Percent,
  User as UserIcon, Phone, Lock, Save, Check, AlertCircle, Camera, Loader2,
} from 'lucide-react';
import { cn } from '@/utils/cn';

const AVATAR_MIMES = ['image/png', 'image/jpeg', 'image/webp'];
const AVATAR_MAX = 2 * 1024 * 1024; // 2 MB

// Extrai o caminho no bucket ('id/avatar.ext') a partir da URL pública salva.
function pathFromAvatarUrl(url: string): string | null {
  const m = url.match(/\/avatars\/(.+?)(\?|$)/);
  return m ? m[1] : null;
}

export default function PerfilPage() {
  const { user, logout, refreshUser } = useAuth();

  const isAdmin    = user?.usuario?.admin ?? false;
  const isOperador = user?.usuario?.operador ?? false;
  const email      = user?.email ?? '';
  const repCodes   = user?.repCodes ?? [];

  // ── Dados pessoais ──
  const [nome, setNome]         = useState(user?.usuario?.nome ?? '');
  const [telefone, setTelefone] = useState(user?.usuario?.telefone ?? '');
  const [savingDados, setSavingDados]   = useState(false);
  const [dadosErro, setDadosErro]       = useState<string | null>(null);
  const [dadosOk, setDadosOk]           = useState(false);

  // ── Segurança ──
  const [showPwPanel, setShowPwPanel]   = useState(false);
  const [senhaAtual, setSenhaAtual]     = useState('');
  const [novaSenha, setNovaSenha]       = useState('');
  const [confirmar, setConfirmar]       = useState('');
  const [savingPw, setSavingPw]         = useState(false);
  const [pwErro, setPwErro]             = useState<string | null>(null);
  const [pwOk, setPwOk]                 = useState(false);

  // ── Foto ──
  const fileRef = useRef<HTMLInputElement>(null);
  const [avatarLoading, setAvatarLoading] = useState(false);
  const [avatarErro, setAvatarErro]       = useState<string | null>(null);
  const avatarUrl = user?.usuario?.avatar_url ?? null;

  const nomeAtual = user?.usuario?.nome ?? user?.representante?.nome ?? 'Usuário';

  const tipo = isAdmin
    ? { label: 'Administrador', badge: 'text-amber-700 bg-amber-50 border-amber-200', avatar: 'bg-amber-600', icon: ShieldCheck }
    : isOperador
      ? { label: 'Operador', badge: 'text-sky-700 bg-sky-50 border-sky-200', avatar: 'bg-sky-600', icon: Briefcase }
      : { label: 'Representante', badge: 'text-green-700 bg-green-50 border-green-200', avatar: 'bg-[hsl(142,93%,8%)]', icon: null };
  const TipoIcon = tipo.icon;

  async function handleSalvarDados() {
    setDadosErro(null); setDadosOk(false);
    if (!nome.trim()) { setDadosErro('O nome é obrigatório'); return; }
    if (!user?.id) return;

    setSavingDados(true);
    try {
      const { error } = await supabase
        .from('concremapprep_usuarios')
        .update({ nome: nome.trim(), telefone: telefone.trim() || null })
        .eq('id', user.id);

      if (error) {
        // Se a coluna telefone ainda não existe, o Supabase retorna erro aqui.
        setDadosErro(
          /telefone/i.test(error.message)
            ? 'A coluna "telefone" ainda não existe no banco. Rode o ALTER TABLE indicado no topo do arquivo.'
            : error.message
        );
        return;
      }
      setDadosOk(true);
      await refreshUser();
    } finally {
      setSavingDados(false);
    }
  }

  async function handleTrocarSenha() {
    setPwErro(null); setPwOk(false);
    if (!senhaAtual)                 { setPwErro('Informe a senha atual'); return; }
    if (novaSenha.length < 8)        { setPwErro('A nova senha deve ter ao menos 8 caracteres'); return; }
    if (novaSenha !== confirmar)     { setPwErro('A confirmação não coincide com a nova senha'); return; }
    if (novaSenha === senhaAtual)    { setPwErro('A nova senha deve ser diferente da atual'); return; }

    setSavingPw(true);
    try {
      // Verifica a senha atual reautenticando o próprio usuário (mesma conta → só renova o token).
      const { error: reauthErr } = await supabase.auth.signInWithPassword({ email, password: senhaAtual });
      if (reauthErr) { setPwErro('Senha atual incorreta'); return; }

      const { error } = await supabase.auth.updateUser({ password: novaSenha });
      if (error) { setPwErro(error.message); return; }

      setPwOk(true);
      setSenhaAtual(''); setNovaSenha(''); setConfirmar('');
      setShowPwPanel(false);
    } finally {
      setSavingPw(false);
    }
  }

  async function handleSelecionarFoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ''; // permite reselecionar o mesmo arquivo depois
    if (!file || !user?.id) return;

    setAvatarErro(null);
    // Validação no cliente ANTES de subir
    if (!AVATAR_MIMES.includes(file.type)) {
      setAvatarErro('Formato não suportado (use PNG, JPG ou WEBP)');
      return;
    }
    if (file.size > AVATAR_MAX) {
      setAvatarErro('Imagem muito grande (máx 2MB)');
      return;
    }

    setAvatarLoading(true);
    try {
      const ext = file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'jpg';
      const path = `${user.id}/avatar.${ext}`;

      // Remove o arquivo anterior (se existir) — ignora erro se não existir
      await supabase.storage.from('avatars').remove([path]);

      // Upload limpo, SEM upsert
      const { error: upErr } = await supabase.storage
        .from('avatars')
        .upload(path, file, { contentType: file.type });
      if (upErr) { setAvatarErro(`Falha ao enviar a imagem: ${upErr.message}`); return; }

      const { data: pub } = supabase.storage.from('avatars').getPublicUrl(path);
      // cache-buster: URL única por upload evita exibir a foto antiga em cache
      const publicUrl = `${pub.publicUrl}?t=${Date.now()}`;

      const { error: dbErr } = await supabase
        .from('concremapprep_usuarios')
        .update({ avatar_url: publicUrl })
        .eq('id', user.id);
      if (dbErr) { setAvatarErro(`Foto enviada, mas falhou ao salvar: ${dbErr.message}`); return; }

      await refreshUser();
    } catch (err) {
      setAvatarErro(err instanceof Error ? err.message : 'Erro ao enviar a foto');
    } finally {
      setAvatarLoading(false);
    }
  }

  async function handleRemoverFoto() {
    if (!user?.id) return;
    setAvatarErro(null);
    setAvatarLoading(true);
    try {
      const path = avatarUrl ? pathFromAvatarUrl(avatarUrl) : null;
      if (path) await supabase.storage.from('avatars').remove([path]);

      const { error } = await supabase
        .from('concremapprep_usuarios')
        .update({ avatar_url: null })
        .eq('id', user.id);
      if (error) { setAvatarErro(error.message); return; }

      await refreshUser();
    } catch (err) {
      setAvatarErro(err instanceof Error ? err.message : 'Erro ao remover a foto');
    } finally {
      setAvatarLoading(false);
    }
  }

  return (
    <div className="p-5 space-y-5 max-w-2xl mx-auto">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">Meu Perfil</h1>
        <Button variant="outline" size="sm" onClick={logout}>
          <LogOut className="w-4 h-4" />
          Sair
        </Button>
      </div>

      {/* ── Identificação ── */}
      <Card>
        <CardContent className="py-6">
          <div className="flex items-center gap-5">
            {/* Avatar + botão de câmera */}
            <div className="relative flex-shrink-0">
              <Avatar nome={nomeAtual} avatarUrl={avatarUrl} size="lg" bgColor={tipo.avatar} />
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={avatarLoading}
                aria-label="Alterar foto"
                className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-white border border-gray-200 shadow flex items-center justify-center text-gray-600 hover:text-gray-900 hover:border-gray-300 transition-colors disabled:opacity-50"
              >
                {avatarLoading
                  ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  : <Camera className="w-3.5 h-3.5" />}
              </button>
              <input
                ref={fileRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="hidden"
                onChange={handleSelecionarFoto}
              />
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg font-bold text-gray-900 truncate">{nomeAtual}</h2>
                <span className={cn(
                  'flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border',
                  tipo.badge,
                )}>
                  {TipoIcon && <TipoIcon className="w-3 h-3" />}
                  {tipo.label}
                </span>
              </div>

              <div className="flex items-center gap-1.5 mt-2 text-sm text-gray-500">
                <Mail className="w-4 h-4 text-gray-400 flex-shrink-0" />
                <span className="truncate">{email}</span>
              </div>

              {/* Ações de foto */}
              <div className="flex items-center gap-3 mt-2">
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  disabled={avatarLoading}
                  className="text-xs font-medium text-[hsl(142,93%,8%)] hover:underline disabled:opacity-50"
                >
                  {avatarUrl ? 'Trocar foto' : 'Adicionar foto'}
                </button>
                {avatarUrl && (
                  <button
                    type="button"
                    onClick={handleRemoverFoto}
                    disabled={avatarLoading}
                    className="text-xs text-red-500 hover:text-red-700 disabled:opacity-50"
                  >
                    Remover
                  </button>
                )}
              </div>
              {avatarErro && (
                <p className="flex items-center gap-1.5 text-xs text-red-600 mt-1">
                  <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                  {avatarErro}
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Dados pessoais ── */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <UserIcon className="w-4 h-4 text-gray-400" />
            <CardTitle>Dados pessoais</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input
            label="Nome"
            icon={UserIcon}
            value={nome}
            onChange={e => { setNome(e.target.value); setDadosOk(false); }}
            placeholder="Seu nome completo"
            disabled={savingDados}
          />

          <Input
            label="Telefone"
            icon={Phone}
            value={telefone}
            onChange={e => { setTelefone(e.target.value); setDadosOk(false); }}
            placeholder="(00) 00000-0000"
            disabled={savingDados}
          />

          <div>
            <Input label="E-mail" icon={Mail} value={email} disabled />
            <p className="text-xs text-gray-400 mt-1">
              O e-mail é usado para login e não pode ser alterado aqui.
            </p>
          </div>

          {dadosErro && (
            <p className="flex items-center gap-1.5 text-xs text-red-600">
              <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
              {dadosErro}
            </p>
          )}
          {dadosOk && (
            <p className="flex items-center gap-1.5 text-xs text-green-600">
              <Check className="w-3.5 h-3.5 flex-shrink-0" />
              Dados atualizados com sucesso.
            </p>
          )}

          <div className="flex justify-end">
            <Button onClick={handleSalvarDados} loading={savingDados} disabled={savingDados}>
              <Save className="w-4 h-4" />
              Salvar alterações
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* ── Segurança ── */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Lock className="w-4 h-4 text-gray-400" />
            <CardTitle>Segurança</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {!showPwPanel ? (
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm text-gray-500">Altere a senha de acesso à sua conta.</p>
              <Button variant="outline" size="sm" onClick={() => { setShowPwPanel(true); setPwOk(false); setPwErro(null); }}>
                <Lock className="w-4 h-4" />
                Alterar senha
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <Input
                label="Senha atual"
                type="password"
                icon={Lock}
                value={senhaAtual}
                onChange={e => setSenhaAtual(e.target.value)}
                placeholder="••••••••"
                disabled={savingPw}
                autoComplete="current-password"
              />
              <Input
                label="Nova senha"
                type="password"
                icon={Lock}
                value={novaSenha}
                onChange={e => setNovaSenha(e.target.value)}
                placeholder="Mínimo 8 caracteres"
                disabled={savingPw}
                autoComplete="new-password"
              />
              <Input
                label="Confirmar nova senha"
                type="password"
                icon={Lock}
                value={confirmar}
                onChange={e => setConfirmar(e.target.value)}
                placeholder="Repita a nova senha"
                disabled={savingPw}
                autoComplete="new-password"
              />

              {pwErro && (
                <p className="flex items-center gap-1.5 text-xs text-red-600">
                  <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                  {pwErro}
                </p>
              )}

              <div className="flex items-center justify-end gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setShowPwPanel(false);
                    setSenhaAtual(''); setNovaSenha(''); setConfirmar('');
                    setPwErro(null);
                  }}
                  disabled={savingPw}
                >
                  Cancelar
                </Button>
                <Button onClick={handleTrocarSenha} loading={savingPw} disabled={savingPw}>
                  <Save className="w-4 h-4" />
                  Salvar nova senha
                </Button>
              </div>
            </div>
          )}

          {pwOk && !showPwPanel && (
            <p className="flex items-center gap-1.5 text-xs text-green-600">
              <Check className="w-3.5 h-3.5 flex-shrink-0" />
              Senha alterada com sucesso.
            </p>
          )}
        </CardContent>
      </Card>

      {/* ── Rep codes ── */}
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
