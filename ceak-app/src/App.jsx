import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout.jsx';
import PdvPage from './pages/PdvPage.jsx';
import CadastroPage from './pages/CadastroPage.jsx';
import ContasPage from './pages/ContasPage.jsx';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<Navigate to="/pdv" replace />} />
        <Route path="pdv" element={<PdvPage />} />
        <Route path="cadastro-aluno" element={<CadastroPage />} />
        <Route path="novo-aluno" element={<Navigate to="/cadastro-aluno" replace />} />
        <Route path="admin/contas" element={<ContasPage />} />
        {/* Rota de compatibilidade e fallback */}
        <Route path="fechamento" element={<Navigate to="/admin/contas" replace />} />
        <Route path="*" element={<Navigate to="/pdv" replace />} />
      </Route>
    </Routes>
  );
}
