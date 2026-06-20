import { createTheme } from '@mui/material/styles';
import { tokens } from './design-system/tokens';

export const theme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: tokens.colors.brand.purpleLight, // #A855F7
      light: '#C084FC',
      dark: tokens.colors.brand.purpleDark, // #381E72
      contrastText: '#FFFFFF',
    },
    secondary: {
      main: '#CCC2DC',
      light: '#E8DEF8',
      dark: '#332D41',
      contrastText: '#332D41',
    },
    background: {
      default: tokens.colors.neutral.background, // #0B0A0E
      paper: tokens.colors.neutral.surface, // #15131A
    },
    error: {
      main: tokens.colors.semantic.expense, // #E74C3C
      contrastText: '#FFFFFF',
    },
    success: {
      main: tokens.colors.semantic.income, // #2ECC71
      contrastText: '#FFFFFF',
    },
    warning: {
      main: tokens.colors.semantic.warning, // #F1C40F
      contrastText: '#000000',
    },
    info: {
      main: tokens.colors.semantic.investment, // #3498DB
      contrastText: '#FFFFFF',
    },
    text: {
      primary: tokens.colors.neutral.textPrimary,
      secondary: tokens.colors.neutral.textSecondary,
    },
  },
  typography: {
    fontFamily: tokens.typography.fontFamily,
    h1: { fontSize: tokens.typography.sizes.h1, fontWeight: tokens.typography.weights.bold },
    h2: { fontSize: tokens.typography.sizes.h2, fontWeight: tokens.typography.weights.bold },
    h3: { fontSize: tokens.typography.sizes.h3, fontWeight: tokens.typography.weights.semiBold },
    body1: { fontSize: tokens.typography.sizes.body, fontWeight: tokens.typography.weights.regular },
    body2: { fontSize: tokens.typography.sizes.small, fontWeight: tokens.typography.weights.regular },
    button: { textTransform: 'none', fontWeight: tokens.typography.weights.medium },
  },
  shape: {
    borderRadius: 12,
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 24, // pill button style
          padding: '8px 20px',
          fontWeight: 600,
          transition: 'all 150ms ease',
          '&:hover': {
            transform: 'translateY(-1px)',
            boxShadow: tokens.shadows.sm,
          },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 16, // using borders.radius.lg
          backgroundImage: 'none',
          boxShadow: tokens.shadows.md,
          border: `1px solid ${tokens.colors.neutral.border}`,
          backgroundColor: tokens.colors.neutral.surface,
          transition: 'all 150ms ease',
          '&:hover': {
            borderColor: 'rgba(168, 85, 247, 0.25)', // slight purple glow
          },
        },
      },
    },
    MuiTextField: {
      defaultProps: {
        variant: 'outlined',
      },
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: 12,
            backgroundColor: 'rgba(255, 255, 255, 0.02)',
            transition: 'all 150ms ease',
            '&:hover': {
              backgroundColor: 'rgba(255, 255, 255, 0.04)',
            },
            '&.Mui-focused': {
              backgroundColor: 'rgba(255, 255, 255, 0.01)',
            },
          },
        },
      },
    },
    MuiSelect: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          backgroundColor: 'rgba(255, 255, 255, 0.02)',
        },
      },
    },
  },
});
