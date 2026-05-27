export type MissionListItemApi = {
  id: string;
  createdAt: string;
  startedAt: string | null;
  finishedAt: string | null;
  targetUrl: string;
  goal: string;
  persona: string;
  device: string;
  status: string;
  confusionScore: number | null;
  priority: string | null;
  topDiagnosis: string | null;
  videoUrl: string | null;
};

export type MissionsResponseApi = {
  page: number;
  pageSize: number;
  total: number;
  missions: MissionListItemApi[];
};

export type MissionStepApi = {
  stepIndex: number;
  action: string;
  diagnosis: string | null;
  thought: string | null;
  createdAt: string;
};

export type MissionScreenshotApi = {
  stepIndex: number;
  imageUrl: string;
  message: string | null;
};

export type MissionDetailsApi = {
  id: string;
  targetUrl: string;
  goal: string;
  persona: string;
  device: string;
  status: string;
  confusionScore: number | null;
  topDiagnosis: string | null;
  createdAt: string;
  videoUrl: string | null;
  steps: MissionStepApi[];
  screenshots: MissionScreenshotApi[];
};

export type MissionDetailsResponseApi = {
  mission: MissionDetailsApi;
};

export type ShopRequest = {
  url: string;
  goal?: string;
  persona: string;
  device: string;
};

export type ShopResponseApi = {
  report: {
    goal: string;
    persona: string;
    device: string;
    confusionScore: number;
    topDiagnosis: string;
    videoUrl: string | null;
    screenshotTimeline?: Array<{ imageUrl: string; message: string; step: number }>;
    log?: Array<{
      type: string;
      details?: {
        thought?: string;
        diagnosis?: string;
      };
    }>;
  };
};
