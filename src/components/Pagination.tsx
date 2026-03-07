import React from 'react'

interface PaginationProps {
    currentPage: number
    totalPages: number
    totalItems: number
    onPageChange: (page: number) => void
    label?: string
    limit?: number
    onLimitChange?: (limit: number) => void
}

export function Pagination({ currentPage, totalPages, totalItems, onPageChange, label = "items", limit, onLimitChange }: PaginationProps) {
    if (totalPages <= 1 && totalItems === 0) return null;

    const generatePageNumbers = () => {
        const pages: (number | string)[] = []
        const maxPagesToShow = 5

        if (totalPages <= maxPagesToShow) {
            for (let i = 1; i <= totalPages; i++) {
                pages.push(i)
            }
        } else {
            pages.push(1)

            let start = Math.max(2, currentPage - 1)
            let end = Math.min(totalPages - 1, currentPage + 1)

            if (currentPage <= 2) {
                end = 4
            }
            if (currentPage >= totalPages - 1) {
                start = totalPages - 3
            }

            if (start > 2) {
                pages.push('...')
            }

            for (let i = start; i <= end; i++) {
                pages.push(i)
            }

            if (end < totalPages - 1) {
                pages.push('...')
            }

            pages.push(totalPages)
        }

        return pages
    }

    return (
        <div className="bg-gray-50 px-6 py-3 border-t border-gray-200 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-sm text-gray-700 w-full sm:w-auto text-center sm:text-left flex items-center justify-center sm:justify-start gap-4 flex-wrap">
                <span>Showing page <span className="font-medium">{currentPage}</span> of <span className="font-medium">{Math.max(1, totalPages)}</span> ({totalItems} total {label})</span>

                {limit && onLimitChange && (
                    <div className="flex items-center gap-2">
                        <span className="text-gray-500">Rows per page:</span>
                        <select
                            value={limit}
                            onChange={(e) => onLimitChange(Number(e.target.value))}
                            className="text-sm border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500 py-1 pl-2 pr-6"
                        >
                            <option value={10}>10</option>
                            <option value={20}>20</option>
                            <option value={50}>50</option>
                            <option value={100}>100</option>
                        </select>
                    </div>
                )}
            </div>
            <div className="flex space-x-1 sm:space-x-2 overflow-x-auto w-full sm:w-auto justify-center sm:justify-end pb-1 sm:pb-0">
                <button
                    onClick={() => onPageChange(currentPage - 1)}
                    disabled={currentPage <= 1}
                    className="px-3 py-1 border border-gray-300 rounded bg-white text-gray-700 disabled:opacity-50 hover:bg-gray-100 transition-colors"
                >
                    Prev
                </button>

                {generatePageNumbers().map((page, idx) => (
                    <button
                        key={idx}
                        onClick={() => typeof page === 'number' ? onPageChange(page) : undefined}
                        disabled={page === '...'}
                        className={`px-3 py-1 border rounded transition-colors ${page === '...' ? 'border-transparent bg-transparent text-gray-500 cursor-default' : page === currentPage ? 'bg-blue-600 text-white border-blue-600 font-bold' : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-100'}`}
                    >
                        {page}
                    </button>
                ))}

                <button
                    onClick={() => onPageChange(currentPage + 1)}
                    disabled={currentPage >= totalPages}
                    className="px-3 py-1 border border-gray-300 rounded bg-white text-gray-700 disabled:opacity-50 hover:bg-gray-100 transition-colors"
                >
                    Next
                </button>
            </div>
        </div>
    )
}
