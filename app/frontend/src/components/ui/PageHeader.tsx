import { Plus } from "lucide-react";

interface HeaderProps {
    onClick: () => void;
    label: string;
    HeaderTitle: string;
    HeaderPara: string;
}

const Header = ({ onClick, label, HeaderTitle, HeaderPara }: HeaderProps) => {
    return (
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
                <h1 className="text-xl font-semibold text-secondary-900">{HeaderTitle}</h1>
                <p className="text-sm text-secondary-600">{HeaderPara}</p>
            </div>
            <button
                onClick={onClick}
                className="bg-teal-500 text-white px-4 py-2 text-sm font-medium rounded-lg flex items-center"
            >
                <Plus className="w-5 h-5 mr-1" />
                {label}
            </button>
        </div>
    )
}

export default Header;