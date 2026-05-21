import { createSlice } from '@reduxjs/toolkit';

function createAlertId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }

  return `alert-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

const alertSlice = createSlice({
  name: 'alerts',
  initialState: {
    items: [],
  },
  reducers: {
    showAlert: {
      reducer: (state, action) => {
        state.items.push(action.payload);
      },
      prepare: ({ message, timeout = 4000, title = '', type = 'info' }) => ({
        payload: {
          id: createAlertId(),
          message,
          timeout,
          title,
          type,
        },
      }),
    },
    dismissAlert: (state, action) => {
      state.items = state.items.filter((alert) => alert.id !== action.payload);
    },
    clearAlerts: (state) => {
      state.items = [];
    },
  },
});

export const { clearAlerts, dismissAlert, showAlert } = alertSlice.actions;
export default alertSlice.reducer;
