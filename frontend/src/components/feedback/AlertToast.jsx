import { CircleAlert, CircleCheck, Info, TriangleAlert, X } from 'lucide-react';
import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { dismissAlert } from '../../app/store/slices/alertSlice';

const ALERT_DETAILS = {
  error: {
    icon: CircleAlert,
    label: 'Error',
  },
  info: {
    icon: Info,
    label: 'Information',
  },
  success: {
    icon: CircleCheck,
    label: 'Success',
  },
  warning: {
    icon: TriangleAlert,
    label: 'Warning',
  },
};

export default function AlertToast() {
  const dispatch = useDispatch();
  const alerts = useSelector((state) => state.alerts.items);

  useEffect(() => {
    const timers = alerts
      .filter((alert) => alert.timeout > 0)
      .map((alert) =>
        window.setTimeout(() => {
          dispatch(dismissAlert(alert.id));
        }, alert.timeout)
      );

    return () => {
      timers.forEach((timerId) => window.clearTimeout(timerId));
    };
  }, [alerts, dispatch]);

  if (alerts.length === 0) return null;

  return (
    <div className="alert-toast-region" aria-live="polite" aria-label="Application notifications">
      {alerts.map((alert) => {
        const alertDetails = ALERT_DETAILS[alert.type] || ALERT_DETAILS.info;
        const Icon = alertDetails.icon;
        const title = alert.title || alertDetails.label;

        return (
          <article
            key={alert.id}
            className={`alert-toast alert-toast-${alert.type}`}
            role={alert.type === 'error' ? 'alert' : 'status'}
          >
            <span className="alert-toast-icon" aria-hidden="true">
              <Icon size={18} />
            </span>
            <div className="alert-toast-copy">
              <strong>{title}</strong>
              <p>{alert.message}</p>
            </div>
            <button
              type="button"
              aria-label="Dismiss notification"
              onClick={() => dispatch(dismissAlert(alert.id))}
            >
              <X size={15} />
            </button>
          </article>
        );
      })}
    </div>
  );
}
