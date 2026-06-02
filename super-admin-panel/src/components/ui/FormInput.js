export default function FormInput({ label, className = "", ...props }) {
  return (
    <div className="space-y-1.5">
      {label && (
        <label className="block text-[12px] font-semibold text-[var(--text-secondary)] uppercase tracking-wider">
          {label}
        </label>
      )}
      <input
        {...props}
        className={`input-base w-full px-3.5 py-2.5 rounded-xl text-sm transition-all ${className}`}
      />
    </div>
  );
}
