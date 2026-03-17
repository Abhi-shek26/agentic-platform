export default function GenerationProgress() {
  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Generating Your Website...</h1>
      
      <div className="bg-white rounded-lg shadow p-6 space-y-6">
        <div>
          <div className="flex justify-between mb-2">
            <span>Overall Progress</span>
            <span>0%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div className="bg-blue-600 h-2 rounded-full" style={{ width: "0%" }}></div>
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-gray-300 rounded-full"></div>
            <span>Parsing Specification</span>
          </div>
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-gray-300 rounded-full"></div>
            <span>Designing Architecture</span>
          </div>
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-gray-300 rounded-full"></div>
            <span>Generating Code</span>
          </div>
        </div>

        <div className="bg-gray-100 rounded p-4 text-sm font-mono max-h-40 overflow-y-auto">
          <p className="text-gray-500">Waiting to start...</p>
        </div>
      </div>
    </div>
  );
}
