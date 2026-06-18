import axios from "axios";
import { API_BASE_URL } from "../config/env";
import {
  HumanGateResumeApi,
  HumanGateStatusApi,
  MissionDetailsResponseApi,
  MissionsResponseApi,
  ShopRequest,
  ShopResponseApi,
} from "../types/api";

const http = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30 * 60 * 1000,
});

export async function fetchMissions(page = 1, pageSize = 20) {
  const { data } = await http.get<MissionsResponseApi>("/api/missions", { params: { page, pageSize } });
  return data;
}

export async function fetchMissionById(id: string) {
  const { data } = await http.get<MissionDetailsResponseApi>(`/api/missions/${id}`);
  return data;
}

export async function runMission(payload: ShopRequest) {
  const { data } = await http.post<ShopResponseApi>("/api/shop", payload);
  return data;
}

export async function deleteMission(id: string, force = false) {
  const { data } = await http.delete<{ deleted: boolean; id: string }>(`/api/missions/${id}`, {
    params: force ? { force: "true" } : undefined,
  });
  return data;
}

export async function fetchHumanGateStatus() {
  const { data } = await http.get<HumanGateStatusApi>("/api/human/status");
  return data;
}

export async function resumeHumanGate() {
  const { data } = await http.post<HumanGateResumeApi>("/api/human/resume");
  return data;
}
