const BASE = '/api';

async function request(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) {
    let detail = res.statusText;
    try {
      const body = await res.json();
      detail = body.detail || detail;
    } catch {
      // ignore
    }
    throw new Error(detail);
  }
  if (res.status === 204) return null;
  return res.json();
}

export function joinTeam(name) {
  return request('/teams/join', {
    method: 'POST',
    body: JSON.stringify({ name }),
  });
}

export function getQuestions() {
  return request('/questions');
}

export function getQuestion(id) {
  return request(`/questions/${id}`);
}

export function getTemplates(questionId) {
  return request(`/prompt-templates?question_id=${encodeURIComponent(questionId)}`);
}

export function getSubmissions(teamId) {
  return request(`/teams/${teamId}/submissions`);
}

export function updateSubmission(teamId, questionId, payload) {
  return request(`/teams/${teamId}/submissions/${questionId}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

export function fileDownloadUrl(questionId, fileId) {
  return `${BASE}/questions/${questionId}/files/${fileId}`;
}

export async function getAdminOverview(token) {
  const res = await fetch(`${BASE}/admin/overview`, {
    headers: { 'X-Admin-Token': token },
  });
  if (!res.ok) {
    throw new Error(res.status === 401 ? 'Invalid admin token' : res.statusText);
  }
  return res.json();
}

export function adminExportUrl(token) {
  return `${BASE}/admin/export.csv?token=${encodeURIComponent(token)}`;
}

export function sendChatMessage(message) {
  return request('/chat', {
    method: 'POST',
    body: JSON.stringify({ message }),
  });
}
