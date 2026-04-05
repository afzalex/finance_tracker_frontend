import { Button, Dialog, DialogActions, DialogContent, DialogTitle } from '@mui/material'
import { dialogActionsCompactSx } from '../utils/dialogActionsCompactSx'

export default function ConfirmDialog({
  open,
  title,
  children,
  onClose,
  cancelText = 'Cancel',
  confirmText = 'Confirm',
  onConfirm,
  cancelButtonProps,
  confirmButtonProps,
  maxWidth = 'sm',
}) {
  return (
    <Dialog open={open} onClose={onClose} maxWidth={maxWidth} fullWidth>
      {title ? <DialogTitle>{title}</DialogTitle> : null}
      <DialogContent dividers>{children}</DialogContent>
      <DialogActions sx={dialogActionsCompactSx}>
        <Button size="small" onClick={onClose} variant='outlined' {...cancelButtonProps}>
          {cancelText}
        </Button>
        <Button
          size="small"
          variant="contained"
          onClick={onConfirm}
          {...confirmButtonProps}
        >
          {confirmText}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

