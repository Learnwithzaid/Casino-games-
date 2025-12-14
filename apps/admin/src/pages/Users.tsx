import React, { useEffect, useState } from 'react';
import {
  Box,
  Button,
  Drawer,
  Typography,
  Stack,
  Alert,
  CircularProgress,
  Chip,
  TextField,
} from '@mui/material';
import { Eye as EyeIcon } from '@mui/icons-material';
import toast from 'react-hot-toast';
import DataTable, { Column } from '@/components/DataTable';
import { usersApi } from '@/api/endpoints';
import type { UserProfile, Transaction } from '@/types';
import { canViewSection } from '@/utils/rbac';
import { useAuthStore } from '@/store/authStore';

const Users: React.FC = () => {
  const { user: currentUser } = useAuthStore();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(false);
  const [totalRows, setTotalRows] = useState(0);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [userTransactions, setUserTransactions] = useState<Transaction[]>([]);
  const [userBalance, setUserBalance] = useState<number | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('all');

  useEffect(() => {
    fetchUsers();
  }, [page, rowsPerPage, filterStatus]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await usersApi.list({
        page: page + 1,
        limit: rowsPerPage,
      });
      setUsers(response.data);
      setTotalRows(response.total);
    } catch (err) {
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const handleViewUser = async (user: UserProfile) => {
    try {
      setSelectedUser(user);
      setLoading(true);

      const [balanceData, transactionsData] = await Promise.all([
        usersApi.getBalance(user.id),
        usersApi.getTransactions(user.id, { page: 1, limit: 10 }),
      ]);

      setUserBalance(balanceData.balance);
      setUserTransactions(transactionsData.data);
      setDrawerOpen(true);
    } catch (err) {
      toast.error('Failed to load user details');
    } finally {
      setLoading(false);
    }
  };

  const handleCloseDrawer = () => {
    setDrawerOpen(false);
    setSelectedUser(null);
    setUserTransactions([]);
    setUserBalance(null);
  };

  const columns: Column<UserProfile>[] = [
    { id: 'id', label: 'User ID' },
    { id: 'role', label: 'Role' },
    {
      id: 'createdAt',
      label: 'Joined',
      render: (val) => new Date(val).toLocaleDateString(),
    },
    {
      id: 'id',
      label: 'Actions',
      render: (_val, row) => (
        <Button
          size="small"
          variant="outlined"
          startIcon={<EyeIcon />}
          onClick={() => handleViewUser(row)}
        >
          View
        </Button>
      ),
    },
  ];

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <h1 style={{ margin: 0 }}>Users Management</h1>
        <TextField
          select
          label="Status Filter"
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          size="small"
          sx={{ width: 200 }}
        />
      </Box>

      {!canViewSection(currentUser, 'users') ? (
        <Alert severity="error">You do not have permission to view users</Alert>
      ) : (
        <>
          <DataTable<UserProfile>
            columns={columns}
            data={users}
            loading={loading}
            page={page}
            rowsPerPage={rowsPerPage}
            totalRows={totalRows}
            onPageChange={setPage}
            onRowsPerPageChange={setRowsPerPage}
          />

          <Drawer anchor="right" open={drawerOpen} onClose={handleCloseDrawer}>
            <Box sx={{ width: 400, p: 3 }}>
              {loading ? (
                <Box display="flex" justifyContent="center" alignItems="center" minHeight="50vh">
                  <CircularProgress />
                </Box>
              ) : selectedUser ? (
                <>
                  <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 2 }}>
                    User Details
                  </Typography>

                  <Stack spacing={2}>
                    <Box>
                      <Typography variant="caption" color="textSecondary">
                        User ID
                      </Typography>
                      <Typography variant="body2">{selectedUser.id}</Typography>
                    </Box>

                    <Box>
                      <Typography variant="caption" color="textSecondary">
                        Role
                      </Typography>
                      <Chip label={selectedUser.role} size="small" />
                    </Box>

                    <Box>
                      <Typography variant="caption" color="textSecondary">
                        Balance
                      </Typography>
                      <Typography variant="body2">
                        {userBalance !== null ? `$${userBalance.toFixed(2)}` : 'Loading...'}
                      </Typography>
                    </Box>

                    <Box>
                      <Typography variant="caption" color="textSecondary">
                        Joined
                      </Typography>
                      <Typography variant="body2">
                        {new Date(selectedUser.createdAt).toLocaleDateString()}
                      </Typography>
                    </Box>

                    <Box sx={{ mt: 3 }}>
                      <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 2 }}>
                        Recent Transactions
                      </Typography>
                      {userTransactions.length > 0 ? (
                        userTransactions.map((tx) => (
                          <Box
                            key={tx.id}
                            sx={{
                              p: 1,
                              mb: 1,
                              bgcolor: '#f5f5f5',
                              borderRadius: 1,
                            }}
                          >
                            <Box
                              sx={{
                                display: 'flex',
                                justifyContent: 'space-between',
                              }}
                            >
                              <Typography variant="caption">{tx.type}</Typography>
                              <Typography
                                variant="caption"
                                sx={{
                                  color:
                                    tx.type === 'CREDIT'
                                      ? 'green'
                                      : 'red',
                                }}
                              >
                                {tx.type === 'CREDIT'
                                  ? '+'
                                  : '-'}
                                ${tx.amount.toFixed(2)}
                              </Typography>
                            </Box>
                            <Typography
                              variant="caption"
                              color="textSecondary"
                            >
                              {new Date(
                                tx.createdAt
                              ).toLocaleDateString()}
                            </Typography>
                          </Box>
                        ))
                      ) : (
                        <Typography variant="body2" color="textSecondary">
                          No transactions yet
                        </Typography>
                      )}
                    </Box>
                  </Stack>
                </>
              ) : null}
            </Box>
          </Drawer>
        </>
      )}
    </Box>
  );
};

export default Users;
