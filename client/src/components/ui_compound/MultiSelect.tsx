import React from "react";
import ReactSelect, { MultiValue, StylesConfig } from "react-select";
import CreatableSelect from "react-select/creatable";

export interface SelectOption {
  value: string;
  label: string;
}

function toOptions(values: string[]): SelectOption[] {
  return values.map((v) => ({ value: v, label: v }));
}

function fromOptions(options: MultiValue<SelectOption>): string[] {
  return options.map((o) => o.value);
}

// Shared dark-mode–aware styles that blend with the shadcn theme.
const multiSelectStyles: StylesConfig<SelectOption, true> = {
  control: (base, state) => ({
    ...base,
    backgroundColor: "hsl(var(--background))",
    borderColor: state.isFocused ? "hsl(var(--ring))" : "hsl(var(--border))",
    boxShadow: state.isFocused ? "0 0 0 2px hsl(var(--ring) / 0.3)" : "none",
    borderRadius: "calc(var(--radius) - 2px)",
    minHeight: "36px",
    fontSize: "0.875rem",
    "&:hover": { borderColor: "hsl(var(--ring))" },
  }),
  menu: (base) => ({
    ...base,
    backgroundColor: "hsl(var(--popover))",
    border: "1px solid hsl(var(--border))",
    borderRadius: "var(--radius)",
    zIndex: 50,
  }),
  option: (base, state) => ({
    ...base,
    backgroundColor: state.isSelected
      ? "hsl(var(--primary))"
      : state.isFocused
      ? "hsl(var(--accent))"
      : "transparent",
    color: state.isSelected ? "hsl(var(--primary-foreground))" : "hsl(var(--foreground))",
    fontSize: "0.875rem",
    cursor: "pointer",
  }),
  multiValue: (base) => ({
    ...base,
    backgroundColor: "hsl(var(--secondary))",
    borderRadius: "4px",
  }),
  multiValueLabel: (base) => ({
    ...base,
    color: "hsl(var(--secondary-foreground))",
    fontSize: "0.75rem",
  }),
  multiValueRemove: (base) => ({
    ...base,
    color: "hsl(var(--muted-foreground))",
    "&:hover": { backgroundColor: "hsl(var(--destructive))", color: "#fff" },
  }),
  input: (base) => ({ ...base, color: "hsl(var(--foreground))" }),
  placeholder: (base) => ({ ...base, color: "hsl(var(--muted-foreground))" }),
  singleValue: (base) => ({ ...base, color: "hsl(var(--foreground))" }),
  noOptionsMessage: (base) => ({
    ...base,
    color: "hsl(var(--muted-foreground))",
    fontSize: "0.875rem",
  }),
};

// ─── Restricted multi-select (options come from a pre-created list) ──────────

interface RestrictedMultiSelectProps {
  options: string[];
  value: string[];
  onChange: (values: string[]) => void;
  placeholder?: string;
  inputId?: string;
}

export const RestrictedMultiSelect: React.FC<RestrictedMultiSelectProps> = ({
  options,
  value,
  onChange,
  placeholder = "Select groups…",
  inputId,
}) => {
  return (
    <ReactSelect
      isMulti
      inputId={inputId}
      options={toOptions(options)}
      value={toOptions(value)}
      onChange={(selected) => onChange(fromOptions(selected))}
      placeholder={placeholder}
      styles={multiSelectStyles}
      classNamePrefix="rs"
      isClearable={false}
    />
  );
};

// ─── Creatable multi-select (free-form, type to add new values) ──────────────

interface CreatableMultiSelectProps {
  value: string[];
  onChange: (values: string[]) => void;
  placeholder?: string;
  inputId?: string;
}

export const CreatableMultiSelect: React.FC<CreatableMultiSelectProps> = ({
  value,
  onChange,
  placeholder = "Type to add tags…",
  inputId,
}) => {
  return (
    <CreatableSelect
      isMulti
      inputId={inputId}
      value={toOptions(value)}
      onChange={(selected) => onChange(fromOptions(selected))}
      placeholder={placeholder}
      styles={multiSelectStyles}
      classNamePrefix="rs"
      components={{ DropdownIndicator: null }}
      formatCreateLabel={(input) => `Add "${input}"`}
      isClearable={false}
    />
  );
};
