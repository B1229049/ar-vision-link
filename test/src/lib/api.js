const API_BASE = ''

async function request(url, options = {}) {
  const res = await fetch(`${API_BASE}${url}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
    ...options,
  })

  const data = await res.json()

  if (!res.ok || data.success === false) {
    throw new Error(data.error || 'API request failed')
  }

  return data
}

export async function getUsersApi() {
  const data = await request('/api/users')
  return data.users || []
}

export async function createUserApi(payload) {
  const data = await request('/api/users/register', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
  return data.user
}

export async function updateUserApi(id, payload) {
  const data = await request(`/api/users/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  })
  return data.user
}

export async function deleteUserApi(id) {
  const data = await request(`/api/users/${id}`, {
    method: 'DELETE',
  })
  return data.user
}