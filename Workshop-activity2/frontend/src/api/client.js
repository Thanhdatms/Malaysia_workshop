const BASE = '/api';

async function request(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) {
    let detail = `Request failed (${res.status})`;
    try {
      const body = await res.json();
      detail = body.detail || detail;
    } catch {
      // ignore
    }
    throw new Error(detail);
  }
  return res.json();
}

export function joinTeam(name, department) {
  return request('/teams/join', {
    method: 'POST',
    body: JSON.stringify({ name, department }),
  });
}

export function saveProcessSteps(teamId, steps) {
  return request(`/teams/${teamId}/process-steps`, {
    method: 'PUT',
    body: JSON.stringify(steps),
  });
}

export function organizeProcessSteps(teamId) {
  return request(`/teams/${teamId}/process-steps/ai-organize`, { method: 'POST' });
}

export function saveEvaluateSteps(teamId, steps) {
  return request(`/teams/${teamId}/evaluate-steps`, {
    method: 'PUT',
    body: JSON.stringify(steps),
  });
}

export function getEvaluateAiProposal(teamId) {
  return request(`/teams/${teamId}/evaluate-steps/ai-proposal`, { method: 'POST' });
}

export function saveWorkflow(teamId, graph) {
  return request(`/teams/${teamId}/workflow`, {
    method: 'PUT',
    body: JSON.stringify(graph),
  });
}

export function generateWorkflowProposal(teamId) {
  return request(`/teams/${teamId}/workflow/ai-generate`, { method: 'POST' });
}

export function editWorkflowWithAi(teamId, instruction, graph) {
  return request(`/teams/${teamId}/workflow/ai-edit`, {
    method: 'POST',
    body: JSON.stringify({ instruction, nodes: graph.nodes, edges: graph.edges }),
  });
}

export function submitTeam(teamId) {
  return request(`/teams/${teamId}/submit`, { method: 'POST' });
}

export function getAdminOverview(token) {
  return request(`/admin/overview?token=${encodeURIComponent(token)}`);
}

export function saveBenefitAnalysis(teamId, data) {
  return request(`/teams/${teamId}/analysis`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export function generateBenefitAnalysis(teamId) {
  return request(`/teams/${teamId}/analysis/ai-generate`, { method: 'POST' });
}

export function sendChatMessage(messages) {
  return request('/chat', {
    method: 'POST',
    body: JSON.stringify({ messages }),
  });
}
