import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';
import alertReducer from './slices/alertSlice';

export const store = configureStore({
  reducer: {
    alerts: alertReducer,
    auth: authReducer,
  },
});
