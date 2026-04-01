import { Button, Dialog, DialogActions, DialogContent, DialogTitle } from '@mui/material'

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
    <Dialog open={open} onClose={onClose} maxWidth={maxWidth}>
      {title ? <DialogTitle>{title}</DialogTitle> : null}
      <DialogContent dividers>{children}</DialogContent>
      <DialogActions sx={{ gap: 1 }}>
        <Button size="small" onClick={onClose} {...cancelButtonProps}>
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

