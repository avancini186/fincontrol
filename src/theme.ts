import { createTheme } from '@mui/material/styles';

export const theme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#D0BCFF', // M3 Dark Primary
      light: '#E8DEF8',
      dark: '#381E72',
      contrastText: '#381E72',
    },
    secondary: {
      main: '#CCC2DC', // M3 Dark Secondary
      light: '#E8DEF8',
      dark: '#332D41',
      contrastText: '#332D41',
    },
    background: {
      default: '#141218', // M3 Dark Background
      paper: '#211F26',   // M3 Dark Surface/Container
    },
    error: {
      main: '#F2B8B5',
      contrastText: '#601410',
    },
    success: {
      main: '#81C784',
      contrastText: '#003300',
    },
    text: {
      primary: '#E6E1E5',
      secondary: '#CAC4D0',
    },
  },
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
    h1: { fontSize: '2.5rem', fontWeight: 600 },
    h2: { fontSize: '2rem', fontWeight: 600 },
    h3: { fontSize: '1.75rem', fontWeight: 600 },
    h4: { fontSize: '1.5rem', fontWeight: 500 },
    h5: { fontSize: '1.25rem', fontWeight: 500 },
    h6: { fontSize: '1rem', fontWeight: 500 },
    button: { textTransform: 'none', fontWeight: 500 },
  },
  shape: {
    borderRadius: 16, // Cantos arredondados característicos do Material 3
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 24, // Botões em formato "pill" do M3
          padding: '10px 24px',
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 20,
          backgroundImage: 'none',
          boxShadow: 'none',
          border: '1px solid rgba(255, 255, 255, 0.08)',
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
          },
        },
      },
    },
  },
});
