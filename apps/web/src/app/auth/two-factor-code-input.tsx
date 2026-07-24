import { useEffect, useRef } from "react";
import "./two-factor-code-input.css";

const codeLength = 6;

export function TwoFactorCodeInput({ value, onChange }: { onChange: (value: string) => void; value: string }) {
  const inputs = useRef<Array<HTMLInputElement | null>>([]);
  const digits = Array.from({ length: codeLength }, (_, index) => value[index] ?? "");

  useEffect(() => {
    inputs.current[0]?.focus();
  }, []);

  function focus(index: number) {
    inputs.current[Math.min(index, codeLength - 1)]?.focus();
  }

  function setDigits(startIndex: number, rawValue: string) {
    const nextDigits = [...digits];
    const incomingDigits = rawValue.replace(/\D/g, "").slice(0, codeLength - startIndex);
    if (!incomingDigits) nextDigits[startIndex] = "";
    incomingDigits.split("").forEach((digit, offset) => { nextDigits[startIndex + offset] = digit; });
    onChange(nextDigits.join(""));
    focus(startIndex + Math.max(incomingDigits.length, 1));
  }

  return (
    <fieldset className="two-factor-input">
      <legend>2FA-Code</legend>
      <p>Code aus deiner Authenticator-App oder E-Mail eingeben.</p>
      <div className="two-factor-digits">
        {digits.map((digit, index) => (
          <input
            aria-label={`Ziffer ${index + 1} von ${codeLength}`}
            autoComplete={index === 0 ? "one-time-code" : "off"}
            inputMode="numeric"
            key={index}
            maxLength={codeLength}
            name={index === 0 ? "one-time-code" : undefined}
            onChange={(event) => setDigits(index, event.target.value)}
            onFocus={(event) => event.currentTarget.select()}
            onKeyDown={(event) => {
              if (event.key === "Backspace" && !digit && index > 0) focus(index - 1);
              if (event.key === "ArrowLeft" && index > 0) { event.preventDefault(); focus(index - 1); }
              if (event.key === "ArrowRight" && index < codeLength - 1) { event.preventDefault(); focus(index + 1); }
            }}
            onPaste={(event) => { event.preventDefault(); setDigits(index, event.clipboardData.getData("text")); }}
            pattern="[0-9]*"
            ref={(element) => { inputs.current[index] = element; }}
            spellCheck={false}
            type="text"
            value={digit}
          />
        ))}
      </div>
    </fieldset>
  );
}
