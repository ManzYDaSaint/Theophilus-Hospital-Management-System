import { Search } from "lucide-react";

interface SearchBarProps {
    type?: string;
    placeholder?: string;
    value?: string;
    onChange?: (event: React.ChangeEvent<HTMLInputElement>) => void;
}

const SearchBar = ({ type = "text", placeholder = "Search...", value, onChange }: SearchBarProps) => {
    return (
        <div className="flex items-center border-2 border-gray-300 rounded-lg pl-4">
            <Search className="w-5 h-5 text-gray-500" />
            <input
                type={type}
                placeholder={placeholder}
                value={value}
                onChange={onChange}
                className="flex-1 px-4 py-2 border-none bg-transparent rounded-lg focus:outline-none focus:ring-none"
            />
        </div>
    );
};

export default SearchBar;
