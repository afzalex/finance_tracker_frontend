import { Box, Typography } from '@mui/material'

export default function PageHeader({ title, description }) {
  return (
    <Box>
      <Typography variant="h4" sx={{ fontWeight: 600 }}>
        {title}
      </Typography>
      {description ? (
        <Typography variant="body2" color="text.secondary">
          {description}
        </Typography>
      ) : null}
    </Box>
  )
}
