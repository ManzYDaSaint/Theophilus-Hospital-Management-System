import { Eye, EyeOff } from "lucide-react";
import { useState } from "react";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    label?: string;
}

const Input = ({ label, id, type, className, ...props }: InputProps) => {
    const [showPassword, setShowPassword] = useState(false);
    const isPasswordType = type === 'password';

    return (
        <div className="mb-4">
            {label && (
                <label htmlFor={id} className="label block text-sm font-medium text-gray-700 mb-1">
                    {label}
                </label>
            )}
            <div className="relative">
                <input
                    id={id}
                    type={isPasswordType && showPassword ? 'text' : type}
                    className={`w-full outline-none border-b-2 border-gray-300 focus:border-teal-500 bg-transparent text-sm px-2 py-1 transition-all ease-in-out pr-10 ${className || ''}`}
                    {...props}
                />
                {isPasswordType && (
                    <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-teal-600 focus:outline-none"
                    >
                        {showPassword ? (
                            <EyeOff size={18} />
                        ) : (
                            <Eye size={18} />
                        )}
                    </button>
                )}
            </div>
        </div>
    );
};

export default Input;
