import { createSlice } from '@reduxjs/toolkit';
import { clearAuthSession, getAuthToken, getSavedUser, saveAuthSession, saveAuthUser } from '../../../utils/authStorage';

const savedUser = getSavedUser();
const savedToken = getAuthToken();

const initialState = {
  user: savedUser,
  token: savedToken,
  isAuthenticated: Boolean(savedUser && savedToken),
  loading: false,
  error: null,
  hasValidatedSession: false,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    loginStart: (state) => {
      state.loading = true;
      state.error = null;
    },
    loginSuccess: (state, action) => {
      const { user, token } = action.payload;
      state.loading = false;
      state.isAuthenticated = true;
      state.user = user;
      state.token = token;
      state.error = null;
      saveAuthSession(user, token);
    },
    refreshSessionSuccess: (state, action) => {
      state.user = action.payload.user;
      state.token = action.payload.token || state.token;
      state.isAuthenticated = true;
      state.loading = false;
      state.error = null;
      state.hasValidatedSession = true;
      saveAuthUser(state.user);
      if (state.token) saveAuthSession(state.user, state.token);
    },
    refreshSessionComplete: (state) => {
      state.hasValidatedSession = true;
      state.loading = false;
    },
    loginFailure: (state, action) => {
      state.loading = false;
      state.error = action.payload;
    },
    logout: (state) => {
      state.user = null;
      state.token = null;
      state.isAuthenticated = false;
      state.error = null;
      state.hasValidatedSession = true;
      clearAuthSession();
    },
  },
});

export const {
  loginStart,
  loginSuccess,
  loginFailure,
  refreshSessionSuccess,
  refreshSessionComplete,
  logout,
} = authSlice.actions;

export default authSlice.reducer;
