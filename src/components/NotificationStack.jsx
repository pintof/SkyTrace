const NotificationStack = ({ notifications, onDismiss }) => (
  <div className="notification-stack" aria-atomic="true" aria-live="polite">
    {notifications.map((notification) => (
      <output className="notification-toast" key={notification.id}>
        <span className="notification-dot" />
        <span className="notification-message">{notification.message}</span>
        <button
          aria-label="Dismiss notification"
          className="notification-close"
          onClick={() => onDismiss(notification.id)}
          type="button"
        >
          ×
        </button>
      </output>
    ))}
  </div>
);

export default NotificationStack;
