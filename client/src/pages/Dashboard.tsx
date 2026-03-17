export default function Dashboard() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Your Projects</h1>
      
      <div className="bg-white rounded-lg shadow p-6 text-center">
        <p className="text-gray-500">No projects yet</p>
        <a href="/create" className="text-blue-600 hover:underline">
          Create your first tournament website →
        </a>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="text-3xl mb-2">🎯</div>
          <h3 className="font-bold">Specification</h3>
          <p className="text-sm text-gray-600">Describe your tournament</p>
        </div>
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
          <div className="text-3xl mb-2">🤖</div>
          <h3 className="font-bold">AI Generation</h3>
          <p className="text-sm text-gray-600">Claude generates your site</p>
        </div>
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="text-3xl mb-2">🚀</div>
          <h3 className="font-bold">Deploy</h3>
          <p className="text-sm text-gray-600">Host or share your site</p>
        </div>
      </div>
    </div>
  );
}
