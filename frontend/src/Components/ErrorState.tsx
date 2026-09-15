type ErrorStateProps = {
  message: string;
};

export default function ErrorState({ message }: ErrorStateProps) {
  return (
    <div className={`${sharedStyles.stateCard} ${sharedStyles.errorCard}`}>
      <strong>Could not load dashboard</strong>
      <span>{message}</span>
    </div>
  );
}
import sharedStyles from "../Styles/Shared.module.css";
