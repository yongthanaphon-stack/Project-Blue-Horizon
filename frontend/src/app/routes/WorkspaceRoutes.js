import { createElement, lazy } from 'react';

const AddSignal = lazy(() => import('../../pages/Signals/AddSignal'));
const EnvironmentalScan = lazy(() => import('../../pages/Workshops/EnvironmentalScan'));
const ScenarioGeneration = lazy(() => import('../../pages/Workshops/ScenarioGeneration'));
const SelectedScenario = lazy(() => import('../../pages/Workshops/SelectedScenario'));
const SignalBank = lazy(() => import('../../pages/Signals/SignalBank'));
const SignalDetail = lazy(() => import('../../pages/Signals/SignalDetail'));
const SwotAnalysis = lazy(() => import('../../pages/Workshops/SwotAnalysis'));
const NewWorkshop = lazy(() => import('../../pages/Workshops/NewWorkshop'));
const Workshop = lazy(() => import('../../pages/Workshops/Workshop'));

export const workspaceRoutes = [
  {
    element: createElement(SignalBank),
    path: '/signals',
    protected: true,
    title: 'Signal Bank',
  },
  {
    element: createElement(AddSignal),
    path: '/signals/new',
    protected: true,
    title: 'Add New Signal',
  },
  {
    element: createElement(SignalDetail),
    path: '/signals/:id',
    protected: true,
    title: 'Signal Details',
  },
  {
    element: createElement(Workshop),
    path: '/workshop',
    protected: true,
    title: 'Strategic Workshop',
  },
  {
    element: createElement(NewWorkshop),
    path: '/workshop/new',
    protected: true,
    title: 'New Workshop Session',
  },
  {
    element: createElement(EnvironmentalScan),
    path: '/workshop/:workshopId/radar',
    protected: true,
    title: 'Environmental Scanning',
  },
  {
    element: createElement(ScenarioGeneration),
    path: '/workshop/:workshopId/scenarios',
    protected: true,
    title: 'Scenario Generation',
  },
  {
    element: createElement(SelectedScenario),
    path: '/workshop/:workshopId/scenarios/selected',
    protected: true,
    title: 'Selected Scenarios',
  },
  {
    element: createElement(SwotAnalysis),
    path: '/workshop/:workshopId/scenarios/:scenarioId/swot',
    protected: true,
    title: 'SWOT Analysis',
  },
];
