interface ToggleSwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  description?: string;
}

export const ToggleSwitch = ({ checked, onChange, label, description }: ToggleSwitchProps) => (
  <div className="flex items-center justify-between py-2">
    <div>
      <p className="text-sm text-[#F4F5F5]">{label}</p>
      {description && <p className="text-xs text-[#8D969B]">{description}</p>}
    </div>
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`w-10 h-6 rounded-full relative cursor-pointer transition-colors ${
        checked ? 'bg-[#35C759]' : 'bg-[#252A2D]'
      }`}
    >
      <div
        className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
          checked ? 'right-1' : 'left-1'
        }`}
      />
    </button>
  </div>
);
