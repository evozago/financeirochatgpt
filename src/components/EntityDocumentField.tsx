import React, { useState } from "react";
import { useController, type Control } from "react-hook-form";
import { smartFormatCpfCnpj, validateCpfCnpjOrEmpty } from "../utils/br-doc";

type Props = {
  control: Control<any>;
  name?: string;
  required?: boolean;
  label?: string;
  placeholder?: string;
  disabled?: boolean;
};

export default function EntityDocumentField({
  control,
  name = "documento",
  required = false,
  label = "CPF ou CNPJ",
  placeholder = "CPF ou CNPJ",
  disabled = false,
}: Props) {
  const { field, fieldState } = useController({
    control,
    name,
    rules: {
      validate: (v: string) => {
        const { ok, type } = validateCpfCnpjOrEmpty(v ?? "");
        if (!required && type === "EMPTY") return true;
        return ok || "Documento inválido";
      },
    },
  });

  const [touched, setTouched] = useState(false);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const masked = smartFormatCpfCnpj(e.target.value);
    field.onChange(masked);
  }

  return (
    <div style={{ display: "grid", gap: 6 }}>
      <label style={{ fontSize: 14, fontWeight: 600 }}>
        {label}
        {!required && <span style={{ color: "#6b7280", fontWeight: 400 }}> (opcional)</span>}
      </label>
      <input
        type="text"
        inputMode="numeric"
        autoComplete="off"
        style={{
          border: `1px solid ${fieldState.error && touched ? "#ef4444" : "#d1d5db"}`,
          borderRadius: 8,
          padding: "10px 12px",
        }}
        placeholder={placeholder}
        value={field.value ?? ""}
        onChange={handleChange}
        onBlur={() => setTouched(true)}
        disabled={disabled}
      />
      <small style={{ minHeight: 16, color: fieldState.error && touched ? "#dc2626" : "#6b7280" }}>
        {fieldState.error && touched
          ? (fieldState.error.message as string)
          : "Digite CPF (11) ou CNPJ (14). Deixe em branco se não tiver."}
      </small>
    </div>
  );
}