export const colors = {
  charcoal: '#0d0d0d',
  charcoalLight: '#141414',
  industrialGray: '#4a4a4a',
  grayLight: '#8a8a8a',
  grayBg: '#f4f5f7',
  copper: '#E07B39',
  copperDark: '#C45A1F',
  emerald: '#10B981',
  steelBlue: '#3B82F6',
  white: '#ffffff',
};

export const getTheme = (mode) => ({
  palette: {
    mode,
    primary: {
      main: colors.copper,
      dark: colors.copperDark,
      contrastText: '#fff',
    },
    secondary: {
      main: colors.steelBlue,
    },
    success: {
      main: colors.emerald,
    },
    background: {
      default: mode === 'dark' ? colors.charcoal : colors.grayBg,
      paper: mode === 'dark' ? colors.charcoalLight : colors.white,
    },
    text: {
      primary: mode === 'dark' ? '#f0f0f0' : colors.charcoal,
      secondary: mode === 'dark' ? '#a0a0a0' : colors.industrialGray,
    },
    divider: mode === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)',
  },
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
    h3: { fontWeight: 700, fontSize: '1.75rem', '@media (min-width:600px)': { fontSize: '2.25rem' } },
    h4: { fontWeight: 700, fontSize: '1.35rem', '@media (min-width:600px)': { fontSize: '1.75rem' } },
    h5: { fontWeight: 600, fontSize: '1.15rem', '@media (min-width:600px)': { fontSize: '1.35rem' } },
    h6: { fontWeight: 600, fontSize: '1rem', '@media (min-width:600px)': { fontSize: '1.15rem' } },
    button: { textTransform: 'none', fontWeight: 600 },
  },
  shape: { borderRadius: 10 },
  components: {
    MuiButton: {
      styleOverrides: {
        root: { borderRadius: 8 },
        containedPrimary: {
          boxShadow: '0 2px 8px rgba(224, 123, 57, 0.35)',
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          boxShadow: 'none',
          border: mode === 'dark' ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(0,0,0,0.08)',
        },
      },
    },
    MuiDrawer: {
      styleOverrides: {
        paper: {
          borderRight: 'none',
        },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          margin: 16,
          width: 'calc(100% - 32px)',
        },
      },
    },
    MuiTablePagination: {
      styleOverrides: {
        root: {
          flexWrap: 'wrap',
        },
        toolbar: {
          flexWrap: 'wrap',
          gap: 8,
          paddingLeft: 8,
          paddingRight: 8,
        },
      },
    },
    MuiTabs: {
      defaultProps: {
        variant: 'scrollable',
        scrollButtons: 'auto',
        allowScrollButtonsMobile: true,
      },
    },
    MuiToggleButtonGroup: {
      styleOverrides: {
        root: {
          flexWrap: 'nowrap',
        },
      },
    },
  },
});
