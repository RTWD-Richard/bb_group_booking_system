const API_BASE = '/api';

export async function fetchAPI(endpoint: string, options?: RequestInit) {
  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(error.error || 'Request failed');
  }

  if (response.status === 204) {
    return null;
  }

  return response.json();
}

// Rooms API
export const roomsAPI = {
  getAll: () => fetchAPI('/rooms'),
  update: (id: string, data: any) => fetchAPI(`/rooms/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  }),
};

// Guests API
export const guestsAPI = {
  getAll: (search?: string) => fetchAPI(`/guests${search ? `?search=${search}` : ''}`),
  getOne: (id: string) => fetchAPI(`/guests/${id}`),
  create: (data: any) => fetchAPI('/guests', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  update: (id: string, data: any) => fetchAPI(`/guests/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  }),
  delete: (id: string) => fetchAPI(`/guests/${id}`, { method: 'DELETE' }),
};

// Groups API
export const groupsAPI = {
  getAll: () => fetchAPI('/groups'),
  getOne: (id: string) => fetchAPI(`/groups/${id}`),
  create: (data: any) => fetchAPI('/groups', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  update: (id: string, data: any) => fetchAPI(`/groups/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  }),
  delete: (id: string) => fetchAPI(`/groups/${id}`, { method: 'DELETE' }),
};

// Room Bookings API
export const bookingsAPI = {
  getAll: (params?: { groupId?: string; roomId?: string; startDate?: string; endDate?: string }) => {
    const query = new URLSearchParams(params as any).toString();
    return fetchAPI(`/room-bookings${query ? `?${query}` : ''}`);
  },
  getOne: (id: string) => fetchAPI(`/room-bookings/${id}`),
  create: (data: any) => fetchAPI('/room-bookings', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  createBulk: (bookings: any[]) => fetchAPI('/room-bookings/bulk', {
    method: 'POST',
    body: JSON.stringify({ bookings }),
  }),
  update: (id: string, data: any) => fetchAPI(`/room-bookings/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  }),
  delete: (id: string) => fetchAPI(`/room-bookings/${id}`, { method: 'DELETE' }),
};

// Settings API
export const settingsAPI = {
  get: () => fetchAPI('/settings'),
  update: (data: any) => fetchAPI('/settings', {
    method: 'PATCH',
    body: JSON.stringify(data),
  }),
};
