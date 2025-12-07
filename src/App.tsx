import { useStore } from './store';
import { Sidebar } from './components/Sidebar';
import { Editor2D } from './components/Editor2D';
import { Viewer3D } from './components/Viewer3D';

function App() {
  const { viewMode } = useStore();

  return (
    <div className="flex w-full h-screen bg-black">
      <Sidebar />
      <div className="flex-1 relative">
        {viewMode === '2D' ? <Editor2D /> : <Viewer3D />}
      </div>
    </div>
  );
}

export default App;
