export type Trend = {
  value: string;
  direction: "up" | "down" | "flat";
};

export type MetricCard = {
  title: string;
  value: string;
  trend: Trend;
  hint: string;
  icon: "runs" | "issues" | "friction" | "critical";
};

export type MissionStream = {
  id: string;
  reasoning: string;
  timestamp: string;
};

export type LiveMission = {
  status: "running" | "paused" | "completed";
  goal: string;
  device: string;
  targetUrl: string;
  persona: string;
  progress: number;
  previewImage: string;
  previewLabel: string;
  stream: MissionStream[];
};

export type Issue = {
  id: string;
  severity: "P0" | "P1" | "P2";
  diagnosis: string;
  summary: string;
  image: string;
};

export type MissionHistoryItem = {
  id: string;
  targetUrl: string;
  goal: string;
  persona: string;
  device: string;
  frictionScore: number;
  status: "Smooth" | "Warning" | "Critical";
  timestamp: string;
};
