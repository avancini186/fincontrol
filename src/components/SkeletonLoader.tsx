import { Box, Card, CardContent, Skeleton, Grid } from '@mui/material';

export function DashboardSkeleton() {
  return (
    <Box>
      {/* Alert Skeleton */}
      <Skeleton variant="rounded" height={52} sx={{ mb: 4, borderRadius: 3 }} />

      {/* KPI Cards Skeletons */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {[1, 2, 3, 4].map((i) => (
          <Grid key={i} size={{ xs: 12, sm: 6, md: 3 }}>
            <Card>
              <CardContent sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box sx={{ width: '65%' }}>
                  <Skeleton width="40%" height={20} />
                  <Skeleton width="90%" height={40} sx={{ mt: 1 }} />
                  <Skeleton width="60%" height={16} sx={{ mt: 1 }} />
                </Box>
                <Skeleton variant="circular" width={48} height={48} />
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Charts Skeletons */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid size={{ xs: 12, md: 5 }}>
          <Card sx={{ height: 380 }}>
            <CardContent sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
              <Skeleton width="50%" height={24} sx={{ mb: 2 }} />
              <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flexGrow: 1 }}>
                <Skeleton variant="circular" width={180} height={180} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, md: 7 }}>
          <Card sx={{ height: 380 }}>
            <CardContent sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
              <Skeleton width="30%" height={24} sx={{ mb: 2 }} />
              <Box sx={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexGrow: 1, px: 2, pb: 2 }}>
                {[60, 120, 180, 140, 200, 220].map((h, i) => (
                  <Skeleton key={i} variant="rounded" width="10%" height={h} />
                ))}
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}

export function TransactionListSkeleton() {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Card key={i} sx={{ '&:hover': { transform: 'none' } }}>
          <CardContent sx={{ display: 'flex', alignItems: 'center', py: 1.5, px: 2, '&:last-child': { pb: 1.5 } }}>
            <Skeleton variant="circular" width={40} height={40} sx={{ mr: 2 }} />
            <Box sx={{ flexGrow: 1 }}>
              <Skeleton width="40%" height={20} />
              <Skeleton width="20%" height={16} sx={{ mt: 0.5 }} />
            </Box>
            <Box sx={{ width: 100, textAlign: 'right' }}>
              <Skeleton width="80%" height={20} sx={{ ml: 'auto' }} />
              <Skeleton width="50%" height={16} sx={{ mt: 0.5, ml: 'auto' }} />
            </Box>
          </CardContent>
        </Card>
      ))}
    </Box>
  );
}
