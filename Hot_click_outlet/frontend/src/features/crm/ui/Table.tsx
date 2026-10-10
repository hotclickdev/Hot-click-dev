// Derivado de Tremor Table [v0.0.3] — Apache-2.0 (tremorlabs/tremor).
// Cambios: colores con los tokens HotClick (n200, n600, n900); sin variantes dark propias (las da el tema).
import { forwardRef, type ComponentPropsWithoutRef } from 'react'
import { cx } from './cx'

export const TableRoot = forwardRef<HTMLDivElement, ComponentPropsWithoutRef<'div'>>(
  ({ className, children, ...props }, ref) => (
    <div ref={ref} {...props}>
      <div className={cx('w-full overflow-auto whitespace-nowrap', className)}>{children}</div>
    </div>
  ),
)
TableRoot.displayName = 'TableRoot'

export const Table = forwardRef<HTMLTableElement, ComponentPropsWithoutRef<'table'>>(
  ({ className, ...props }, ref) => (
    <table ref={ref} className={cx('w-full caption-bottom border-b border-hc-n-200', className)} {...props} />
  ),
)
Table.displayName = 'Table'

export const TableHead = forwardRef<HTMLTableSectionElement, ComponentPropsWithoutRef<'thead'>>(
  ({ className, ...props }, ref) => <thead ref={ref} className={cx(className)} {...props} />,
)
TableHead.displayName = 'TableHead'

export const TableHeaderCell = forwardRef<HTMLTableCellElement, ComponentPropsWithoutRef<'th'>>(
  ({ className, ...props }, ref) => (
    <th ref={ref} className={cx('border-b border-hc-n-200 px-3 py-3 text-left text-xs font-semibold text-hc-n-600', className)} {...props} />
  ),
)
TableHeaderCell.displayName = 'TableHeaderCell'

export const TableBody = forwardRef<HTMLTableSectionElement, ComponentPropsWithoutRef<'tbody'>>(
  ({ className, ...props }, ref) => <tbody ref={ref} className={cx('divide-y divide-hc-n-200', className)} {...props} />,
)
TableBody.displayName = 'TableBody'

export const TableRow = forwardRef<HTMLTableRowElement, ComponentPropsWithoutRef<'tr'>>(
  ({ className, ...props }, ref) => <tr ref={ref} className={cx(className)} {...props} />,
)
TableRow.displayName = 'TableRow'

export const TableCell = forwardRef<HTMLTableCellElement, ComponentPropsWithoutRef<'td'>>(
  ({ className, ...props }, ref) => (
    <td ref={ref} className={cx('px-3 py-3 align-top text-sm text-hc-n-600', className)} {...props} />
  ),
)
TableCell.displayName = 'TableCell'
