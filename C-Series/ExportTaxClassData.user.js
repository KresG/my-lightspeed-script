// ==UserScript==
// @name         ExportTaxClassData
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  Fetch Excluded Product IDs, Category IDs Filtered, and Included Product IDs
// @author       Kres
// @match        */admin/collections/*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    // Function to fetch JSON data
    async function fetchJSON(url) {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Failed to fetch ${url}: ${response.statusText}`);
        }
        return response.json();
    }

    // Function to download CSV
    function downloadCSV(data, filename) {
        const blob = new Blob([data], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    }

    // Function to remove duplicates from an array
    function removeDuplicates(arr) {
        return [...new Set(arr)];
    }

    // Function to convert data to CSV format
    function convertToCSV(rows) {
        const csvRows = [];
        csvRows.push('smart_tax_excluded_products,excluded_products,smart_tax_filters_categories,included_products');  // CSV header

        const maxLength = Math.max(
            ...rows.map(row => Math.max(
                row.smart_tax_excluded_products.length,
                row.excluded_products.length,
                row.smart_tax_filters_categories.length,
                row.included_products.length
            ))
        );

        for (let i = 0; i < maxLength; i++) {
            rows.forEach(row => {
                const smartTaxExcluded = row.smart_tax_excluded_products[i] || '';  // Handle cases where the index exceeds the array length
                const excluded = row.excluded_products[i] || '';
                const smartTaxFilters = row.smart_tax_filters_categories[i] || '';
                const includedProducts = row.included_products[i] || '';
                csvRows.push(`${smartTaxExcluded},${excluded},${smartTaxFilters},${includedProducts}`);
            });
        }

        return csvRows.join('\n');
    }

    // Fetch product data for collection
    async function fetchProductData(collectionId) {
        const url = `/admin/collections/${collectionId}/products.json`; // Fetch all products at once
        const json = await fetchJSON(url);
        const productIds = json.collection_products.map(product => product.product_id);
        return removeDuplicates(productIds); // Remove duplicates from product IDs
    }

    // Fetch all collection data
    async function fetchCollectionData(collectionId) {
        const url = `/admin/collections/${collectionId}.json`; // Fetch all collection data at once
        const json = await fetchJSON(url);

        const {
            smart_tax_excluded_products = [],
            data: { excluded_products = [] } = {},
            smart_tax_filters: { categories = [] } = {}
        } = json.collection;

        return {
            smart_tax_excluded_products,
            excluded_products,
            smart_tax_filters_categories: categories
        };
    }

    // Main function to fetch all data
    async function fetchAllData(collectionId) {
        // Fetch both collection and product data
        const collectionDataPromise = fetchCollectionData(collectionId);
        const productDataPromise = fetchProductData(collectionId);

        // Wait for both data promises to resolve
        const [collectionData, productData] = await Promise.all([collectionDataPromise, productDataPromise]);

        // Remove duplicates globally across all columns
        const allData = [{
            smart_tax_excluded_products: removeDuplicates(collectionData.smart_tax_excluded_products),
            excluded_products: removeDuplicates(collectionData.excluded_products),
            smart_tax_filters_categories: removeDuplicates(collectionData.smart_tax_filters_categories),
            included_products: removeDuplicates(productData)  // Ensure product IDs are unique
        }];

        return allData;
    }

    // Fetch and export
    async function run() {
        // Extract the collection ID from the URL
        const match = window.location.pathname.match(/\/collections\/(\d+)/);
        if (!match) {
            console.error('Failed to extract collection ID from the URL.');
            return;
        }

        const collectionId = match[1];
        console.log('Collection ID:', collectionId);

        try {
            const data = await fetchAllData(collectionId);
            const csv = convertToCSV(data);
            downloadCSV(csv, `collection_${collectionId}_data.csv`);
        } catch (error) {
            console.error('Failed to fetch and export data:', error);
        }
    }

    // Create a Export button
    const button = document.createElement('button');
    button.textContent = 'Export Data';
    button.style.padding = '10px 20px';
    button.style.backgroundColor = '#007bff';
    button.style.color = '#fff';
    button.style.border = 'none';
    button.style.borderRadius = '5px';
    button.style.cursor = 'pointer';

    button.addEventListener('click', async () => {
        // Disable the button to prevent repeated clicks
        button.disabled = true;
        button.textContent = 'Exporting...';

        // Call the main function to fetch and export the data
        await run();

        // Re-enable the button after the process is complete
        button.disabled = false;
        button.textContent = 'Export Data';
    });

    // Insert the button after the selector
    const target = document.querySelector('div.section-header');
    if (target) {
        target.appendChild(button);
    } else {
        console.warn('Target element not found. Button added to body instead.');
        document.body.appendChild(button);
    }
})();