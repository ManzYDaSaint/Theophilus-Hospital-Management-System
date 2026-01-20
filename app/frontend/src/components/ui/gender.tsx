
interface GenderProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
    label?: string;
}

const Gender = ({ label, id, className, name, value, onChange, ...rest }: GenderProps) => {

    return (
        <div className="mb-4">
            {label && (
                <label htmlFor={id} className="label block text-sm font-medium text-gray-700 mb-1">
                    {label}
                </label>
            )}
            <div className="relative">
                <select
                    id={id}
                    name={name}
                    value={value}
                    onChange={onChange}
                    className={`w-full outline-none border-b-2 border-gray-300 focus:border-teal-500 bg-transparent text-sm px-2 py-1 transition-all ease-in-out pr-10 ${className || ''}`}
                    {...rest}
                >
                    <option value="" disabled>Select gender</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                </select>
            </div>
        </div>
    );
};

export default Gender;
