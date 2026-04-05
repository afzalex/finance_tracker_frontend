import { Link as RouterLink } from 'react-router-dom'
import { Box, Button, Stack, Toolbar, Typography } from '@mui/material'
import { layoutSectionSpacing } from '../utils/responsiveTable'

export default function NotFound() {
  return (
    <Box sx={{ flex: 1, p: 3 }}>
      <Toolbar />
      <Stack spacing={layoutSectionSpacing} sx={{ maxWidth: 720 }}>
        <Typography variant="h4" component="h1">
          Page not found
        </Typography>
        <Typography variant="body1" color="text.secondary">
          The page you’re looking for doesn’t exist.
        </Typography>
        <Button variant="contained" component={RouterLink} to="/">
          Go to dashboard
        </Button>
      </Stack>
    </Box>
  )
}

