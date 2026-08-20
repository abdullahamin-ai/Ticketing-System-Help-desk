import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "./Button";

interface PaginationProps {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  total?: number;
  pageSize?: number;
}

export function Pagination({
  page,
  totalPages,
  onPageChange,
  total,
  pageSize,
}: PaginationProps) {
  if (totalPages <= 1 && !total) return null;
  return (
    <div className="flex items-center justify-between border-t border-slate-200 px-4 py-3 dark:border-slate-800">
      <div className="text-sm text-slate-500">
        {total !== undefined && (
          <>
            Showing{" "}
            <span className="font-medium">
              {Math.min((page - 1) * (pageSize ?? 20) + 1, total)}
            </span>{" "}
            -{" "}
            <span className="font-medium">
              {Math.min(page * (pageSize ?? 20), total)}
            </span>{" "}
            of <span className="font-medium">{total}</span>
          </>
        )}
      </div>
      <div className="flex items-center gap-2">
        <Button
          variant="secondary"
          size="sm"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
        >
          <ChevronLeft className="h-4 w-4" />
          Previous
        </Button>
        <span className="text-sm text-slate-600 dark:text-slate-400">
          Page {page} of {totalPages}
        </span>
        <Button
          variant="secondary"
          size="sm"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
        >
          Next
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
