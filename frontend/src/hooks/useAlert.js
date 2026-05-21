import { useCallback } from 'react';
import { useDispatch } from 'react-redux';
import { clearAlerts, dismissAlert, showAlert as showAlertAction } from '../app/store/slices/alertSlice';

export function useAlert() {
  const dispatch = useDispatch();

  const showAlert = useCallback((message, type = 'info', title = '') => {
    dispatch(showAlertAction({ message, type, title }));
  }, [dispatch]);
  const clearAlertsCallback = useCallback(() => dispatch(clearAlerts()), [dispatch]);
  const dismissAlertCallback = useCallback((id) => dispatch(dismissAlert(id)), [dispatch]);
  const showError = useCallback((message, title = 'Error') => showAlert(message, 'error', title), [showAlert]);
  const showInfo = useCallback((message, title = 'Info') => showAlert(message, 'info', title), [showAlert]);
  const showSuccess = useCallback((message, title = 'Success') => showAlert(message, 'success', title), [showAlert]);
  const showWarning = useCallback((message, title = 'Warning') => showAlert(message, 'warning', title), [showAlert]);

  return {
    clearAlerts: clearAlertsCallback,
    dismissAlert: dismissAlertCallback,
    showAlert,
    showError,
    showInfo,
    showSuccess,
    showWarning,
  };
}
