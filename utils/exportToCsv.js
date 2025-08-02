const { stringify } = require('csv-stringify');
const {apiResponse} = require("../utils/apiResponse");

const exportToCsv = (res, data, columns, filename) => {
    const csvOptions = {
        header: true,
        columns: columns,
        cast: {
            string: (value) => value || 'N/A' // Handle null/undefined values
        }
    };

    // Convert data to CSV
    stringify(data, csvOptions, (err, csvContent) => {
        if (err) {
            console.error('Error generating CSV:', err);
            return apiResponse(res, {
                success: false,
                message: 'Error generating CSV',
                data: null,
                statusCode: 500,
            });
        }

        // Set headers for CSV download
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.status(200).send(csvContent);
    });
};

module.exports = {exportToCsv}