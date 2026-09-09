import './Loading.css';

export default function Loading({ fullscreen = false, label = 'Loading…', size = 'md' }) {
  const spinner = (
    <div className={`spinner-wrap ${size}`}>
      <span className="spinner" aria-hidden="true" />
      {label && <p className="spinner-label">{label}</p>}
    </div>
  );

  if (fullscreen) {
    return <div className="spinner-fullscreen">{spinner}</div>;
  }
  return spinner;
}
