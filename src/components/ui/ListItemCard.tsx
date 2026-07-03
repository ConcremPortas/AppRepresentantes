import { type ReactNode } from 'react';
import { Card } from './Card';
import ActionMenu, { type ActionMenuItem } from './ActionMenu';

interface ListItemCardProps {
  // Cabeçalho
  id?: string;
  status?: ReactNode;
  // Corpo
  title: string;
  subtitle?: string;
  meta?: ReactNode;
  // Lateral direita
  rightTop?: ReactNode;
  actions?: ActionMenuItem[];
  // Rodapé expansível
  footer?: ReactNode;
  // Interação
  accentColor?: string;
  onClick?: () => void;
}

/** Card de item de lista unificado (mobile-first): cabeçalho + título (line-clamp-2,
 *  nunca trunca em poucos caracteres) + subtítulo + metadados + rodapé. Ações no menu ⋮. */
export default function ListItemCard({
  id, status, title, subtitle, meta, rightTop, actions, footer, accentColor, onClick,
}: ListItemCardProps) {
  return (
    <Card
      hover={!!onClick}
      onClick={onClick}
      style={accentColor ? { borderLeft: `3px solid ${accentColor}` } : undefined}
      className="p-3 sm:p-4"
    >
      {/* Linha 1 — cabeçalho: id + status | rightTop + ⋮ */}
      <div className="flex items-start gap-2 flex-wrap">
        {id && <span className="font-mono text-xs text-gray-400">{id}</span>}
        {status}
        {(rightTop || (actions && actions.length > 0)) && (
          <div className="ml-auto flex items-start gap-1">
            {rightTop && <div className="text-right">{rightTop}</div>}
            {actions && actions.length > 0 && <ActionMenu items={actions} />}
          </div>
        )}
      </div>

      {/* Linha 2 — título (nunca trunca em poucos caracteres) */}
      <p className="font-semibold text-gray-900 text-sm mt-1 line-clamp-2">{title}</p>

      {/* Linha 3 — subtítulo */}
      {subtitle && <p className="text-xs text-gray-500 mt-0.5 truncate">{subtitle}</p>}

      {/* Metadados */}
      {meta && (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-400 mt-2">
          {meta}
        </div>
      )}

      {/* Rodapé expansível */}
      {footer && <div className="border-t border-gray-100 pt-3 mt-3">{footer}</div>}
    </Card>
  );
}
