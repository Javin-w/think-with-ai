import Layout from './components/Layout'

function App() {
  return (
    <Layout
      leftPanel={
        <div className="flex items-center justify-center h-full text-text-secondary">
          Mind Map
        </div>
      }
      rightPanel={
        <div className="flex items-center justify-center h-full text-text-secondary">
          Conversation
        </div>
      }
    />
  )
}

export default App
