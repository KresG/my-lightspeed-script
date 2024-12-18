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

    // Function to fetch JSON data with retry logic
    async function fetchJSONWithRetry(url, retries = 3) {
        const headers = {
            'Content-Type': 'application/json',
        };

        for (let i = 0; i < retries; i++) {
            try {
                const response = await fetch(url, { headers });
                if (!response.ok) {
                    console.warn(`Attempt ${i + 1} failed: ${response.status} ${response.statusText}`);
                    if (response.status === 409) continue; // Retry for 409 errors
                    throw new Error(`Failed to fetch ${url}: ${response.statusText} (HTTP ${response.status})`);
                }
                return await response.json();
            } catch (error) {
                if (i === retries - 1) throw error;
            }
        }
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
        csvRows.push('smart_tax_excluded_products,excluded_products,smart_tax_filters_categories,included_products'); // CSV header

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
                const smartTaxExcluded = row.smart_tax_excluded_products[i] || '';
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
        const url = `/admin/collections/${collectionId}/products.json`;
        const json = await fetchJSONWithRetry(url);

        const productIds = json?.collection_products?.map(product => product.product_id) || [];
        return removeDuplicates(productIds);
    }

    // Fetch collection data
    async function fetchCollectionData(collectionId) {
        const url = `/admin/collections/${collectionId}.json`;
        const json = await fetchJSONWithRetry(url);

        if (!json || !json.collection) {
            console.error('Collection data is null or missing:', json);
            return {
                smart_tax_excluded_products: [],
                excluded_products: [],
                smart_tax_filters_categories: []
            };
        }

        const collection = json.collection;
        return {
            smart_tax_excluded_products: collection.smart_tax_excluded_products || [],
            excluded_products: collection.data?.excluded_products || [],
            smart_tax_filters_categories: collection.smart_tax_filters?.categories || []
        };
    }

    // Main function to fetch all data
    async function fetchAllData(collectionId) {
        const collectionDataPromise = fetchCollectionData(collectionId);
        const productDataPromise = fetchProductData(collectionId);

        const [collectionData, productData] = await Promise.all([collectionDataPromise, productDataPromise]);

        const allData = [{
            smart_tax_excluded_products: removeDuplicates(collectionData.smart_tax_excluded_products),
            excluded_products: removeDuplicates(collectionData.excluded_products),
            smart_tax_filters_categories: removeDuplicates(collectionData.smart_tax_filters_categories),
            included_products: removeDuplicates(productData)
        }];

        return allData;
    }

    // Fetch and export
    async function run() {
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

    // Create Export button
    const button = document.createElement('button');
    button.textContent = 'Export Data';
    button.style.padding = '10px 20px';
    button.style.backgroundColor = '#007bff';
    button.style.color = '#fff';
    button.style.border = 'none';
    button.style.borderRadius = '5px';
    button.style.cursor = 'pointer';

    button.addEventListener('click', async () => {
        button.disabled = true;
        button.textContent = 'Exporting...';

        await run();

        button.disabled = false;
        button.textContent = 'Export Data';
    });

    const target = document.querySelector('div.section-header');
    if (target) {
        target.appendChild(button);
    } else {
        console.warn('Target element not found. Button added to body instead.');
        document.body.appendChild(button);
    }
})();
