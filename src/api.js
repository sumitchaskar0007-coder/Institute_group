// frontend/src/api.js
import axios from 'axios';

// For Vite
const API_URL = import.meta.env.VITE_API_URL;

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests if it exists
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('adminToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Auth APIs
export const loginAdmin = (credentials) => api.post('/auth/login', credentials);
export const getAdminProfile = () => api.get('/auth/profile');

// Gallery APIs
// Update gallery functions in api.js
// Gallery APIs - Updated
export const getGalleryImages = async () => {
  const response = await api.get('/gallery');
  // Transform backend response to array for frontend compatibility
  if (response.data && response.data.items) {
    return { data: response.data.items };
  }
  return response;
};

export const createGalleryImage = async (data) => {
  // Determine which endpoint to use based on media type and input method
  const mediaType = data.get('mediaType');
  const hasFile = data.has('media') && data.get('media');
  const hasUrl = data.has('mediaUrl') && data.get('mediaUrl');
  
  if (hasFile) {
    // File upload - use appropriate endpoint
    const endpoint = mediaType === 'video' ? '/gallery/video' : '/gallery/image';
    return await api.post(endpoint, data, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  } else if (hasUrl) {
    // URL upload
    const urlData = {
      title: data.get('title'),
      description: data.get('description'),
      type: mediaType,
      url: data.get('mediaUrl'),
      category: data.get('category')
    };
    return await api.post('/gallery/from-url', urlData);
  }
  
  throw new Error('No media provided');
};

export const updateGalleryImage = async (id, data) => {
  // For updates, convert FormData to JSON since backend update doesn't handle files
  const updateData = {
    title: data.get('title'),
    description: data.get('description'),
    category: data.get('category'),
    type: data.get('mediaType')
  };
  
  return await api.put(`/gallery/${id}`, updateData);
};

export const deleteGalleryImage = (id) => api.delete(`/gallery/${id}`);
// Announcement APIs
export const getAnnouncements = () => api.get('/announcements');
export const getAnnouncementById = (id) => api.get(`/announcements/${id}`);
export const createAnnouncement = (data) => api.post('/announcements', data);
export const updateAnnouncement = (id, data) => api.put(`/announcements/${id}`, data);
export const deleteAnnouncement = (id) => api.delete(`/announcements/${id}`);

export const getResponseList = (response, key) => {
  const payload = response?.data;

  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.[key])) return payload[key];
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.data?.[key])) return payload.data[key];
  if (Array.isArray(payload?.results)) return payload.results;

  return [];
};

// Notice APIs
export const getNotices = () => api.get('/notices');
export const getNoticeById = (id) => api.get(`/notices/${id}`);
export const createNotice = (data) => {
  const formData = new FormData();
  Object.keys(data).forEach(key => {
    if (key === 'file') {
      formData.append('file', data[key]);
    } else {
      formData.append(key, data[key]);
    }
  });
  return api.post('/notices', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
};
export const updateNotice = (id, data) => {
  const formData = new FormData();
  Object.keys(data).forEach(key => {
    if (key === 'file') {
      formData.append('file', data[key]);
    } else {
      formData.append(key, data[key]);
    }
  });
  return api.put(`/notices/${id}`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
};
export const deleteNotice = (id) => api.delete(`/notices/${id}`);

// Blog APIs
export const getBlogs = () => api.get('/blogs');
export const getBlogById = (id) => api.get(`/blogs/${id}`);
export const createBlog = (data) => {
  const formData = new FormData();
  Object.keys(data).forEach(key => {
    if (key === 'coverImage') {
      formData.append('coverImage', data[key]);
    } else {
      formData.append(key, data[key]);
    }
  });
  return api.post('/blogs', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
};
export const updateBlog = (id, data) => {
  const formData = new FormData();
  Object.keys(data).forEach(key => {
    if (key === 'coverImage') {
      formData.append('coverImage', data[key]);
    } else {
      formData.append(key, data[key]);
    }
  });
  return api.put(`/blogs/${id}`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
};
export const deleteBlog = (id) => api.delete(`/blogs/${id}`);

// Career APIs
export const getCareers = () => api.get('/careers');
export const getCareerById = (id) => api.get(`/careers/${id}`);
export const createCareer = (data) => api.post('/careers', data);
export const updateCareer = (id, data) => api.put(`/careers/${id}`, data);
export const deleteCareer = (id) => api.delete(`/careers/${id}`);

export default api;
