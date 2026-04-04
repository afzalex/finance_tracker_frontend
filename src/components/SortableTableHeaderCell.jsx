import { Box, TableCell, TableSortLabel } from '@mui/material'
import { tableSortLabelClasses } from '@mui/material/TableSortLabel'

export default function SortableTableHeaderCell({
  active,
  direction,
  sortDirection,
  onSort,
  children,
  align,
  sx,
}) {
  const cellAlign = align ?? 'left'

  const sortLabel = (
    <TableSortLabel
      active={active}
      direction={direction}
      component="span"
      sx={
        cellAlign === 'right'
          ? {
              position: 'relative',
              display: 'inline-flex',
              alignItems: 'center',
              [`& .${tableSortLabelClasses.icon}`]: {
                position: 'absolute',
                right: '100%',
                top: '50%',
                transform: 'translateY(-50%)',
                marginLeft: 0,
                marginRight: 4,
                opacity: active ? 1 : 0,
                transition: (theme) =>
                  theme.transitions.create('opacity', {
                    duration: theme.transitions.duration.shorter,
                  }),
              },
            }
          : undefined
      }
    >
      {children}
    </TableSortLabel>
  )

  return (
    <TableCell
      align={cellAlign}
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
      {cellAlign === 'right' ? (
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'flex-end',
            alignItems: 'center',
            width: '100%',
          }}
        >
          {sortLabel}
        </Box>
      ) : (
        sortLabel
      )}
    </TableCell>
  )
}
