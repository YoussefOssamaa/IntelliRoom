import React from 'react'
import ImageGenerator from './components/ImageGenerator'

function App() {
  return (
    <div className="app">
      <header className="app-header">
        <h1>IntelliRoom</h1>
        <p>Just a test</p>
      </header>
      <main>
        <ImageGenerator />
      </main>
      <footer className="app-footer">
        <p>..</p>
      </footer>
    </div>
  )
}

export default App
