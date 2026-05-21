import { adminRoutes } from './AdminRoutes';
import { evaluationRoutes } from './EvaluationRoutes';
import { landingRoutes } from './LandingRoutes';
import { meRoutes } from './MeRoutes';
import { publicationsRoutes } from './PublicationsRoutes';
import { researchProjectsRoutes } from './ResearchProjectsRoutes';
import { setupRoutes } from './SetupRoutes';
import { workspaceRoutes } from './WorkspaceRoutes';

export const publicRoutes = landingRoutes;

export const authenticatedRoutes = [
  ...workspaceRoutes,
  ...meRoutes,
  ...publicationsRoutes,
  ...researchProjectsRoutes,
  ...evaluationRoutes,
  ...adminRoutes,
  ...setupRoutes,
];

export const allAppRoutes = [
  ...publicRoutes,
  ...authenticatedRoutes,
];

export const publicRoutePaths = publicRoutes.map((route) => route.path);
