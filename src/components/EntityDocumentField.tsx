import React, { useState } from "react";
import { useController, Control } from "react-hook-form";
import { onlyDigits, smartFormatCpfCnpj, validateCpfCnpjOrEmpty } from "../utils/br-doc";

type Props = {
  control: Control<any>;
  name?: string;          // campo do formulário (ex.: "documento")
  required?: boolean;     // default false = pode ficar em branco
  label?: string;         // default "CPF ou CNPJ"
  placeholder?: string;   // default "CPF ou CNPJ"
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
        return ok || "Documento inválido para o tipo detectado";
      },
    },
  });

  const [touched, setTouched] = useState(false);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value;
    const masked = smartFormatCpfCnpj(raw);
    field.onChange(masked);
  }

  function handleBlur() {
    setTouched(true);
    // normaliza para só dígitos em um hidden? se quiser enviar “limpo”:
    // const digits = onlyDigits(field.value);
    // field.onChange(digits.length ? smartFormatCpfCnpj(digits) : "");
    field.onBlur();
  }

  const error = fieldState.error?.message as string | undefined;

  return (
    <div className="flex flex-col gap-1">
      <label className="text-sm font-medium">{label}{!required && <span className="text-gray-500"> (opcional)</span>}</label>
      <input
        type="text"
        inputMode="numeric"
        autoComplete="off"
        className={`border rounded px-3 py-2 ${error && touched ? "border-red-500" : "border-gray-300"}`}
        placeholder={placeholder}
        value={field.value ?? ""}
        onChange={handleChange}
        onBlur={handleBlur}
        disabled={disabled}
      />
      <small className={`h-4 ${error && touched ? "text-red-600" : "text-gray-500"}`}>
        {error && touched ? error : "Digite CPF (11) ou CNPJ (14). Deixe em branco se não tiver."}
      </small>
    </div>
  );
}
