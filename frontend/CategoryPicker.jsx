import GlideSelect from "./GlideSelect";
export default function CategoryPicker({ options, value, onChange, label }) {
  return (
    <GlideSelect
      options={options.map(([value, label]) => ({ value, label }))}
      value={value}
      onChange={onChange}
      ariaLabel={label}
      size="lg"
      menuWidth={220}
    />
  );
}
