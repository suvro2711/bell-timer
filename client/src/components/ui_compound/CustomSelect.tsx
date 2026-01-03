import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export const CustomSelect = ({ label, onValueChange, options}:{label: string; onValueChange: (value: string) => void; options: {key: string; name: string; icon: string;}[]}) => <div className="space-y-2">
    <label className="text-sm font-medium">{label}</label>
    <Select onValueChange={onValueChange}>
        <SelectTrigger className="w-full">
        <SelectValue placeholder={`Select a ${label.toLowerCase()}`} />
        </SelectTrigger>
        <SelectContent label={label}>
        {options.map((option) => (
            <SelectItem key={option.key} value={option.key}>
            {option.icon} {option.name}
            </SelectItem>
        ))}
        </SelectContent>
    </Select>
</div>