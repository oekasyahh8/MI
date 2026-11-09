import { lazy, Suspense, useState } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { AppLayout } from './components/layout/AppLayout';

const DashboardPage = lazy(() => import('./pages/DashboardPage').then((module) => ({ default: module.DashboardPage })));
const FormationsPage = lazy(() => import('./pages/FormationsPage').then((module) => ({ default: module.FormationsPage })));
const EducationPage = lazy(() => import('./pages/EducationPage').then((module) => ({ default: module.EducationPage })));
const AnalysisPage = lazy(() => import('./pages/AnalysisPage').then((module) => ({ default: module.AnalysisPage })));
const RecommendationsPage = lazy(() => import('./pages/RecommendationsPage').then((module) => ({ default: module.RecommendationsPage })));
const PlanPage = lazy(() => import('./pages/PlanPage').then((module) => ({ default: module.PlanPage })));
const DataPage = lazy(() => import('./pages/DataPage').then((module) => ({ default: module.DataPage })));
const AboutPage = lazy(() => import('./pages/AboutPage').then((module) => ({ default: module.AboutPage })));
const ComparePage = lazy(() => import('./pages/ComparePage').then((module) => ({ default: module.ComparePage })));

export default function App() {
  const [collapsed, setCollapsed] = useState(false);
  return <Suspense fallback={<div className="grid min-h-screen place-items-center bg-[#f5f7fa] text-xs font-semibold text-slate-500">Memuat halaman…</div>}><Routes><Route element={<AppLayout collapsed={collapsed} onToggleSidebar={() => setCollapsed((value) => !value)} />}>
    <Route path="/" element={<DashboardPage />} />
    <Route path="/database" element={<FormationsPage />} />
    <Route path="/education" element={<EducationPage />} />
    <Route path="/agencies" element={<AnalysisPage type="agencies" />} />
    <Route path="/positions" element={<AnalysisPage type="positions" />} />
    <Route path="/regions" element={<AnalysisPage type="regions" />} />
    <Route path="/competition" element={<AnalysisPage type="competition" />} />
    <Route path="/strategy" element={<RecommendationsPage />} />
    <Route path="/plan" element={<PlanPage />} />
    <Route path="/compare" element={<ComparePage />} />
    <Route path="/data" element={<DataPage />} />
    <Route path="/about" element={<AboutPage />} />
    <Route path="*" element={<Navigate to="/" replace />} />
  </Route></Routes></Suspense>;
}
