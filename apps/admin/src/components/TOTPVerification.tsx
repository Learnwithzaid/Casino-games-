import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container,
  Box,
  TextField,
  Button,
  Typography,
  Paper,
  CircularProgress,
  Alert,
  QrCode,
} from '@mui/material';
import toast from 'react-hot-toast';
import { useAuthStore } from '@/store/authStore';
import { authApi } from '@/api/endpoints';

interface TOTPVerificationProps {
  secret: string;
  email: string;
}

const TOTPVerification: React.FC<TOTPVerificationProps> = ({ secret, email }) => {
  const navigate = useNavigate();
  const { setSession, setTOTPRequired, setError, isLoading, error, setLoading } = useAuthStore();
  const [code, setCode] = useState('');

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await authApi.verifyTOTP({
        code,
        secret,
      });

      setSession(response);
      setTOTPRequired(false);
      toast.success('2FA verified successfully!');
      navigate('/dashboard');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'TOTP verification failed';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container component="main" maxWidth="sm">
      <Box
        sx={{
          marginTop: 8,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          minHeight: '100vh',
          justifyContent: 'center',
        }}
      >
        <Paper elevation={3} sx={{ p: 4, width: '100%' }}>
          <Typography component="h1" variant="h5" align="center" sx={{ mb: 3 }}>
            Two-Factor Authentication
          </Typography>

          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          <Box sx={{ mb: 3, textAlign: 'center' }}>
            <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
              Scan this QR code with your authenticator app:
            </Typography>
            {/* QR code would be displayed here - for now we show placeholder */}
            <Box
              sx={{
                width: 200,
                height: 200,
                mx: 'auto',
                mb: 2,
                bgcolor: '#f5f5f5',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: 1,
              }}
            >
              <QrCode sx={{ fontSize: 100, color: 'textSecondary' }} />
            </Box>
            <Typography variant="body2" color="textSecondary">
              Or enter the code manually: {secret}
            </Typography>
          </Box>

          <form onSubmit={handleVerify}>
            <TextField
              margin="normal"
              required
              fullWidth
              label="Verification Code"
              placeholder="000000"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
              disabled={isLoading}
              inputProps={{
                maxLength: 6,
                style: { textAlign: 'center', fontSize: '1.5em', letterSpacing: '0.5em' },
              }}
            />

            <Button
              type="submit"
              fullWidth
              variant="contained"
              sx={{ mt: 3, mb: 2 }}
              disabled={isLoading || code.length !== 6}
            >
              {isLoading ? <CircularProgress size={24} /> : 'Verify'}
            </Button>
          </form>

          <Typography variant="body2" color="textSecondary" align="center">
            Email: {email}
          </Typography>
        </Paper>
      </Box>
    </Container>
  );
};

export default TOTPVerification;
