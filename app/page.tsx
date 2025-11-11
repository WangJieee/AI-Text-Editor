import { AITextEditor } from './components/AITextEditor'

export default function Home() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-200/60 via-white/60 to-purple-200/60 font-sans">
      <main className="w-full">
        <AITextEditor />

      </main>
    </div>
  )
}
