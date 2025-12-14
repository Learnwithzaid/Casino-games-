import React, { useEffect, useState } from 'react';
import { Box, Alert, TextField, MenuItem, Chip } from '@mui/material';
import toast from 'react-hot-toast';
import DataTable, { Column } from '@/components/DataTable';
import { auditApi } from '@/api/endpoints';
import type { AuditLog } from '@/types';
import { canViewSection } from '@/utils/rbac';
import { useAuthStore } from '@/store/authStore';

const AuditLogs: React.FC = () => {
  const { user: currentUser } = useAuthStore();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [totalRows, setTotalRows] = useState(0);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [entityTypeFilter, setEntityTypeFilter] = useState<string>('all');

  useEffect(() => {
    fetchLogs();
  }, [page, rowsPerPage, entityTypeFilter]);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const response = await auditApi.list({
        page: page + 1,
        limit: rowsPerPage,
      });
      setLogs(response.data);
      setTotalRows(response.total);
    } catch (err) {
      toast.error('Failed to load audit logs');
    } finally {
      setLoading(false);
    }
  };

  const columns: Column<AuditLog>[] = [
    {
      id: 'id',
      label: 'ID',
      width: '150px',
      render: (val) => (val as string).substring(0, 8),
    },
    { id: 'action', label: 'Action' },
    { id: 'entityType', label: 'Entity Type' },
    { id: 'entityId', label: 'Entity ID', width: '150px' },
    {
      id: 'actorUserId',
      label: 'Actor',
      render: (val) => (
        <Chip
          label={val ? (val as string).substring(0, 8) : 'System'}
          size="small"
          variant="outlined"
        />
      ),
    },
    {
      id: 'createdAt',
      label: 'Timestamp',
      render: (val) =>
        new Date(val as string).toLocaleDateString(undefined, {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        }),
    },
  ];

  if (!canViewSection(currentUser, 'auditLogs')) {
    return <Alert severity="error">You do not have permission to view audit logs</Alert>;
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <h1 style={{ margin: 0 }}>Audit Logs</h1>
        <TextField
          select
          label="Entity Type"
          value={entityTypeFilter}
          onChange={(e) => setEntityTypeFilter(e.target.value)}
          size="small"
          sx={{ width: 200 }}
        >
          <MenuItem value="all">All Types</MenuItem>
          <MenuItem value="User">User</MenuItem>
          <MenuItem value="Game">Game</MenuItem>
          <MenuItem value="Transaction">Transaction</MenuItem>
          <MenuItem value="Settings">Settings</MenuItem>
        </TextField>
      </Box>

      <DataTable<AuditLog>
        columns={columns}
        data={logs}
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

export default AuditLogs;
