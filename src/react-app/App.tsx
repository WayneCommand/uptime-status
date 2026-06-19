import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { MantineProvider } from '@mantine/core'
import { DataProvider } from './AppContext'
import HomePage from './components/HomePage'
import IncidentsPage from './components/IncidentsPage'
import EmbedPage from './components/EmbedPage'

export default function App() {
  return (
    <BrowserRouter>
      <MantineProvider defaultColorScheme="auto">
        <DataProvider>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/incidents" element={<IncidentsPage />} />
            <Route path="/embed/:id" element={<EmbedPage />} />
          </Routes>
        </DataProvider>
      </MantineProvider>
    </BrowserRouter>
  )
}
