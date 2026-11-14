import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

export const PAGE_SIZE = 50;

export function parsePageParam(value: string | undefined) {
  const page = Number.parseInt(value ?? "1", 10);
  return Number.isFinite(page) && page > 0 ? page : 1;
}

function paginationItems(currentPage: number, totalPages: number) {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  if (currentPage <= 4) {
    return [1, 2, 3, 4, 5, "end-ellipsis" as const, totalPages];
  }

  if (currentPage >= totalPages - 3) {
    return [1, "start-ellipsis" as const, ...Array.from({ length: 5 }, (_, index) => totalPages - 4 + index)];
  }

  return [
    1,
    "start-ellipsis" as const,
    currentPage - 1,
    currentPage,
    currentPage + 1,
    "end-ellipsis" as const,
    totalPages,
  ];
}

function pageHref({
  basePath,
  page,
  query,
}: {
  basePath: string;
  page: number;
  query: Record<string, string | undefined>;
}) {
  const params = new URLSearchParams();

  Object.entries(query).forEach(([key, value]) => {
    if (value) params.set(key, value);
  });

  if (page > 1) params.set("page", String(page));
  const queryString = params.toString();
  return queryString ? `${basePath}?${queryString}` : basePath;
}

export function Pagination({
  basePath,
  currentPage,
  totalItems,
  pageSize = PAGE_SIZE,
  query = {},
}: {
  basePath: string;
  currentPage: number;
  totalItems: number;
  pageSize?: number;
  query?: Record<string, string | undefined>;
}) {
  if (totalItems === 0) return null;

  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const safePage = Math.min(Math.max(currentPage, 1), totalPages);
  const firstItem = (safePage - 1) * pageSize + 1;
  const lastItem = Math.min(safePage * pageSize, totalItems);
  const items = paginationItems(safePage, totalPages);
  const controlClass =
    "inline-flex h-11 min-w-11 items-center justify-center gap-2 rounded-lg border border-[#e7c9c1] bg-[#fffaf5] px-4 text-sm font-black text-[#4b1737] transition hover:border-[#d97873] hover:bg-[#f4ded6] focus:outline-none focus:ring-2 focus:ring-[#d97873] focus:ring-offset-2";
  const disabledClass =
    "inline-flex h-11 min-w-11 cursor-not-allowed items-center justify-center gap-2 rounded-lg border border-[#efd9d3] bg-[#fffaf7] px-4 text-sm font-black text-[#a88996]";

  return (
    <nav
      aria-label="Pagination"
      className="flex flex-col gap-4 rounded-lg border border-[#e7c9c1] bg-[#fffaf5] px-5 py-4 lg:flex-row lg:items-center lg:justify-between"
    >
      <p className="text-sm font-black text-[#5a173b]">
        Showing {firstItem}-{lastItem} of {totalItems}
      </p>

      <div className="flex flex-wrap items-center gap-1.5">
        {safePage > 1 ? (
          <Link
            href={pageHref({ basePath, page: safePage - 1, query })}
            prefetch={false}
            className={controlClass}
          >
            <ChevronLeft className="h-4 w-4" />
            Previous
          </Link>
        ) : (
          <span className={disabledClass} aria-disabled="true">
            <ChevronLeft className="h-4 w-4" />
            Previous
          </span>
        )}

        {items.map((item) =>
          typeof item === "number" ? (
            <Link
              key={item}
              href={pageHref({ basePath, page: item, query })}
              prefetch={false}
              aria-current={item === safePage ? "page" : undefined}
              aria-label={`Page ${item}`}
              className={cn(
                controlClass,
                "px-3",
                item === safePage && "border-[#5a173b] bg-[#5a173b] text-white hover:border-[#42102e] hover:bg-[#42102e]",
              )}
            >
              {item}
            </Link>
          ) : (
            <span key={item} className="inline-flex h-11 min-w-7 items-center justify-center font-black text-[#6f475c]">
              ...
            </span>
          ),
        )}

        {safePage < totalPages ? (
          <Link
            href={pageHref({ basePath, page: safePage + 1, query })}
            prefetch={false}
            className={controlClass}
          >
            Next
            <ChevronRight className="h-4 w-4" />
          </Link>
        ) : (
          <span className={disabledClass} aria-disabled="true">
            Next
            <ChevronRight className="h-4 w-4" />
          </span>
        )}
      </div>
    </nav>
  );
}
