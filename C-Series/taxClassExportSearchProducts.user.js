// ==UserScript==
// @name         ExportSearchProductsTaxClassData
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  Fetch Excluded and Included Product IDs, Category IDs, Brand IDs, Supplier IDs
// @author       Kres
// @match        */admin/collections/*
// @grant        none
// ==/UserScript==


// Start of the export function
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
// END


// Start of the Product ID Search

(function() {
    'use strict';

    async function fetchJSONWithRetry(url, retries = 3) {
        const headers = { 'Content-Type': 'application/json' };
        for (let i = 0; i < retries; i++) {
            try {
                const response = await fetch(url, { headers });
                if (!response.ok) {
                    console.warn(`Attempt ${i + 1} failed: ${response.status} ${response.statusText}`);
                    if (response.status === 409) continue;
                    throw new Error(`Failed to fetch ${url}: ${response.statusText} (HTTP ${response.status})`);
                }
                return await response.json();
            } catch (error) {
                if (i === retries - 1) throw error;
            }
        }
    }

    async function fetchProductDetails(productId) {
        const url = `/admin/products/${productId}.json`;
        try {
            const json = await fetchJSONWithRetry(url);
            if (json && json.product) {
                console.log("✅ Product Data Fetched:", json.product);
                return {
                    id: json.product.id,
                    brand_id: json.product.brand_id,
                    supplier_id: json.product.supplier_id,
                    categories: json.product.product_categories?.map(cat => cat.category_id) || []
                };
            }
            return null;
        } catch (error) {
            console.error('❌ Error fetching product details:', error);
            return null;
        }
    }

    async function fetchCollectionData(collectionId) {
        const url = `/admin/collections/${collectionId}.json`;
        try {
            const json = await fetchJSONWithRetry(url);
            if (!json || !json.collection) return null;

            console.log("✅ Collection Tax Class Data Fetched:", json.collection);
            return {
                smart_tax_excluded_products: json.collection.smart_tax_excluded_products || [],
                smart_tax_filters_categories: json.collection.smart_tax_filters?.categories || [],
                smart_tax_filters_suppliers: json.collection.smart_tax_filters?.suppliers || [],
                smart_tax_filters_brands: json.collection.smart_tax_filters?.brands || []
            };
        } catch (error) {
            console.error('❌ Error fetching collection data:', error);
            return null;
        }
    }

    async function fetchIncludedProducts(collectionId) {
        const url = `/admin/collections/${collectionId}/products.json`;
        try {
            const json = await fetchJSONWithRetry(url);
            if (!json || !json.collection_products) return [];

            console.log("✅ Included Products Data Fetched:", json.collection_products);
            return json.collection_products.map(product => product.product_id);
        } catch (error) {
            console.error('❌ Error fetching included products:', error);
            return [];
        }
    }

    function createSearchUI() {
        const container = document.createElement('div');
        container.style.margin = '20px 0';
        container.style.padding = '10px';
        container.style.border = '1px solid #ddd';
        container.style.borderRadius = '5px';
        container.style.backgroundColor = '#f9f9f9';

        const label = document.createElement('label');
        label.textContent = 'Enter Product ID:';
        label.style.marginRight = '10px';

        const input = document.createElement('input');
        input.type = 'text';
        input.placeholder = 'Product ID';
        input.style.padding = '5px';

        const button = document.createElement('button');
        button.textContent = 'Search';
        button.style.marginLeft = '10px';
        button.style.padding = '5px 10px';
        button.style.backgroundColor = '#28a745';
        button.style.color = '#fff';
        button.style.border = 'none';
        button.style.borderRadius = '3px';
        button.style.cursor = 'pointer';

        const resultDiv = document.createElement('div');
        resultDiv.style.marginTop = '10px';
        resultDiv.style.padding = '10px';
        resultDiv.style.border = '1px solid #ccc';
        resultDiv.style.borderRadius = '5px';
        resultDiv.style.backgroundColor = '#fff';
        resultDiv.style.display = 'none';

        button.addEventListener('click', async (event) => {
            event.preventDefault();
            event.stopPropagation();

            const productId = input.value.trim();
            if (!productId) {
                alert('Please enter a valid Product ID');
                return;
            }

            resultDiv.style.display = 'none';
            resultDiv.innerHTML = 'Searching...';

            const product = await fetchProductDetails(productId);
            const match = window.location.pathname.match(/\/collections\/(\d+)/);
            if (!match) {
                resultDiv.innerHTML = 'Could not determine collection ID.';
                resultDiv.style.display = 'block';
                return;
            }

            const collectionId = match[1];
            const collectionData = await fetchCollectionData(collectionId);
            const includedProducts = await fetchIncludedProducts(collectionId);

            if (product && collectionData) {
                let taxClassReasons = [];

                console.log("🔍 Comparing Product Data Against Tax Class Data...");
                console.log("🟢 Product:", product);
                console.log("🟢 Tax Class Data:", collectionData);

                if (includedProducts.includes(product.id)) {
                    console.log(`✅ Match Found: Product ID ${product.id} is INCLUDED`);
                    taxClassReasons.push(`Product ID: ${product.id} (Included)`);
                }

                const taxClassExcludedProducts = collectionData.smart_tax_excluded_products.map(Number);
                const taxClassBrands = collectionData.smart_tax_filters_brands.map(Number);
                const taxClassSuppliers = collectionData.smart_tax_filters_suppliers.map(Number);
                const taxClassCategories = collectionData.smart_tax_filters_categories.map(Number);

                if (taxClassExcludedProducts.includes(product.id)) {
                    taxClassReasons.push(`❌ Product ID: ${product.id} (Excluded)`);
                }
                if (product.brand_id && taxClassBrands.includes(product.brand_id)) {
                    taxClassReasons.push(`Brand ID: ${product.brand_id} (Filtered)`);
                }
                if (product.supplier_id && taxClassSuppliers.includes(product.supplier_id)) {
                    taxClassReasons.push(`Supplier ID: ${product.supplier_id} (Filtered)`);
                }
                const matchedCategories = product.categories.filter(cat => taxClassCategories.includes(cat));
                if (matchedCategories.length) {
                    taxClassReasons.push(`Category IDs: ${matchedCategories.join(', ')}`);
                }

                resultDiv.innerHTML = `<strong>Tax Class Status:</strong> ${taxClassReasons.length > 0 ? '✅ Product is part of the tax class' : '❌ Product is NOT part of the tax class'}<br>
                                       <strong>Reason:</strong><br> ${taxClassReasons.length ? taxClassReasons.join('<br>') : 'N/A'}`;
                resultDiv.style.display = 'block';
            }
        });

        container.appendChild(label);
        container.appendChild(input);
        container.appendChild(button);
        container.appendChild(resultDiv);

        const target = document.querySelector('div.section-header');
        if (target) {
            target.appendChild(container);
        } else {
            document.body.insertBefore(container, document.body.firstChild);
        }
    }

    createSearchUI();
})();
