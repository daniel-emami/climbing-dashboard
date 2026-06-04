type ErrorStateProps = {
  message: string;
};

export default function ErrorState({ message }: ErrorStateProps) {
  return (
    <div className="state-card error-card">
      <strong>Could not load dashboard</strong>
      <span>{message}</span>
    </div>
  );
}
