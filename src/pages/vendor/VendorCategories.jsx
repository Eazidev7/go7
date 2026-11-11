import React, { useEffect, useState, Fragment } from 'react';
import { useNavigate } from 'react-router-dom';
import { Dialog, Transition } from '@headlessui/react';
import { getAuth } from 'firebase/auth';
import { 
  getDoc, collection, query, getDocs, doc, addDoc, 
  updateDoc, deleteDoc, serverTimestamp, where, Timestamp
} from 'firebase/firestore';
import { vendorDoc } from '../../lib/vendorRefs';
import { db } from '../../lib/firebase';
import VendorLayout from '../../components/vendor/VendorLayout';
import { toast } from 'react-hot-toast';

// Category type definition
/**
 * @typedef {Object} Category
 * @property {string} id
 * @property {string} name
 * @property {string} slug
 * @property {Object} createdAt
 */

/**
 * @typedef {Object} CategoryFormData
 * @property {string} [id]
 * @property {string} name
 * @property {string} slug
 */

const initialFormData = {
  name: '',
  slug: '',
};

const VendorCategories = () => {
  const [vendor, setVendor] = useState(null);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState(initialFormData);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState(null);
  
  const auth = getAuth();
  const navigate = useNavigate();

  // Fetch vendor data and categories
  useEffect(() => {
    const fetchVendorData = async () => {
      try {
        const user = auth.currentUser;
        
        if (!user) {
          navigate('/vendor/login');
          return;
        }
        
        const vendorId = user.uid;
        const vendorSnapshot = await getDoc(vendorDoc(vendorId));
        
        if (!vendorSnapshot.exists()) {
          console.error('No vendor profile found');
          auth.signOut();
          navigate('/vendor/login');
          return;
        }
        
        setVendor(vendorSnapshot.data());
        
        // Fetch vendor's categories
        await fetchCategories(vendorId);
        
      } catch (error) {
        console.error('Error fetching vendor data:', error);
        setLoading(false);
      }
    };
    
    fetchVendorData();
  }, [auth, navigate]);

  // Fetch categories
  const fetchCategories = async (vendorId) => {
    try {
      const categoriesCollection = collection(db, `vendors/${vendorId}/categories`);
      const categoriesSnapshot = await getDocs(categoriesCollection);
      const categoriesList = [];
      
      categoriesSnapshot.forEach((doc) => {
        categoriesList.push({ id: doc.id, ...doc.data() });
      });
      
      setCategories(categoriesList);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching categories:', error);
      toast.error('Failed to load categories');
      setLoading(false);
    }
  };

  // Generate slug from name
  const generateSlug = (name) => {
    return name
      .toLowerCase()
      .replace(/[^\w\s-]/g, '') // Remove special characters
      .replace(/\s+/g, '-') // Replace spaces with hyphens
      .replace(/--+/g, '-') // Replace multiple hyphens with single hyphen
      .trim();
  };

  // Open add category modal
  const openAddCategoryModal = () => {
    setFormData(initialFormData);
    setIsEditing(false);
    setErrors({});
    setModalOpen(true);
  };

  // Open edit category modal
  const editCategory = (category) => {
    setFormData({
      id: category.id,
      name: category.name,
      slug: category.slug,
    });
    
    setIsEditing(true);
    setErrors({});
    setModalOpen(true);
  };
  
  // Close modal
  const closeModal = () => {
    setModalOpen(false);
    // Reset form after a short delay to allow modal animation
    setTimeout(() => {
      setFormData(initialFormData);
      setErrors({});
      setIsEditing(false);
    }, 200);
  };

  // Handle input change in form
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    
    if (name === 'name') {
      // Auto-generate slug when name changes
      setFormData({ 
        ...formData, 
        name: value,
        slug: generateSlug(value)
      });
    } else {
      setFormData({ ...formData, [name]: value });
    }
  };

  // Manual slug editing
  const handleSlugChange = (e) => {
    const value = e.target.value;
    // Ensure slug is valid (lowercase, no spaces, only hyphens as separators)
    const validSlug = value
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/--+/g, '-');
    
    setFormData({ ...formData, slug: validSlug });
  };

  // Validate form
  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    }
    
    if (!formData.slug.trim()) {
      newErrors.slug = 'Slug is required';
    }
    
    // Check if slug is unique (except for the current category being edited)
    const slugExists = categories.some(
      category => category.slug === formData.slug && category.id !== formData.id
    );
    
    if (slugExists) {
      newErrors.slug = 'This slug is already in use';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Submit form
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    setSubmitting(true);
    
    try {
      const user = auth.currentUser;
      if (!user) throw new Error('Not authenticated');
      
      const categoryData = {
        name: formData.name.trim(),
        slug: formData.slug.trim(),
        updatedAt: serverTimestamp()
      };
      
      if (isEditing && formData.id) {
        // Update existing category
        const categoryRef = doc(db, `vendors/${user.uid}/categories/${formData.id}`);
        await updateDoc(categoryRef, categoryData);
        
        // Update categories state
        setCategories(categories.map(c => 
          c.id === formData.id ? { ...c, ...categoryData, id: formData.id } : c
        ));
        
        toast.success('Category updated successfully');
      } else {
        // Add new category
        const categoriesCollection = collection(db, `vendors/${user.uid}/categories`);
        const docRef = await addDoc(categoriesCollection, {
          ...categoryData,
          createdAt: serverTimestamp()
        });
        
        // Update categories state
        const newCategory = {
          id: docRef.id,
          ...categoryData,
          createdAt: Timestamp.now()
        };
        
        setCategories([...categories, newCategory]);
        
        toast.success('Category added successfully');
      }
      
      // Close modal and reset form
      closeModal();
    } catch (error) {
      console.error('Error saving category:', error);
      toast.error('Failed to save category. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // Open delete confirmation
  const openDeleteConfirm = (category) => {
    setCategoryToDelete(category);
    setDeleteConfirmOpen(true);
  };

  // Close delete confirmation
  const closeDeleteConfirm = () => {
    setCategoryToDelete(null);
    setDeleteConfirmOpen(false);
  };

  // Check if a category is used by any products
  const checkCategoryInUse = async (categoryId) => {
    try {
      const user = auth.currentUser;
      if (!user) throw new Error('Not authenticated');
      
      // Query products that reference this category
      const productsCollection = collection(db, `vendors/${user.uid}/products`);
      const q = query(productsCollection, where("category", "==", categoryId));
      const querySnapshot = await getDocs(q);
      
      // If any products use this category, return true
      return !querySnapshot.empty;
    } catch (error) {
      console.error('Error checking category usage:', error);
      // If there's an error, assume it's in use to be safe
      return true;
    }
  };

  // Delete a category
  const handleDeleteCategory = async () => {
    if (!categoryToDelete) return;
    
    try {
      const user = auth.currentUser;
      if (!user) throw new Error('Not authenticated');
      
      // Check if category is used by any products
      const inUse = await checkCategoryInUse(categoryToDelete.id);
      
      if (inUse) {
        toast.error('Cannot delete category. It is used by one or more products.');
        closeDeleteConfirm();
        return;
      }
      
      // Delete category from Firestore
      const categoryRef = doc(db, `vendors/${user.uid}/categories/${categoryToDelete.id}`);
      await deleteDoc(categoryRef);
      
      // Update categories state
      setCategories(categories.filter(c => c.id !== categoryToDelete.id));
      
      toast.success('Category deleted successfully');
      closeDeleteConfirm();
    } catch (error) {
      console.error('Error deleting category:', error);
      toast.error('Failed to delete category. Please try again.');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
      </div>
    );
  }

  return (
    <VendorLayout vendor={vendor} title="Categories">
      <div className="sm:flex sm:items-center sm:justify-between">
        <div>
          <h3 className="text-lg leading-6 font-medium text-gray-900">Product Categories</h3>
          <p className="mt-1 text-sm text-gray-500">
            Manage categories for your products
          </p>
        </div>
        <div className="mt-4 sm:mt-0 sm:ml-16 sm:flex-none">
          <button
            type="button"
            onClick={openAddCategoryModal}
            className="inline-flex items-center justify-center rounded-md border border-transparent bg-red-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 sm:w-auto"
          >
            Add category
          </button>
        </div>
      </div>
      
      <div className="mt-8 flex flex-col">
        <div className="-my-2 -mx-4 overflow-x-auto sm:-mx-6 lg:-mx-8">
          <div className="inline-block min-w-full py-2 align-middle md:px-6 lg:px-8">
            <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
              <table className="min-w-full divide-y divide-gray-300">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-6">
                      Name
                    </th>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                      Slug
                    </th>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                      Created
                    </th>
                    <th scope="col" className="relative py-3.5 pl-3 pr-4 sm:pr-6">
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {categories.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-500 sm:pl-6 text-center">
                        No categories found. Add your first category to get started.
                      </td>
                    </tr>
                  ) : (
                    categories.map((category) => (
                      <tr key={category.id}>
                        <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-6">
                          {category.name}
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                          {category.slug}
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                          {category.createdAt?.toDate()?.toLocaleDateString() || 'N/A'}
                        </td>
                        <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                          <div className="flex justify-end space-x-4">
                            <button
                              type="button"
                              className="text-indigo-600 hover:text-indigo-900"
                              onClick={() => editCategory(category)}
                            >
                              Edit
                            </button>
                            <button 
                              type="button"
                              className="text-red-600 hover:text-red-900"
                              onClick={() => openDeleteConfirm(category)}
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Add/Edit Category Modal */}
      <Transition appear show={modalOpen} as={Fragment}>
        <Dialog as="div" className="relative z-10" onClose={closeModal}>
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-black bg-opacity-25" />
          </Transition.Child>

          <div className="fixed inset-0 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4 text-center">
              <Transition.Child
                as={Fragment}
                enter="ease-out duration-300"
                enterFrom="opacity-0 scale-95"
                enterTo="opacity-100 scale-100"
                leave="ease-in duration-200"
                leaveFrom="opacity-100 scale-100"
                leaveTo="opacity-0 scale-95"
              >
                <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all">
                  <Dialog.Title
                    as="h3"
                    className="text-lg font-medium leading-6 text-gray-900"
                  >
                    {isEditing ? 'Edit Category' : 'Add New Category'}
                  </Dialog.Title>
                  
                  <form onSubmit={handleSubmit} className="mt-4">
                    <div className="space-y-6">
                      <div>
                        <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                          Name *
                        </label>
                        <div className="mt-1">
                          <input
                            type="text"
                            name="name"
                            id="name"
                            value={formData.name}
                            onChange={handleInputChange}
                            className={`block w-full rounded-md border-gray-300 shadow-sm focus:border-red-500 focus:ring-red-500 sm:text-sm ${
                              errors.name ? 'border-red-300' : ''
                            }`}
                          />
                          {errors.name && (
                            <p className="mt-2 text-sm text-red-600">{errors.name}</p>
                          )}
                        </div>
                      </div>

                      <div>
                        <label htmlFor="slug" className="block text-sm font-medium text-gray-700">
                          Slug *
                        </label>
                        <div className="mt-1">
                          <input
                            type="text"
                            name="slug"
                            id="slug"
                            value={formData.slug}
                            onChange={handleSlugChange}
                            className={`block w-full rounded-md border-gray-300 shadow-sm focus:border-red-500 focus:ring-red-500 sm:text-sm ${
                              errors.slug ? 'border-red-300' : ''
                            }`}
                          />
                          {errors.slug && (
                            <p className="mt-2 text-sm text-red-600">{errors.slug}</p>
                          )}
                          <p className="mt-1 text-sm text-gray-500">
                            Used in URLs. Auto-generated from name, but you can edit it.
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="mt-6 flex justify-end">
                      <button
                        type="button"
                        onClick={closeModal}
                        className="mr-3 inline-flex justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={submitting}
                        className="inline-flex justify-center rounded-md border border-transparent bg-red-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:bg-gray-300 disabled:cursor-not-allowed"
                      >
                        {submitting ? 'Saving...' : isEditing ? 'Update Category' : 'Add Category'}
                      </button>
                    </div>
                  </form>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition>

      {/* Delete Confirmation Modal */}
      <Transition appear show={deleteConfirmOpen} as={Fragment}>
        <Dialog as="div" className="relative z-10" onClose={closeDeleteConfirm}>
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-black bg-opacity-25" />
          </Transition.Child>

          <div className="fixed inset-0 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4 text-center">
              <Transition.Child
                as={Fragment}
                enter="ease-out duration-300"
                enterFrom="opacity-0 scale-95"
                enterTo="opacity-100 scale-100"
                leave="ease-in duration-200"
                leaveFrom="opacity-100 scale-100"
                leaveTo="opacity-0 scale-95"
              >
                <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all">
                  <Dialog.Title
                    as="h3"
                    className="text-lg font-medium leading-6 text-gray-900"
                  >
                    Delete Category
                  </Dialog.Title>
                  <div className="mt-2">
                    <p className="text-sm text-gray-500">
                      Are you sure you want to delete <span className="font-medium text-gray-800">{categoryToDelete?.name}</span>? This action cannot be undone.
                    </p>
                    <p className="mt-2 text-sm text-gray-500">
                      Note: Categories that are in use by products cannot be deleted.
                    </p>
                  </div>

                  <div className="mt-6 flex justify-end">
                    <button
                      type="button"
                      className="mr-3 inline-flex justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
                      onClick={closeDeleteConfirm}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      className="inline-flex justify-center rounded-md border border-transparent bg-red-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
                      onClick={handleDeleteCategory}
                    >
                      Delete
                    </button>
                  </div>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition>
    </VendorLayout>
  );
};

export default VendorCategories;
