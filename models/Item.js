const mongoose = require("mongoose");

const ItemSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  quantity: {
    type: Number,
    required: true,
    min: 1,
  },
  dateAdded: {
    type: Date,
    default: Date.now,
  },
  dateDeleted: {
    type: Date,
    default: null,
  },
  dateDeletedArray: {
    type: [Date],
    default: [],
  },
  imageUrl: {
    type: String,
    required: false,
  },
  address: {
    type: String,
    required: true,
  },
});

const Item = mongoose.model("Item", ItemSchema);

module.exports = Item;
