
interface ChartContainerProps {
    title: string;
    children: React.ReactNode;
}

const ChartContainer = ({ title, children }: ChartContainerProps) => {
    return (
        <div className="bg-white rounded-lg p-6 flex flex-col border-2 border-teal-500/20">
            <h3 className="text-gray-500 text-md font-semibold border-b-2 border-teal-500/20 pb-4">{title}</h3>
            <div className="p-4">
                {children}
            </div>
        </div>
    )
}

export default ChartContainer