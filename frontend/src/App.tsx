import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './lib/api';
import { Sidebar } from './components/Sidebar';
import { Spinner } from './components/UI';
import Login     from './pages/Login';
import Dashboard from './pages/Dashboard';
import RFQs      from './pages/RFQs';
import NewRFQ    from './pages/NewRFQ';
import RFQDetail from './pages/RFQDetail';
import Reports   from './pages/Reports';

function Layout() {
  const { user, loading } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center"><Spinner size={32}/></div>;
  if (!user)   return <Navigate to="/login" replace/>;
  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar/>
      <main className="flex-1 ml-60 min-h-screen overflow-auto"><Outlet/></main>
    </div>
  );
}

export default function App() {
  const base = import.meta.env.VITE_BASE_PATH || '/';
  return (
    <AuthProvider>
      <BrowserRouter basename={base}>
        <Routes>
          <Route path="/login" element={<Login/>}/>
          <Route element={<Layout/>}>
            <Route path="/"          element={<Dashboard/>}/>
            <Route path="/rfqs"      element={<RFQs/>}/>
            <Route path="/rfqs/new"  element={<NewRFQ/>}/>
            <Route path="/rfqs/:id"  element={<RFQDetail/>}/>
            <Route path="/reports"   element={<Reports/>}/>
          </Route>
          <Route path="*" element={<Navigate to="/" replace/>}/>
        </Routes>
      </BrowserRouter>
      <Toaster position="top-right" toastOptions={{
        style:{borderRadius:'10px',fontSize:'13px',fontFamily:'IBM Plex Sans, sans-serif'},
      }}/>
    </AuthProvider>
  );
}
