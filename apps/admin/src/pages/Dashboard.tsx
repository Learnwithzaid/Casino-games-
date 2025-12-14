import React, { useEffect, useState } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  CircularProgress,
  Alert,
} from '@mui/material';
import { useAuthStore } from '@/store/authStore';
import { statsApi } from '@/api/endpoints';

interface Stats {
  totalUsers: number;
  activeGames: number;
  totalTransactions: number;
  totalRevenue: number;
}

const Dashboard: React.FC = () => {
  const { user } = useAuthStore();
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true);
        // Mock stats for now - replace with actual API call
        setStats({
          totalUsers: 1250,
          activeGames: 15,
          totalTransactions: 8432,
          totalRevenue: 125430.50,
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load stats');
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="50vh">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return <Alert severity="error">{error}</Alert>;
  }

  const statCards = [
    { label: 'Total Users', value: stats?.totalUsers || 0 },
    { label: 'Active Games', value: stats?.activeGames || 0 },
    { label: 'Total Transactions', value: stats?.totalTransactions || 0 },
    { label: 'Total Revenue', value: `$${(stats?.totalRevenue || 0).toFixed(2)}` },
  ];

  return (
    <Box>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" sx={{ fontWeight: 'bold', mb: 1 }}>
          Welcome, {user?.name || user?.email}!
        </Typography>
        <Typography variant="body1" color="textSecondary">
          Here's what's happening with your platform today.
        </Typography>
      </Box>

      <Grid container spacing={3}>
        {statCards.map((card, idx) => (
          <Grid item xs={12} sm={6} md={3} key={idx}>
            <Card sx={{ height: '100%', boxShadow: 2 }}>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  {card.label}
                </Typography>
                <Typography variant="h5" sx={{ fontWeight: 'bold', mt: 1 }}>
                  {card.value}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Grid container spacing={3} sx={{ mt: 2 }}>
        <Grid item xs={12}>
          <Card sx={{ boxShadow: 2 }}>
            <CardContent>
              <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 2 }}>
                Quick Actions
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Use the sidebar navigation to manage games, users, transactions, and more.
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default Dashboard;
