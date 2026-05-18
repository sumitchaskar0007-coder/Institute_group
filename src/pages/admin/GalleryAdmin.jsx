// frontend/src/pages/admin/GalleryAdmin.jsx
import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import {
  getGalleryImages,
  createGalleryImage,
  createGalleryImageFromUrl,
  updateGalleryImage,
  deleteGalleryImage
} from '../../api';

const GalleryAdmin = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [inputMethod, setInputMethod] = useState('file'); // 'file' or 'url'
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorDetails, setErrorDetails] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'general',
    mediaType: 'image',
    media: null,
    mediaUrl: ''
  });

  useEffect(() => {
    fetchItems();
  }, []);

  const fetchItems = async () => {
    try {
      setLoading(true);
      const response = await getGalleryImages();
      
      // Handle different response formats from backend
      let galleryData = [];
      
      if (response?.data) {
        if (Array.isArray(response.data)) {
          galleryData = response.data;
        } else if (response.data.items && Array.isArray(response.data.items)) {
          galleryData = response.data.items;
        } else if (response.data.data && Array.isArray(response.data.data)) {
          galleryData = response.data.data;
        } else {
          // If it's a single object, try to convert to array
          galleryData = [response.data].filter(item => item && item._id);
        }
      } else if (Array.isArray(response)) {
        galleryData = response;
      }
      
      // Ensure we're setting an array
      setItems(Array.isArray(galleryData) ? galleryData : []);
    } catch (error) {
      console.error('Fetch error:', error);
      toast.error('Failed to fetch gallery items');
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value, files } = e.target;
    if (name === 'media') {
      const file = files[0];
      if (file) {
        // Validate file size
        const maxSize = formData.mediaType === 'video' ? 100 * 1024 * 1024 : 10 * 1024 * 1024; // 100MB for video, 10MB for image
        if (file.size > maxSize) {
          toast.error(`File size too large. Maximum ${maxSize / (1024 * 1024)}MB allowed.`);
          return;
        }
        
        // Validate file type
        const validImageTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
        const validVideoTypes = ['video/mp4', 'video/webm', 'video/ogg', 'video/quicktime'];
        const validTypes = formData.mediaType === 'video' ? validVideoTypes : validImageTypes;
        
        if (!validTypes.includes(file.type)) {
          toast.error(`Invalid file type. Please upload ${formData.mediaType === 'video' ? 'video' : 'image'} files only.`);
          return;
        }
        
        setFormData({ ...formData, media: file, mediaUrl: '' });
      }
    } else {
      setFormData({ ...formData, [name]: value });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Reset error details
    setErrorDetails(null);
    
    // Validate based on input method
    if (inputMethod === 'url' && !formData.mediaUrl) {
      toast.error('Please enter a URL');
      return;
    }
    if (inputMethod === 'file' && !formData.media && !editingItem) {
      toast.error('Please select a file');
      return;
    }

    // Validate title
    if (!formData.title || formData.title.trim() === '') {
      toast.error('Title is required');
      return;
    }

    setIsSubmitting(true);
    setUploadProgress(0);

    try {
      if (editingItem) {
        // For updates, send JSON
        const updateData = {
          title: formData.title,
          description: formData.description,
          category: formData.category,
          mediaType: formData.mediaType,
          ...(inputMethod === 'url' && formData.mediaUrl && { mediaUrl: formData.mediaUrl })
        };
        
        console.log('Updating item with data:', updateData);
        const response = await updateGalleryImage(editingItem._id, updateData);
        console.log('Update response:', response);
        
        toast.success('Item updated successfully');
      } else {
        if (inputMethod === 'url') {
          // For URL uploads
          const urlData = {
            title: formData.title,
            description: formData.description,
            category: formData.category,
            mediaType: formData.mediaType,
            mediaUrl: formData.mediaUrl
          };
          
          console.log('Creating item from URL with data:', urlData);
          const response = await createGalleryImageFromUrl(urlData);
          console.log('URL upload response:', response);
          
          toast.success('Item added successfully via URL');
        } else {
          // For file uploads - FIXED: Use 'file' as field name instead of 'media'
          const submitData = new FormData();
          submitData.append('title', formData.title);
          submitData.append('description', formData.description);
          submitData.append('category', formData.category);
          submitData.append('mediaType', formData.mediaType);
          
          if (formData.media) {
            // IMPORTANT FIX: Backend expects 'file' not 'media'
            submitData.append('file', formData.media);
            console.log('File details:', {
              name: formData.media.name,
              type: formData.media.type,
              size: `${(formData.media.size / (1024 * 1024)).toFixed(2)}MB`
            });
          }
          
          console.log('Creating item from file upload');
          const response = await createGalleryImage(submitData);
          console.log('File upload response:', response);
          
          toast.success('Item added successfully via file upload');
        }
      }
      
      setShowModal(false);
      resetForm();
      await fetchItems(); // Refresh the list
    } catch (error) {
      console.error('Submit error - Full error object:', error);
      console.error('Error response:', error.response);
      console.error('Error request:', error.request);
      console.error('Error message:', error.message);
      
      // Extract detailed error information
      let errorMessage = 'Operation failed';
      let errorDetailsObj = {
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        message: error.message
      };
      
      if (error.response) {
        // Server responded with error status
        console.error('Error status:', error.response.status);
        console.error('Error data:', error.response.data);
        
        if (error.response.data) {
          if (typeof error.response.data === 'string') {
            errorMessage = error.response.data;
          } else if (error.response.data.message) {
            errorMessage = error.response.data.message;
          } else if (error.response.data.error) {
            errorMessage = error.response.data.error;
          } else {
            errorMessage = JSON.stringify(error.response.data);
          }
        } else {
          errorMessage = `Server error: ${error.response.status} - ${error.response.statusText}`;
        }
        
        // Set error details for display in modal
        setErrorDetails(errorDetailsObj);
      } else if (error.request) {
        // Request was made but no response
        errorMessage = 'No response from server. Please check your network connection.';
        console.error('Request made but no response:', error.request);
        setErrorDetails({
          message: errorMessage,
          request: error.request
        });
      } else {
        // Something else happened
        errorMessage = error.message || 'An unexpected error occurred';
        setErrorDetails({
          message: errorMessage,
          error: error
        });
      }
      
      toast.error(errorMessage, {
        duration: 5000, // Show for 5 seconds
        icon: '❌'
      });
      
      // If we have detailed error information, show a more informative toast
      if (error.response?.data?.details) {
        toast.error(`Details: ${error.response.data.details}`, {
          duration: 7000,
          icon: '🔍'
        });
      }
    } finally {
      setIsSubmitting(false);
      setUploadProgress(0);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this item? This action cannot be undone.')) {
      try {
        console.log('Deleting item:', id);
        await deleteGalleryImage(id);
        toast.success('Item deleted successfully');
        await fetchItems(); // Refresh the list
      } catch (error) {
        console.error('Delete error:', error);
        console.error('Delete error response:', error.response);
        
        let errorMessage = 'Failed to delete item';
        if (error.response?.data?.message) {
          errorMessage = error.response.data.message;
        } else if (error.message) {
          errorMessage = error.message;
        }
        
        toast.error(errorMessage);
      }
    }
  };

  const handleEdit = (item) => {
    console.log('Editing item:', item);
    setEditingItem(item);
    setFormData({
      title: item.title || '',
      description: item.description || '',
      category: item.category || 'general',
      mediaType: item.type || item.mediaType || 'image',
      media: null,
      mediaUrl: item.url || item.mediaUrl || ''
    });
    // Set input method based on whether it has a URL or not
    setInputMethod(item.url || item.mediaUrl ? 'url' : 'file');
    setShowModal(true);
    setErrorDetails(null);
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      category: 'general',
      mediaType: 'image',
      media: null,
      mediaUrl: ''
    });
    setEditingItem(null);
    setInputMethod('file');
    setErrorDetails(null);
    setIsSubmitting(false);
  };

  // Helper function to get embed URL for YouTube/Vimeo
  const getEmbedUrl = (url) => {
    if (!url) return '';
    
    // YouTube
    const youtubeRegex = /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/;
    const youtubeMatch = url.match(youtubeRegex);
    if (youtubeMatch) {
      return `https://www.youtube.com/embed/${youtubeMatch[1]}`;
    }
    
    // Vimeo
    const vimeoRegex = /vimeo\.com\/(\d+)/;
    const vimeoMatch = url.match(vimeoRegex);
    if (vimeoMatch) {
      return `https://player.vimeo.com/video/${vimeoMatch[1]}`;
    }
    
    return url;
  };

  // Render media preview for gallery items
  const renderMediaPreview = (item) => {
    if (!item) return null;
    
    // Get the correct URL and type
    const mediaUrl = item.url || item.mediaUrl;
    const mediaType = item.type || item.mediaType;
    
    if (mediaType === 'video') {
      // Check if it's a YouTube/Vimeo URL
      const isYouTube = mediaUrl && (mediaUrl.includes('youtube.com') || mediaUrl.includes('youtu.be'));
      const isVimeo = mediaUrl && mediaUrl.includes('vimeo.com');
      
      if (isYouTube || isVimeo) {
        const embedUrl = getEmbedUrl(mediaUrl);
        return (
          <div className="w-full h-48 bg-gray-900 relative">
            <iframe
              src={embedUrl}
              className="w-full h-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              title={item.title || 'Video'}
            />
          </div>
        );
      } else if (mediaUrl) {
        return (
          <video
            src={mediaUrl}
            className="w-full h-48 object-cover"
            controls
            preload="metadata"
          >
            <source src={mediaUrl} type="video/mp4" />
            <source src={mediaUrl} type="video/webm" />
            <source src={mediaUrl} type="video/ogg" />
            Your browser does not support the video tag.
          </video>
        );
      } else {
        return (
          <div className="w-full h-48 bg-gray-200 flex items-center justify-center">
            <span className="text-gray-500">Video not available</span>
          </div>
        );
      }
    } else {
      return (
        <img
          src={mediaUrl || 'https://via.placeholder.com/400x300?text=No+Image'}
          alt={item.title || 'Gallery item'}
          className="w-full h-48 object-cover"
          onError={(e) => {
            e.target.onerror = null;
            e.target.src = 'https://via.placeholder.com/400x300?text=Image+Not+Found';
          }}
        />
      );
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-xl text-gray-600 mb-4">Loading gallery items...</div>
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Gallery Management</h1>
          <button
            onClick={() => {
              resetForm();
              setShowModal(true);
            }}
            className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 transition-colors"
          >
            Add New Item
          </button>
        </div>

        {/* Items Grid */}
        {items && items.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {items.map((item) => (
              <div key={item._id || Math.random()} className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow">
                {renderMediaPreview(item)}
                <div className="p-4">
                  <div className="flex justify-between items-start">
                    <h3 className="text-lg font-semibold text-gray-900">{item.title || 'Untitled'}</h3>
                    <span className={`text-xs px-2 py-1 rounded ${
                      (item.type === 'video' || item.mediaType === 'video') 
                        ? 'bg-blue-100 text-blue-800' 
                        : 'bg-green-100 text-green-800'
                    }`}>
                      {item.type || item.mediaType || 'image'}
                    </span>
                  </div>
                  {item.description && (
                    <p className="text-gray-600 mt-1 text-sm line-clamp-2">{item.description}</p>
                  )}
                  <div className="mt-2">
                    <span className="inline-block bg-gray-200 rounded-full px-3 py-1 text-sm font-semibold text-gray-700">
                      {item.category || 'general'}
                    </span>
                  </div>
                  <div className="mt-4 flex space-x-2">
                    <button
                      onClick={() => handleEdit(item)}
                      className="bg-blue-500 text-white px-3 py-1 rounded-md hover:bg-blue-600 transition-colors"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(item._id)}
                      className="bg-red-500 text-white px-3 py-1 rounded-md hover:bg-red-600 transition-colors"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 bg-white rounded-lg shadow-md">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <p className="text-gray-500 text-lg mt-4">No gallery items found</p>
            <button
              onClick={() => {
                resetForm();
                setShowModal(true);
              }}
              className="mt-4 bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 transition-colors"
            >
              Add Your First Item
            </button>
          </div>
        )}

        {/* Modal for Add/Edit */}
        {showModal && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border w-full max-w-md shadow-lg rounded-md bg-white">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium leading-6 text-gray-900">
                  {editingItem ? 'Edit Item' : 'Add New Item'}
                </h3>
                <button
                  onClick={() => setShowModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ×
                </button>
              </div>
              
              {/* Error Details Display */}
              {errorDetails && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
                  <p className="text-sm font-semibold text-red-800 mb-2">Error Details:</p>
                  <pre className="text-xs text-red-700 overflow-auto max-h-32">
                    {JSON.stringify(errorDetails, null, 2)}
                  </pre>
                </div>
              )}
              
              <form onSubmit={handleSubmit}>
                <div className="mb-4">
                  <label className="block text-gray-700 text-sm font-bold mb-2">
                    Title *
                  </label>
                  <input
                    type="text"
                    name="title"
                    value={formData.title}
                    onChange={handleChange}
                    required
                    className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                    placeholder="Enter title"
                  />
                </div>
                
                <div className="mb-4">
                  <label className="block text-gray-700 text-sm font-bold mb-2">
                    Description
                  </label>
                  <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleChange}
                    rows="3"
                    className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                    placeholder="Enter description (optional)"
                  />
                </div>
                
                <div className="mb-4">
                  <label className="block text-gray-700 text-sm font-bold mb-2">
                    Category
                  </label>
                  <select
                    name="category"
                    value={formData.category}
                    onChange={handleChange}
                    className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                  >
                    <option value="general">General</option>
                    <option value="events">Events</option>
                    <option value="campus">Campus</option>
                    <option value="students">Students</option>
                    <option value="videos">Videos</option>
                  </select>
                </div>

                <div className="mb-4">
                  <label className="block text-gray-700 text-sm font-bold mb-2">
                    Media Type *
                  </label>
                  <select
                    name="mediaType"
                    value={formData.mediaType}
                    onChange={handleChange}
                    required
                    className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                  >
                    <option value="image">Image</option>
                    <option value="video">Video</option>
                  </select>
                </div>

                {!editingItem && (
                  <div className="mb-4">
                    <label className="block text-gray-700 text-sm font-bold mb-2">
                      Input Method
                    </label>
                    <div className="flex space-x-4">
                      <label className="inline-flex items-center">
                        <input
                          type="radio"
                          value="file"
                          checked={inputMethod === 'file'}
                          onChange={() => setInputMethod('file')}
                          className="form-radio"
                        />
                        <span className="ml-2">Upload File</span>
                      </label>
                      <label className="inline-flex items-center">
                        <input
                          type="radio"
                          value="url"
                          checked={inputMethod === 'url'}
                          onChange={() => setInputMethod('url')}
                          className="form-radio"
                        />
                        <span className="ml-2">Enter URL</span>
                      </label>
                    </div>
                  </div>
                )}

                {inputMethod === 'file' ? (
                  <div className="mb-4">
                    <label className="block text-gray-700 text-sm font-bold mb-2">
                      {formData.mediaType === 'video' ? 'Video File' : 'Image File'} {!editingItem && '*'}
                    </label>
                    <input
                      type="file"
                      name="media"
                      onChange={handleChange}
                      accept={formData.mediaType === 'video' ? 'video/*' : 'image/*'}
                      required={!editingItem}
                      className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                    />
                    {formData.mediaType === 'video' && (
                      <p className="text-xs text-gray-500 mt-1">
                        Supported formats: MP4, WebM, OGG, MOV, AVI (Max 100MB)
                      </p>
                    )}
                    {formData.mediaType === 'image' && (
                      <p className="text-xs text-gray-500 mt-1">
                        Supported formats: JPG, JPEG, PNG, GIF, WEBP (Max 10MB)
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="mb-4">
                    <label className="block text-gray-700 text-sm font-bold mb-2">
                      {formData.mediaType === 'video' ? 'Video URL' : 'Image URL'} {!editingItem && '*'}
                    </label>
                    <input
                      type="url"
                      name="mediaUrl"
                      value={formData.mediaUrl}
                      onChange={handleChange}
                      placeholder={formData.mediaType === 'video' 
                        ? 'https://youtube.com/watch?v=... or https://vimeo.com/... or direct video URL' 
                        : 'https://example.com/image.jpg'}
                      required={!editingItem}
                      className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                    />
                    {formData.mediaType === 'video' && (
                      <div className="text-xs text-gray-500 mt-1">
                        <p>Supports:</p>
                        <ul className="list-disc list-inside ml-2">
                          <li>YouTube URLs (youtube.com/watch?v=...)</li>
                          <li>YouTube Short URLs (youtu.be/...)</li>
                          <li>Vimeo URLs (vimeo.com/...)</li>
                          <li>Direct video URLs (MP4, WebM, etc.)</li>
                        </ul>
                      </div>
                    )}
                  </div>
                )}

                {/* Upload Progress */}
                {isSubmitting && uploadProgress > 0 && (
                  <div className="mb-4">
                    <div className="bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-indigo-600 rounded-full h-2 transition-all duration-300"
                        style={{ width: `${uploadProgress}%` }}
                      />
                    </div>
                    <p className="text-xs text-gray-600 mt-1 text-center">
                      Uploading... {uploadProgress}%
                    </p>
                  </div>
                )}

                <div className="flex justify-end space-x-2 mt-6">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="bg-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-400 transition-colors"
                    disabled={isSubmitting}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? 'Processing...' : (editingItem ? 'Update' : 'Add')}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default GalleryAdmin;