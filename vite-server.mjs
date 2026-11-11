import { createServer } from 'vite'
import react from '@vitejs/plugin-react'

console.log('🚀 Starting GO7 Vite Development Server...')

async function startServer() {
  try {
    const server = await createServer({
      plugins: [react()],
      server: {
        port: 8080,
        host: true,
        open: false
      },
      resolve: {
        alias: {
          '@': '/src',
        },
      },
    })

    await server.listen()
    
    console.log('✅ Vite development server started!')
    console.log('🌐 Open your browser: http://localhost:8080')
    console.log('🏠 Your GO7 Home page with React components is ready!')
    
  } catch (error) {
    console.error('❌ Error starting Vite server:', error.message)
    process.exit(1)
  }
}

startServer()
