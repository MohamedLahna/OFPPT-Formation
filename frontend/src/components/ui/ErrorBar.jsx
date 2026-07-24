const ErrorBar = ({ message, onRetry }) => (
  <div className="error-bar">
    <span>{message}</span>
    {onRetry && <button type="button" onClick={onRetry}>Réessayer</button>}
  </div>
);

export default ErrorBar;
