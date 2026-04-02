import { TableCell, TableSortLabel } from '@mui/material'
import { tableSortLabelClasses } from '@mui/material/TableSortLabel'

/**
 * Full-cell sort header: click / Enter / Space anywhere on the cell (including padding) sorts.
 * Sort is handled on the cell; clicks on the label bubble up. Cell hover mirrors MUI’s inactive
 * TableSortLabel hover (faded sort icon) so it works over padding too.
 */
export default function SortableTableHeaderCell({
  active,
  direction,
  sortDirection,
  onSort,
  children,
  align,
  sx,
}) {
  return (
    <TableCell
      align={align}
      sortDirection={sortDirection}
      onClick={onSort}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onSort()
        }
      }}
      tabIndex={0}
      sx={[
        (theme) => ({
          cursor: 'pointer',
          userSelect: 'none',
          '&:hover': {
            [`& .${tableSortLabelClasses.root}:not(.${tableSortLabelClasses.active})`]: {
              color: (theme.vars || theme).palette.text.secondary,
              [`& .${tableSortLabelClasses.icon}`]: {
                opacity: 0.5,
              },
            },
          },
        }),
        ...(Array.isArray(sx) ? sx : sx != null ? [sx] : []),
      ]}
    >
      <TableSortLabel
        active={active}
        direction={direction}
        component="span"
        sx={{
          width: '100%',
          display: 'inline-flex',
          ...(align === 'right' ? { justifyContent: 'flex-end' } : {}),
        }}
      >
        {children}
      </TableSortLabel>
    </TableCell>
  )
}
