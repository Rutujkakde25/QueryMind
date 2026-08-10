function Sidebar() {
    return (
        <aside className="w-64 border -r border-gray-800 bg-gray-950 p-4">

            <h1 className="mb-6 text-xl font-bold">
                AI SQL Assistant
            </h1>

            <button className="mb-6 rounded-lg bg-white px-4 py-2 text-sm font-medium text-gray-900"> + New Query</button>

            <div>
                <h2 className="mb-3 text-xs font-semibold uppercase text-gray-500"> Recent Queries</h2>

                <div className="space-y-2">
                    
                    <button className="w-full rounded-md px-3 py-2 text-left text-sm text-gray-300 hover:bg-gray-800">
                        Top 5 employees
                    </button>

                    <button className="w-full rounded-md px-3 py-2 text-left text-sm text-gray-300 hover:bg-gray-800">
                        Sales report
                    </button>

                    <button className="w-full rounded-md px-3 py-2 text-left text-sm text-gray-300 hover:bg-gray-800">
                        Highest salary
                    </button>

                </div>

            </div>

        </aside>
    );
}
export default Sidebar;
