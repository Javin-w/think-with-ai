import Layout from './components/Layout'
import ConversationPanel from './components/Chat/ConversationPanel'

function App() {
  const handleSend = (message: string) => {
    console.log('Send:', message)
  }

  return (
    <Layout
      leftPanel={
        <div className="flex items-center justify-center h-full text-text-secondary">
          Mind Map
        </div>
      }
      rightPanel={
        <ConversationPanel node={null} onSend={handleSend} />
      }
    />
  )
}

export default App
