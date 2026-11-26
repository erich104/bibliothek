import { useState } from "react";

type Props = {
  value: number | undefined;
  placeholder?: string;
  ariaLabel?: string;
  onCommit: (value: number | undefined) => void;
};

// Erwartet vom Aufrufer einen key, der sich mit dem Wert ändert
export default function AmountInput({
  value,
  placeholder,
  ariaLabel,
  onCommit,
}: Props) {
  const asText = (v: number | undefined) =>
    v === undefined ? "" : String(v).replace(".", ",");
  const [text, setText] = useState(asText(value));

  function commit() {
    const t = text.trim().replace(",", ".");
    if (t === "") {
      if (value !== undefined) onCommit(undefined);
      return;
    }
    const n = Number(t);
    if (!Number.isFinite(n) || n < 0) {
      setText(asText(value));
      return;
    }
    const rounded = Math.round(n * 100) / 100;
    if (rounded !== value) onCommit(rounded);
    else setText(asText(rounded));
  }

  return (
    <input
      className="amount-input"
      type="text"
      inputMode="decimal"
      aria-label={ariaLabel}
      placeholder={placeholder}
      value={text}
      onChange={(e) => setText(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          (e.target as HTMLInputElement).blur();
        }
      }}
    />
  );
}