// ==UserScript==
// @name         ProductCustomFields
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  Export Custom Fields Data for All Products
// @author       Kres
// @match        */admin/products*
// @require      http://code.jquery.com/jquery-3.4.1.min.js
// @require      https://cdnjs.cloudflare.com/ajax/libs/FileSaver.js/2.0.5/FileSaver.min.js
// ==/UserScript==

var rStarted = false;
var customFieldDetails = [];
const processedProductIds = new Set(); // Track processed products
const languages = ['us', 'en', 'de', 'nl']; // Supported languages
let shopId = ''; // Store the shop_id

(function () {
    "use strict";

    // Create a wrapper div for the new UI
    const exportWrapper = document.createElement('div');
    exportWrapper.style.marginTop = '20px';
    exportWrapper.innerHTML = '<h3>Export Custom Fields Product Data</h3>';

    // Create a table for the button and description
    const exportTable = document.createElement('table');
    exportTable.style.width = '100%';
    exportTable.style.borderCollapse = 'collapse';

    const tableRow = document.createElement('tr');

    // Create the left side (button)
    const buttonCell = document.createElement('td');
    buttonCell.style.width = '50%';
    buttonCell.style.paddingRight = '10px';
    buttonCell.style.textAlign = 'right';
    const exportButton = document.createElement('button');
    exportButton.textContent = 'Export';
    exportButton.style.padding = '10px 20px';
    exportButton.style.backgroundColor = '#007BFF';
    exportButton.style.color = 'white';
    exportButton.style.border = 'none';
    exportButton.style.borderRadius = '5px';
    exportButton.style.fontSize = '14px';
    exportButton.style.fontWeight = 'bold';
    exportButton.style.cursor = 'pointer';
    exportButton.style.transition = 'background-color 0.3s ease';

    exportButton.addEventListener('mouseover', function () {
        exportButton.style.backgroundColor = '#0056b3';
    });

    exportButton.addEventListener('mouseout', function () {
        exportButton.style.backgroundColor = '#007BFF';
    });

    buttonCell.appendChild(exportButton);

    // Create the right side (description)
    const descriptionCell = document.createElement('td');
    descriptionCell.style.width = '50%';
    descriptionCell.style.paddingRight = '10px';
    descriptionCell.style.textAlign = 'left';
    descriptionCell.innerHTML =
        '<strong>Data Included:</strong>' +
        '<p>Product_ID, Custom_Field_ID, Type, Is_Required, Max_Characters, Created_At, Title (for supported languages)</p>';

    tableRow.appendChild(buttonCell);
    tableRow.appendChild(descriptionCell);
    exportTable.appendChild(tableRow);
    exportWrapper.appendChild(exportTable);

    // Add the export wrapper to the page after the target element
    const targetElement = document.querySelector('#content > div.tc > div');
    if (targetElement) {
        targetElement.appendChild(exportWrapper);
    } else {
        console.error('Target container not found!');
    }

    // Handle the button click
    exportButton.addEventListener('click', function () {
        if (!rStarted) {
            rStarted = true;
            exportButton.textContent = 'Exporting...';
            startExport().then(() => {
                exportButton.textContent = 'Export Complete';
                rStarted = false;
            }).catch((error) => {
                console.error('Error during export:', error);
                exportButton.textContent = 'Export Failed';
                rStarted = false;
            });
        }
    });
})();

async function startExport() {
    try {
        const baseURL = `${window.location.origin}/admin/products`;
        let page = 1;
        let hasMoreProducts = true;
        let totalProducts = 0;
        let processedProducts = 0;

        // Fetch total product count and shop_id
        const countResponse = await fetch(`${baseURL}/count.json`);
        const countData = await countResponse.json();
        totalProducts = countData.count || 1;

        const shopResponse = await fetch(`${baseURL}.json`);
        const shopData = await shopResponse.json();
        shopId = shopData.products[0]?.shop_id || "unknown"; // Get the shop_id from the first product

        // Fetch custom fields for each product
        const fetchCustomFields = async (productIds) => {
            const promises = productIds.map(async (productId) => {
                // Skip already processed product IDs
                if (processedProductIds.has(productId)) return;

                try {
                    const productURL = `${baseURL}/${productId}.json`;
                    const productData = await fetchJSON(productURL);

                    if (productData && productData.product) {
                        processedProductIds.add(productId);

                        const customFields = productData.product.custom_fields;
                        if (customFields && customFields.length > 0) {
                            customFields.forEach(field => {
                                let customFieldDetailsObj = {
                                    product_id: productId,
                                    custom_field_id: field.id,
                                    type: field.type,
                                    is_required: field.is_required,
                                    max_characters: field.max_characters,
                                    created_at: field.created_at
                                };

                                languages.forEach(lang => {
                                    const titleField = field[lang] ? field[lang].title : "-";
                                    customFieldDetailsObj[`title_${lang}`] = titleField;
                                });

                                customFieldDetails.push(customFieldDetailsObj);
                            });
                        } else {
                            // If no custom fields, add blank values for this product
                            const emptyDetails = {
                                product_id: productId,
                                custom_field_id: "-",
                                type: "-",
                                is_required: "-",
                                max_characters: "-",
                                created_at: "-",
                            };
                            languages.forEach(lang => {
                                emptyDetails[`title_${lang}`] = "-";
                            });
                            customFieldDetails.push(emptyDetails);
                        }
                    }
                } catch (error) {
                    console.error(`Error fetching details for product ${productId}:`, error.message);
                }
                processedProducts++;
                console.log(`Progress: ${processedProducts}/${totalProducts} (${((processedProducts / totalProducts) * 100).toFixed(2)}%)`);
            });

            await Promise.all(promises);
        };

        // Fetch products in paginated batches
        while (hasMoreProducts) {
            try {
                const productsData = await fetchJSON(`${baseURL}.json?limit=50&page=${page}`);
                if (!productsData || !productsData.products || productsData.products.length === 0) {
                    hasMoreProducts = false;
                    break;
                }

                const productIds = productsData.products.map(p => p.id);
                await fetchCustomFields(productIds);

                page++;
            } catch (error) {
                console.error(`Error fetching product page ${page}:`, error.message);
                break;
            }
        }

        exportCSV();
    } catch (error) {
        console.error('Error fetching product data:', error.message);
        throw error;
    }
}

// Fetch JSON data with proper error handling
async function fetchJSON(url) {
    try {
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            },
        });

        if (!response.ok) {
            throw new Error(`Failed to fetch data from ${url}: ${response.statusText}`);
        }

        return await response.json();
    } catch (error) {
        console.error(`FetchJSON error for ${url}:`, error.message);
        throw error;
    }
}

// Export CSV logic
function escapeCSV(value) {
    if (value == null) return "";
    return '"' + value.toString().replace(/"/g, '""') + '"';
}

function exportCSV() {
    try {
        const header = [
            "Product_ID", "Custom_Field_ID", "Type", "Is_Required", "Max_Characters", "Created_At"
        ];
        languages.forEach(lang => {
            header.push(`Title_${lang.toUpperCase()}`);
        });

        const rows = [header.join(",")];
        customFieldDetails.forEach(detail => {
            const row = [
                escapeCSV(detail.product_id),
                escapeCSV(detail.custom_field_id),
                escapeCSV(detail.type),
                escapeCSV(detail.is_required),
                escapeCSV(detail.max_characters),
                escapeCSV(detail.created_at)
            ];
            languages.forEach(lang => {
                row.push(escapeCSV(detail[`title_${lang}`]));
            });
            rows.push(row.join(","));
        });

        const csvContent = new Blob([rows.join("\r\n")], { type: 'text/csv;charset=utf-8;' });
        const fileName = shopId ? `${shopId}_custom_field.csv` : "product_export.csv";
        saveAs(csvContent, fileName);
    } catch (error) {
        console.error('Error generating CSV:', error.message);
    }
}
