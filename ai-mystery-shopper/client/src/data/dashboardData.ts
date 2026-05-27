import { Issue, LiveMission, MetricCard, MissionHistoryItem } from "../types/dashboard";

export const metricCards: MetricCard[] = [
  { title: "Runs Today", value: "128", trend: { value: "+18.2%", direction: "up" }, hint: "24h mission volume", icon: "runs" },
  { title: "Issues Detected", value: "34", trend: { value: "-6.4%", direction: "down" }, hint: "Compared to yesterday", icon: "issues" },
  { title: "Avg Friction Score", value: "27.1", trend: { value: "-3.8", direction: "down" }, hint: "Lower is healthier", icon: "friction" },
  { title: "Critical Failures", value: "5", trend: { value: "+1", direction: "up" }, hint: "Immediate escalation", icon: "critical" },
];

export const liveMission: LiveMission = {
  status: "running",
  goal: "Complete new user signup and verify first dashboard load without blocker",
  device: "iPhone 13",
  targetUrl: "https://app.sentinelbot-demo.com/signup",
  persona: "First-Time User",
  progress: 72,
  previewLabel: "Live screenshot feed",
  previewImage:
    "https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=1200&q=80",
  stream: [
    { id: "s1", reasoning: "Found primary CTA. Starting registration flow.", timestamp: "2m ago" },
    { id: "s2", reasoning: "Password validation copy is unclear on criteria.", timestamp: "78s ago" },
    { id: "s3", reasoning: "Detected modal overlap on mobile viewport, retrying submit.", timestamp: "34s ago" },
    { id: "s4", reasoning: "Submit succeeded after dismissing modal. Waiting for dashboard render.", timestamp: "now" },
  ],
};

export const latestIssues: Issue[] = [
  {
    id: "ISS-1042",
    severity: "P0",
    diagnosis: "Signup Submit Dead Link",
    summary: "Submit action produced no navigation and no validation state for 12 seconds on Safari mobile.",
    image: "https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?auto=format&fit=crop&w=640&q=80",
  },
  {
    id: "ISS-1039",
    severity: "P1",
    diagnosis: "Broken Navigation",
    summary: "Pricing CTA routes to 404 from onboarding modal in FR locale.",
    image: "https://images.unsplash.com/photo-1551281044-8b0a2c8990f1?auto=format&fit=crop&w=640&q=80",
  },
  {
    id: "ISS-1036",
    severity: "P2",
    diagnosis: "UI Glitch",
    summary: "Feature tooltip clips outside viewport at 1024px and hides save action.",
    image: "https://images.unsplash.com/photo-1461749280684-dccba630e2f6?auto=format&fit=crop&w=640&q=80",
  },
];

export const missionHistory: MissionHistoryItem[] = [
  {
    id: "MIS-9001",
    targetUrl: "app.sentinelbot-demo.com/signup",
    goal: "New user signup",
    persona: "First-Time User",
    device: "iPhone 13",
    frictionScore: 64,
    status: "Critical",
    timestamp: "2026-05-28 10:42",
  },
  {
    id: "MIS-9000",
    targetUrl: "app.sentinelbot-demo.com/pricing",
    goal: "Plan upgrade flow",
    persona: "Adversarial Tester",
    device: "iPad Mini",
    frictionScore: 31,
    status: "Warning",
    timestamp: "2026-05-28 09:57",
  },
  {
    id: "MIS-8998",
    targetUrl: "app.sentinelbot-demo.com/onboarding",
    goal: "Finish guided tour",
    persona: "Elderly User",
    device: "iPhone 13",
    frictionScore: 14,
    status: "Smooth",
    timestamp: "2026-05-28 08:31",
  },
  {
    id: "MIS-8992",
    targetUrl: "app.sentinelbot-demo.com/login",
    goal: "Recover password",
    persona: "First-Time User",
    device: "Desktop",
    frictionScore: 22,
    status: "Smooth",
    timestamp: "2026-05-27 20:09",
  },
];
