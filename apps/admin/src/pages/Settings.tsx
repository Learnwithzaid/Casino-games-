import React, { useEffect, useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  CardHeader,
  Divider,
  Stack,
  TextField,
  Button,
  Switch,
  FormControlLabel,
  CircularProgress,
  Alert,
  Typography,
  Chip,
} from '@mui/material';
import { Save as SaveIcon } from '@mui/icons-material';
import toast from 'react-hot-toast';
import { settingsApi } from '@/api/endpoints';
import { canEditSection } from '@/utils/rbac';
import { useAuthStore } from '@/store/authStore';

interface Settings {
  maintenanceMode: boolean;
  maintenanceMessage: string;
  maxBetLimit: number;
  minBetLimit: number;
  sessionTimeout: number;
  [key: string]: any;
}

const Settings: React.FC = () => {
  const { user } = useAuthStore();
  const [settings, setSettings] = useState<Settings>({
    maintenanceMode: false,
    maintenanceMessage: '',
    maxBetLimit: 10000,
    minBetLimit: 0.01,
    sessionTimeout: 3600,
  });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const data = await settingsApi.get();
      setSettings(data);
    } catch (err) {
      toast.error('Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      await settingsApi.update(settings);
      toast.success('Settings saved successfully');
    } catch (err) {
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleMaintenance = async (enabled: boolean) => {
    try {
      setSaving(true);
      await settingsApi.toggleMaintenance(enabled);
      setSettings({ ...settings, maintenanceMode: enabled });
      toast.success(`Maintenance mode ${enabled ? 'enabled' : 'disabled'}`);
    } catch (err) {
      toast.error('Failed to toggle maintenance mode');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="50vh">
        <CircularProgress />
      </Box>
    );
  }

  if (!canEditSection(user, 'settings')) {
    return <Alert severity="error">You do not have permission to manage settings</Alert>;
  }

  return (
    <Box>
      <h1 style={{ margin: '0 0 24px 0' }}>Platform Settings</h1>

      <Stack spacing={3}>
        <Card>
          <CardHeader title="Maintenance Mode" />
          <Divider />
          <CardContent>
            <Stack spacing={2}>
              <FormControlLabel
                control={
                  <Switch
                    checked={settings.maintenanceMode}
                    onChange={(e) => handleToggleMaintenance(e.target.checked)}
                    disabled={saving}
                  />
                }
                label={
                  <Box>
                    <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                      Enable Maintenance Mode
                    </Typography>
                    <Typography variant="caption" color="textSecondary">
                      When enabled, users will see a maintenance message instead of the game
                    </Typography>
                  </Box>
                }
              />

              {settings.maintenanceMode && (
                <TextField
                  label="Maintenance Message"
                  fullWidth
                  multiline
                  rows={3}
                  value={settings.maintenanceMessage}
                  onChange={(e) =>
                    setSettings({ ...settings, maintenanceMessage: e.target.value })
                  }
                  placeholder="Enter a message to display to users..."
                />
              )}
            </Stack>
          </CardContent>
        </Card>

        <Card>
          <CardHeader title="Betting Limits" />
          <Divider />
          <CardContent>
            <Stack spacing={2}>
              <TextField
                label="Minimum Bet"
                type="number"
                fullWidth
                value={settings.minBetLimit}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    minBetLimit: parseFloat(e.target.value),
                  })
                }
                inputProps={{ step: 0.01, min: 0 }}
              />
              <TextField
                label="Maximum Bet"
                type="number"
                fullWidth
                value={settings.maxBetLimit}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    maxBetLimit: parseFloat(e.target.value),
                  })
                }
                inputProps={{ step: 1, min: 0 }}
              />
            </Stack>
          </CardContent>
        </Card>

        <Card>
          <CardHeader title="Session Configuration" />
          <Divider />
          <CardContent>
            <Stack spacing={2}>
              <TextField
                label="Session Timeout (seconds)"
                type="number"
                fullWidth
                value={settings.sessionTimeout}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    sessionTimeout: parseInt(e.target.value, 10),
                  })
                }
                inputProps={{ step: 60, min: 300 }}
                helperText="How long before inactive sessions expire (minimum 5 minutes)"
              />
              <Typography variant="caption" color="textSecondary">
                Current value: {Math.round(settings.sessionTimeout / 60)} minutes
              </Typography>
            </Stack>
          </CardContent>
        </Card>

        <Card>
          <CardHeader title="Platform Status" />
          <Divider />
          <CardContent>
            <Stack spacing={2}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="body2">Maintenance Mode</Typography>
                <Chip
                  label={settings.maintenanceMode ? 'Enabled' : 'Disabled'}
                  color={settings.maintenanceMode ? 'error' : 'success'}
                  size="small"
                />
              </Box>
            </Stack>
          </CardContent>
        </Card>

        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button
            variant="contained"
            startIcon={<SaveIcon />}
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
          <Button variant="outlined" onClick={fetchSettings} disabled={saving}>
            Discard Changes
          </Button>
        </Box>
      </Stack>
    </Box>
  );
};

export default Settings;
