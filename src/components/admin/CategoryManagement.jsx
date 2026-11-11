import React, { useState, useEffect } from 'react';
import { 
  collection, 
  getDocs, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc,
  serverTimestamp 
} from 'firebase/firestore';
import { db } from '../../services/firebase';
import { 
  Card, 
  CardContent, 
  Typography, 
  Button, 
  TextField, 
  Dialog, 
  DialogTitle, 
  DialogContent, 
  DialogActions,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip
} from '@mui/material';
import { Edit as EditIcon, Delete as DeleteIcon, Add as AddIcon } from '@mui/icons-material';

function CategoryManagement() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    icon: '',
    image: '',
    bgColor: '',
    route: '',
    sortOrder: 0,
    isActive: true
  });

  // Fetch categories
  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      setLoading(true);
      const categoriesSnapshot = await getDocs(collection(db, 'categories'));
      const categoriesData = categoriesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      // Sort by sortOrder
      categoriesData.sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
      
      setCategories(categoriesData);
    } catch (error) {
      console.error('Error fetching categories:', error);
      alert('Failed to fetch categories');
    } finally {
      setLoading(false);
    }
  };

  // Open dialog for new category
  const handleAddNew = () => {
    setEditingCategory(null);
    setFormData({
      name: '',
      description: '',
      icon: '',
      image: '',
      bgColor: '#FFE5D9',
      route: '',
      sortOrder: categories.length,
      isActive: true
    });
    setDialogOpen(true);
  };

  // Open dialog for editing
  const handleEdit = (category) => {
    setEditingCategory(category);
    setFormData({
      name: category.name || '',
      description: category.description || '',
      icon: category.icon || '',
      image: category.image || '',
      bgColor: category.bgColor || '#FFE5D9',
      route: category.route || '',
      sortOrder: category.sortOrder || 0,
      isActive: category.isActive !== false
    });
    setDialogOpen(true);
  };

  // Handle form changes
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  // Save category
  const handleSave = async () => {
    if (!formData.name.trim()) {
      alert('Category name is required');
      return;
    }

    try {
      const categoryData = {
        ...formData,
        sortOrder: parseInt(formData.sortOrder) || 0,
        updatedAt: serverTimestamp()
      };

      if (editingCategory) {
        // Update existing category
        await updateDoc(doc(db, 'categories', editingCategory.id), categoryData);
        alert('Category updated successfully');
      } else {
        // Add new category
        categoryData.createdAt = serverTimestamp();
        await addDoc(collection(db, 'categories'), categoryData);
        alert('Category added successfully');
      }

      setDialogOpen(false);
      fetchCategories();
    } catch (error) {
      console.error('Error saving category:', error);
      alert('Failed to save category: ' + error.message);
    }
  };

  // Delete category
  const handleDelete = async (categoryId) => {
    if (!confirm('Are you sure you want to delete this category? This action cannot be undone.')) {
      return;
    }

    try {
      await deleteDoc(doc(db, 'categories', categoryId));
      alert('Category deleted successfully');
      fetchCategories();
    } catch (error) {
      console.error('Error deleting category:', error);
      alert('Failed to delete category: ' + error.message);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading categories...</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <Typography variant="h5" component="h2">
          Category Management
        </Typography>
        <Button
          variant="contained"
          color="primary"
          startIcon={<AddIcon />}
          onClick={handleAddNew}
        >
          Add New Category
        </Button>
      </div>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Icon</TableCell>
              <TableCell>Name</TableCell>
              <TableCell>Description</TableCell>
              <TableCell>Route</TableCell>
              <TableCell>Sort Order</TableCell>
              <TableCell>Status</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {categories.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} align="center">
                  <Typography color="textSecondary" className="py-8">
                    No categories found. Click "Add New Category" to create one.
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              categories.map((category) => (
                <TableRow key={category.id}>
                  <TableCell>
                    <div 
                      className="w-12 h-12 rounded-lg flex items-center justify-center text-2xl"
                      style={{ backgroundColor: category.bgColor || '#FFE5D9' }}
                    >
                      {category.icon || '📦'}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Typography variant="subtitle1" fontWeight="medium">
                      {category.name}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" color="textSecondary">
                      {category.description || '-'}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <code className="text-xs bg-gray-100 px-2 py-1 rounded">
                      {category.route || '-'}
                    </code>
                  </TableCell>
                  <TableCell>{category.sortOrder || 0}</TableCell>
                  <TableCell>
                    <Chip 
                      label={category.isActive !== false ? 'Active' : 'Inactive'}
                      color={category.isActive !== false ? 'success' : 'default'}
                      size="small"
                    />
                  </TableCell>
                  <TableCell align="right">
                    <IconButton
                      size="small"
                      color="primary"
                      onClick={() => handleEdit(category)}
                      title="Edit"
                    >
                      <EditIcon />
                    </IconButton>
                    <IconButton
                      size="small"
                      color="error"
                      onClick={() => handleDelete(category.id)}
                      title="Delete"
                    >
                      <DeleteIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          {editingCategory ? 'Edit Category' : 'Add New Category'}
        </DialogTitle>
        <DialogContent>
          <div className="space-y-4 pt-2">
            <TextField
              fullWidth
              label="Category Name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
              placeholder="e.g., Restaurants, Groceries"
            />
            
            <TextField
              fullWidth
              label="Description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              multiline
              rows={2}
              placeholder="Brief description of the category"
            />
            
            <TextField
              fullWidth
              label="Icon (Emoji)"
              name="icon"
              value={formData.icon}
              onChange={handleChange}
              placeholder="e.g., 🍕, 🛒, 💊"
            />
            
            <TextField
              fullWidth
              label="Image URL"
              name="image"
              value={formData.image}
              onChange={handleChange}
              placeholder="https://example.com/image.jpg"
            />
            
            <TextField
              fullWidth
              label="Background Color"
              name="bgColor"
              value={formData.bgColor}
              onChange={handleChange}
              type="color"
            />
            
            <TextField
              fullWidth
              label="Route"
              name="route"
              value={formData.route}
              onChange={handleChange}
              placeholder="/explore?category=restaurants"
            />
            
            <TextField
              fullWidth
              label="Sort Order"
              name="sortOrder"
              value={formData.sortOrder}
              onChange={handleChange}
              type="number"
            />
            
            <div className="flex items-center">
              <input
                type="checkbox"
                id="isActive"
                name="isActive"
                checked={formData.isActive}
                onChange={handleChange}
                className="mr-2"
              />
              <label htmlFor="isActive">Active (visible to users)</label>
            </div>
          </div>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleSave} variant="contained" color="primary">
            {editingCategory ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
}

export default CategoryManagement;
