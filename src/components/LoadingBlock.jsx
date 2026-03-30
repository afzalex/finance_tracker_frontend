import { Box, CircularProgress } from '@mui/material'

export default function LoadingBlock() {
  return (
    <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
      <CircularProgress />
    </Box>
  )
}
