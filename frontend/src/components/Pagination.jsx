import Button from './Button';

export default function Pagination({ meta, onPageChange }) {
  if (!meta || meta.total === 0) return null;
  const from = (meta.page - 1) * meta.limit + 1;
  const to = Math.min(meta.page * meta.limit, meta.total);
  return (
    <div className="table-footer">
      <span>
        {from}–{to} of {meta.total}
      </span>
      {meta.totalPages > 1 && (
        <div className="pagination">
          <Button size="sm" icon="chevronLeft" iconOnly aria-label="Previous page" disabled={meta.page <= 1} onClick={() => onPageChange(meta.page - 1)} />
          <span>
            Page {meta.page} of {meta.totalPages}
          </span>
          <Button size="sm" icon="chevronRight" iconOnly aria-label="Next page" disabled={meta.page >= meta.totalPages} onClick={() => onPageChange(meta.page + 1)} />
        </div>
      )}
    </div>
  );
}
