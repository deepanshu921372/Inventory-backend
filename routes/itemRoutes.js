const express = require('express');
const router = express.Router();
const Item = require('../models/Item');
const User = require('../models/User');
const authMiddleware = require('../middleware/authMiddleware');
const { appendToCSV } = require('../utils/csvUtils');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const upload = require('../middleware/multer'); // Use the multer middleware

// Multer setup
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/");
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  },
});
const uploadMulter = multer({ storage });

// Add a new item
// router.post('/', authMiddleware, async (req, res) => {
//   const { name, quantity } = req.body;
//   const userId = req.user.id;

//   try {
//     const user = await User.findById(userId);
//     const newItem = new Item({ name, quantity, address: user.address });
//     await newItem.save();
//     appendToCSV(newItem); // Append to CSV
//     res.status(201).json(newItem);
//   } catch (error) {
//     res.status(500).json({ error: 'Failed to add item' });
//   }
// });

// Get all items
router.get('/', authMiddleware, async (req, res) => {
  const userId = req.user.id;

  try {
    const user = await User.findById(userId);
    const items = await Item.find({ address: user.address });
    res.json(items);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch items' });
  }
});

// Get the three most recently added items
router.get('/recent', authMiddleware, async (req, res) => {
  const userId = req.user.id;

  try {
    const user = await User.findById(userId);
    const items = await Item.find({ address: user.address })
      .sort({ dateAdded: -1 }) // Sort by dateAdded in descending order
      .limit(3); // Limit to 3 items
    res.json(items);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch recent items' });
  }
});

// Decrease item quantity or delete item if quantity is one
router.delete('/:id', authMiddleware, async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;

  try {
    const user = await User.findById(userId);
    const item = await Item.findOne({ _id: id, address: user.address });

    if (!item) {
      return res.status(404).json({ error: 'Item not found' });
    }

    if (item.quantity > 1) {
      item.quantity -= 1;
      await item.save();
      res.json({ message: 'Item quantity decreased', item });
    } else {
      await Item.deleteOne({ _id: id });
      res.json({ message: 'Item deleted successfully' });
    }
  } catch (error) {
    console.error('Failed to delete item:', error);
    res.status(500).json({ error: 'Failed to delete item' });
  }
});

// Update an item
router.put('/:id', authMiddleware, async (req, res) => {
  const { id } = req.params;
  const { name, quantity } = req.body;
  const userId = req.user.id;

  try {
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (quantity === 0) {
      // If quantity is 0, delete the item
      const deletedItem = await Item.findOneAndDelete({ _id: id, address: user.address });
      if (!deletedItem) {
        return res.status(404).json({ error: 'Item not found' });
      }
      return res.status(200).json({ message: 'Item deleted successfully' });
    }

    const item = await Item.findOneAndUpdate(
      { _id: id, address: user.address },
      { name, quantity },
      { new: true } // Return the updated document
    );

    if (!item) {
      return res.status(404).json({ error: 'Item not found' });
    }

    res.status(200).json({ message: 'Item updated successfully', item });
  } catch (error) {
    console.error('Failed to update item:', error.message);
    res.status(500).json({ error: 'Failed to update item' });
  }
});

// Bulk add items from file
router.post('/bulk', authMiddleware, async (req, res) => {
  const userId = req.user.id;
  const itemsData = req.body;

  try {
    const user = await User.findById(userId);
    const items = itemsData.map(item => ({
      name: item['Item Name'],
      quantity: item['Quantity Purchased'],
      dateAdded: item['Date Added'] ? new Date(item['Date Added']) : new Date(),
      address: user.address
    }));

    const newItems = await Item.insertMany(items);
    newItems.forEach(item => appendToCSV(item)); // Append each item to CSV
    res.status(201).json(newItems);
  } catch (error) {
    console.error('Failed to add items from file:', error);
    res.status(500).json({ error: 'Failed to add items from file' });
  }
});

// Serve uploaded files
router.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Example route using multer
router.post('/upload', uploadMulter.single('file'), (req, res) => {
  try {
    res.status(200).json({ message: 'File uploaded successfully', file: req.file });
  } catch (error) {
    res.status(500).json({ error: 'Failed to upload file' });
  }
});

router.post('/upload', uploadMulter.single('image'), async (req, res) => {
  try {
    const newItem = new Item({
      image: req.file.path, // Store the path to the uploaded image
      // Add other fields as necessary
    });
    await newItem.save();
    res.status(200).json({ message: 'Image uploaded and saved successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to upload and save image' });
  }
});

router.post('/add-item', authMiddleware, upload.single('image'), async (req, res) => {
  const { name, quantity, userAddress } = req.body;
  const userId = req.user.id;

  try {
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const newItem = new Item({
      name,
      quantity,
      imageUrl: req.file.path, // Store the path to the uploaded image
      address: userAddress || user.address,
      dateAdded: new Date()
    });

    await newItem.save();
    res.status(201).json(newItem);
  } catch (error) {
    console.error('Error adding item:', error.message);
    res.status(500).json({ error: 'Failed to add item' });
  }
});

// // Add New Item
// router.post('/add', async (req, res) => {
//   try {
//     const { name, qty, imageUrl } = req.body;

//     if (!name || !qty || !imageUrl) {
//       return res.status(400).json({ error: 'All fields are required' });
//     }

//     const newItem = new Item({
//       name,
//       qty,
//       imageUrl,
//     });

//     await newItem.save();
//     res.status(201).json({ message: 'Item added successfully', item: newItem });
//   } catch (error) {
//     res.status(500).json({ error: 'Internal Server Error' });
//   }
// });

// Delete Item (Soft Delete)
router.put('/delete/:id', async (req, res) => {
  try {
    const itemId = req.params.id;
    const item = await Item.findById(itemId);

    if (!item) {
      return res.status(404).json({ error: 'Item not found' });
    }

    const now = new Date();

    // Update dateDeleted and push to dateDeletedArray
    item.dateDeleted = now;
    item.dateDeletedArray.push(now);

    await item.save();
    res.status(200).json({ message: 'Item deleted successfully', item });
  } catch (error) {
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Get All Items
router.get('/all', async (req, res) => {
  try {
    const items = await Item.find();
    res.status(200).json(items);
  } catch (error) {
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

module.exports = router;