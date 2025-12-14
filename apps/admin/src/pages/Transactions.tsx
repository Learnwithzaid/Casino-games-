import React, { useEffect, useState, useCallback } from 'react';
import { Box, Chip, Alert, TextField, MenuItem, Button } from '@mui/material';
import { CloudDownload as DownloadIcon } from '@mui/icons-material';
import toast from 'react-hot-toast';
import DataTable, { Column } from '@/components/DataTable';
import { transactionsApi } from '@/api/endpoints';
import type { Transaction } from '@/types';
import { canViewSection } from '@/utils/rbac';
import { useAuthStore } from '@/store/authStore';

const Transactions: React.FC = () => {
  const { user: currentUser } = useAuthStore();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [totalRows, setTotalRows] = useState(0);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [statusFilter, setStatusFilter] = useState<string>('all');

  useEffect(() => {
    fetchTransactions();
  }, [page, rowsPerPage, statusFilter]);

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      const response = await transactionsApi.list({
        page: page + 1,
        limit: rowsPerPage,
      });
      setTransactions(response.data);
      setTotalRows(response.total);
    } catch (err) {
      toast.error('Failed to load transactions');
    } finally {
      setLoading(false);
    }
  };

  const handleExport = useCallback(() => {
    const csvContent = [
      ['ID', 'User ID', 'Type', 'Amount', 'Status', 'Date'],
      ...transactions.map((tx) => [
        tx.id,
        tx.userId,
        tx.type,
        tx.amount,
        tx.status,
        new Date(tx.createdAt).toISOString(),
      ]),
    ]
      .map((row) => row.map((cell) => `"${cell}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `transactions-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  }, [transactions]);

  const columns: Column<Transaction>[] = [
    { id: 'id', label: 'ID', width: '150px' },
    { id: 'userId', label: 'User ID', width: '150px' },
    {
      id: 'type',
      label: 'Type',
      render: (val) => (
        <Chip
          label={val}
          color={val === 'CREDIT' ? 'success' : 'default'}
          size="small"
        />
      ),
    },
    {
      id: 'amount',
      label: 'Amount',
      render: (val) => `$${(val as number).toFixed(2)}`,
    },
    {
      id: 'status',
      label: 'Status',
      render: (val) => {
        const statusColor =
          val === 'CONFIRMED'
            ? 'success'
            : val === 'FAILED'
              ? 'error'
              : 'default';
        return <Chip label={val} color={statusColor} size="small" />;
      },
    },
    {
      id: 'createdAt',
      label: 'Date',
      render: (val) =>
        new Date(val as string).toLocaleDateString(undefined, {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        }),
    },
  ];

  if (!canViewSection(currentUser, 'transactions')) {
    return <Alert severity="error">You do not have permission to view transactions</Alert>;
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <h1 style={{ margin: 0 }}>Transaction Monitor</h1>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <TextField
            select
            label="Status"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            size="small"
            sx={{ width: 150 }}
          >
            <MenuItem value="all">All Statuses</MenuItem>
            <MenuItem value="PENDING">Pending</MenuItem>
            <MenuItem value="CONFIRMED">Confirmed</MenuItem>
            <MenuItem value="FAILED">Failed</MenuItem>
          </TextField>
          <Button
            variant="outlined"
            startIcon={<DownloadIcon />}
            onClick={handleExport}
          >
            Export
          </Button>
        </Box>
      </Box>

      <DataTable<Transaction>
        columns={columns}
        data={transactions}
        loading={loading}
        page={page}
        rowsPerPage={rowsPerPage}
        totalRows={totalRows}
        onPageChange={setPage}
        onRowsPerPageChange={setRowsPerPage}
      />
    </Box>
  );
};

export default Transactions;
