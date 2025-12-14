import React from 'react';
import { useForm, Controller } from 'react-hook-form';
import {
  Box,
  TextField,
  Button,
  FormControlLabel,
  Checkbox,
  Stack,
  CircularProgress,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  TextareaAutosize,
} from '@mui/material';
import { ZodSchema } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';

export interface FormField {
  name: string;
  label: string;
  type: 'text' | 'email' | 'number' | 'password' | 'checkbox' | 'select' | 'textarea';
  required?: boolean;
  placeholder?: string;
  options?: Array<{ label: string; value: string | number }>;
  multiline?: boolean;
  rows?: number;
  defaultValue?: any;
  disabled?: boolean;
  validation?: string;
}

interface FormBuilderProps {
  fields: FormField[];
  onSubmit: (data: Record<string, any>) => Promise<void>;
  submitLabel?: string;
  loading?: boolean;
  schema?: ZodSchema;
  initialValues?: Record<string, any>;
  onCancel?: () => void;
}

const FormBuilder: React.FC<FormBuilderProps> = ({
  fields,
  onSubmit,
  submitLabel = 'Submit',
  loading = false,
  schema,
  initialValues = {},
  onCancel,
}) => {
  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: schema ? zodResolver(schema) : undefined,
    defaultValues: initialValues,
  });

  const onSubmitForm = async (data: Record<string, any>) => {
    try {
      await onSubmit(data);
    } catch (error) {
      console.error('Form submission error:', error);
    }
  };

  return (
    <Box component="form" onSubmit={handleSubmit(onSubmitForm)}>
      <Stack spacing={2}>
        {fields.map((field) => (
          <Controller
            key={field.name}
            name={field.name}
            control={control}
            render={({ field: fieldProps }) => {
              switch (field.type) {
                case 'checkbox':
                  return (
                    <FormControlLabel
                      control={<Checkbox {...fieldProps} checked={fieldProps.value || false} />}
                      label={field.label}
                      disabled={loading || field.disabled}
                    />
                  );

                case 'select':
                  return (
                    <FormControl fullWidth error={!!errors[field.name]}>
                      <InputLabel>{field.label}</InputLabel>
                      <Select
                        {...fieldProps}
                        label={field.label}
                        disabled={loading || field.disabled}
                      >
                        {field.options?.map((option) => (
                          <MenuItem key={option.value} value={option.value}>
                            {option.label}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  );

                case 'textarea':
                  return (
                    <TextField
                      {...fieldProps}
                      fullWidth
                      label={field.label}
                      multiline
                      rows={field.rows || 4}
                      placeholder={field.placeholder}
                      disabled={loading || field.disabled}
                      error={!!errors[field.name]}
                      helperText={errors[field.name]?.message as string}
                    />
                  );

                default:
                  return (
                    <TextField
                      {...fieldProps}
                      fullWidth
                      label={field.label}
                      type={field.type}
                      placeholder={field.placeholder}
                      required={field.required}
                      disabled={loading || field.disabled}
                      multiline={field.multiline}
                      rows={field.rows}
                      error={!!errors[field.name]}
                      helperText={errors[field.name]?.message as string}
                    />
                  );
              }
            }}
          />
        ))}

        <Stack direction="row" spacing={2} sx={{ mt: 3 }}>
          <Button
            type="submit"
            variant="contained"
            disabled={loading}
            sx={{ minWidth: 120 }}
          >
            {loading ? <CircularProgress size={24} /> : submitLabel}
          </Button>
          {onCancel && (
            <Button variant="outlined" onClick={onCancel} disabled={loading}>
              Cancel
            </Button>
          )}
        </Stack>
      </Stack>
    </Box>
  );
};

export default FormBuilder;
