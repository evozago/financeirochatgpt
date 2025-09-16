import React, { useState } from "react";
import { useController, Control } from "react-hook-form";
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
    <div className="flex flex-col gap-1">
      <label className="text-sm font-medium">
        {label}{!required && <span className="text-gray-500"> (opcional)</span>}
      </label>
      <input
        type="text"
        inputMode="numeric"
        autoComplete="off"
        className={`border rounded px-3 py-2 ${fieldState.error && touched ? "border-red-500" : "border-gray-300"}`}
        placeholder={placeholder}
        value={field.value ?? ""}
        onChange={handleChange}
        onBlur={() => setTouched(true)}
        disabled={disabled}
      />
      <small className={`h-4 ${fieldState.error && touched ? "text-red-600" : "text-gray-500"}`}>
        {fieldState.error && touched ? fieldState.error.message?.toString() : "Digite CPF (11) ou CNPJ (14). Deixe em branco se não tiver."}
      </small>
    </div>
  );
}
