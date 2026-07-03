import { ChevronLeft, ChevronRight } from 'lucide-react';
import Button from '@/components/ui/Button';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

/**
 * Controles de paginação reutilizáveis: Anterior / "Página X de Y" / Próximo.
 * Escondido quando há apenas uma página (ou nenhuma).
 */
export default function Pagination({ currentPage, totalPages, onPageChange }: PaginationProps) {
  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-center gap-2 sm:gap-3 mt-4">
      <Button
        variant="outline"
        size="sm"
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage <= 1}
        aria-label="Página anterior"
      >
        <ChevronLeft className="w-4 h-4" />
        <span className="hidden sm:inline">Anterior</span>
      </Button>

      <span className="text-xs sm:text-sm text-gray-500 tabular-nums whitespace-nowrap px-1">
        Página <span className="font-semibold text-gray-700">{currentPage}</span> de {totalPages}
      </span>

      <Button
        variant="outline"
        size="sm"
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage >= totalPages}
        aria-label="Próxima página"
      >
        <span className="hidden sm:inline">Próximo</span>
        <ChevronRight className="w-4 h-4" />
      </Button>
    </div>
  );
}
