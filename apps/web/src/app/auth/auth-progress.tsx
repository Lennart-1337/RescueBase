import "./auth-progress.css";

export function AuthProgress({ currentStep }: { currentStep: 1 | 2 }) {
  return (
    <div aria-label={`Anmeldung, Schritt ${currentStep} von 2`} className="auth-progress">
      <span>Schritt {currentStep} von 2</span>
      <div aria-hidden="true" className="auth-progress-track">
        <i className={currentStep === 2 ? "auth-progress-fill auth-progress-fill-complete" : "auth-progress-fill"} />
      </div>
    </div>
  );
}
