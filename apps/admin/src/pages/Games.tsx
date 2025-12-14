import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Stack,
  Alert,
  CircularProgress,
  Chip,
} from '@mui/material';
import { Add as AddIcon, Edit as EditIcon, Delete as DeleteIcon } from '@mui/icons-material';
import toast from 'react-hot-toast';
import DataTable, { Column } from '@/components/DataTable';
import { gamesApi } from '@/api/endpoints';
import type { Game } from '@/types';
import { useAuthStore } from '@/store/authStore';
import { canEditSection } from '@/utils/rbac';

const Games: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(false);
  const [totalRows, setTotalRows] = useState(0);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedGame, setSelectedGame] = useState<Game | null>(null);
  const [formData, setFormData] = useState<Partial<Game>>({
    name: '',
    slug: '',
    provider: '',
    type: 'SLOT',
    rtp: 95,
    minBet: 0.01,
    maxBet: 1000,
    maxWin: 50000,
  });

  useEffect(() => {
    fetchGames();
  }, [page, rowsPerPage]);

  const fetchGames = async () => {
    try {
      setLoading(true);
      const response = await gamesApi.list({
        page: page + 1,
        limit: rowsPerPage,
      });
      setGames(response.data);
      setTotalRows(response.total);
    } catch (err) {
      toast.error('Failed to load games');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (game?: Game) => {
    if (game) {
      setSelectedGame(game);
      setFormData(game);
    } else {
      setSelectedGame(null);
      setFormData({
        name: '',
        slug: '',
        provider: '',
        type: 'SLOT',
        rtp: 95,
        minBet: 0.01,
        maxBet: 1000,
        maxWin: 50000,
      });
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setSelectedGame(null);
  };

  const handleSaveGame = async () => {
    try {
      setLoading(true);
      if (selectedGame) {
        await gamesApi.update(selectedGame.id, formData);
        toast.success('Game updated successfully');
      } else {
        await gamesApi.create(formData);
        toast.success('Game created successfully');
      }
      handleCloseDialog();
      fetchGames();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save game');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteGame = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this game?')) {
      try {
        setLoading(true);
        await gamesApi.delete(id);
        toast.success('Game deleted successfully');
        fetchGames();
      } catch (err) {
        toast.error('Failed to delete game');
      } finally {
        setLoading(false);
      }
    }
  };

  const columns: Column<Game>[] = [
    { id: 'name', label: 'Name' },
    { id: 'slug', label: 'Slug' },
    { id: 'provider', label: 'Provider' },
    { id: 'rtp', label: 'RTP %', render: (val) => `${val}%` },
    {
      id: 'isActive',
      label: 'Status',
      render: (val) => (
        <Chip label={val ? 'Active' : 'Inactive'} color={val ? 'success' : 'default'} size="small" />
      ),
    },
    {
      id: 'id',
      label: 'Actions',
      render: (_val, row) => (
        <Stack direction="row" spacing={1}>
          {canEditSection(user, 'games') && (
            <>
              <Button
                size="small"
                variant="outlined"
                startIcon={<EditIcon />}
                onClick={(e) => {
                  e.stopPropagation();
                  handleOpenDialog(row);
                }}
              >
                Edit
              </Button>
              <Button
                size="small"
                variant="outlined"
                color="error"
                startIcon={<DeleteIcon />}
                onClick={(e) => {
                  e.stopPropagation();
                  handleDeleteGame(row.id);
                }}
              >
                Delete
              </Button>
            </>
          )}
        </Stack>
      ),
    },
  ];

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <h1 style={{ margin: 0 }}>Games Management</h1>
        {canEditSection(user, 'games') && (
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => handleOpenDialog()}
          >
            Add Game
          </Button>
        )}
      </Box>

      <DataTable<Game>
        columns={columns}
        data={games}
        loading={loading}
        page={page}
        rowsPerPage={rowsPerPage}
        totalRows={totalRows}
        onPageChange={setPage}
        onRowsPerPageChange={setRowsPerPage}
      />

      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>{selectedGame ? 'Edit Game' : 'Add Game'}</DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <Stack spacing={2}>
            <TextField
              label="Name"
              fullWidth
              value={formData.name || ''}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />
            <TextField
              label="Slug"
              fullWidth
              value={formData.slug || ''}
              onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
            />
            <TextField
              label="Provider"
              fullWidth
              value={formData.provider || ''}
              onChange={(e) => setFormData({ ...formData, provider: e.target.value })}
            />
            <TextField
              label="RTP %"
              type="number"
              fullWidth
              value={formData.rtp || ''}
              onChange={(e) => setFormData({ ...formData, rtp: parseFloat(e.target.value) })}
            />
            <TextField
              label="Min Bet"
              type="number"
              fullWidth
              value={formData.minBet || ''}
              onChange={(e) => setFormData({ ...formData, minBet: parseFloat(e.target.value) })}
            />
            <TextField
              label="Max Bet"
              type="number"
              fullWidth
              value={formData.maxBet || ''}
              onChange={(e) => setFormData({ ...formData, maxBet: parseFloat(e.target.value) })}
            />
            <TextField
              label="Max Win"
              type="number"
              fullWidth
              value={formData.maxWin || ''}
              onChange={(e) => setFormData({ ...formData, maxWin: parseFloat(e.target.value) })}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button onClick={handleSaveGame} variant="contained" disabled={loading}>
            {loading ? <CircularProgress size={24} /> : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Games;
