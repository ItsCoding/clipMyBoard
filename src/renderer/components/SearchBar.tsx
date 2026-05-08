interface SearchBarProps {
  value: string
  onChange: (value: string) => void
}

export function SearchBar({ value, onChange }: SearchBarProps) {
  return (
    <label className="searchbar">
      <span>⌕</span>
      <input
        autoFocus
        value={value}
        placeholder="Search clipboard history"
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  )
}
