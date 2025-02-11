const fs = require('fs');
const path = require('path');
const { format } = require('@fast-csv/format');

const csvFilePath = path.join(__dirname, '../data/items.csv');

// Ensure the CSV file and directory exist
if (!fs.existsSync(path.dirname(csvFilePath))) {
  fs.mkdirSync(path.dirname(csvFilePath), { recursive: true });
}

if (!fs.existsSync(csvFilePath)) {
  fs.writeFileSync(csvFilePath, 'name,quantity,dateAdded,address,dateDeleted,deletionDates\n');
}

const appendToCSV = (item) => {
  const csvStream = format({ headers: false });
  const writableStream = fs.createWriteStream(csvFilePath, { flags: 'a' });

  csvStream.pipe(writableStream).on('end', () => process.exit());

  csvStream.write({
    name: item.name,
    quantity: item.quantity,
    dateAdded: item.dateAdded.toISOString(),
    address: item.address,
    dateDeleted: item.dateDeleted ? item.dateDeleted.toISOString() : '',
    deletionDates: item.deletionDates.map(date => date.toISOString()).join(';')
  });

  csvStream.end();
};

module.exports = { appendToCSV }; 