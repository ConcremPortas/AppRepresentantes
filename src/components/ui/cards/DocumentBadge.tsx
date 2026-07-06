import { FileText, Receipt, FileCheck2 } from 'lucide-react';
import { cn } from '@/utils/cn';

// Chip de documento (NF / Boleto / genérico) com estado OK vs pendente.
// OK = verde · pendente/aguardando = âmbar.
export default function DocumentBadge({
  kind, ok, label,
}: {
  kind: 'nf' | 'boleto' | 'doc';
  ok: boolean;
  label?: string;
}) {
  const Icon = kind === 'nf' ? FileText : kind === 'boleto' ? Receipt : FileCheck2;
  const nome = kind === 'nf' ? 'NF' : kind === 'boleto' ? 'Boleto' : 'Doc';
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold whitespace-nowrap',
        ok ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200',
      )}
    >
      <Icon className="w-2.5 h-2.5" />
      {label ?? `${nome} ${ok ? 'OK' : 'pendente'}`}
    </span>
  );
}
