// ==UserScript==
// @name        Category Exporter
// @namespace   http://tampermonkey.net/
// @version     1.0
// @description Export All Categories
// @author      Kres G - C-series Support
// @match       */admin/products*
// @require     http://code.jquery.com/jquery-3.4.1.min.js
// @require     https://cdnjs.cloudflare.com/ajax/libs/FileSaver.js/2.0.5/FileSaver.min.js
// ==/UserScript==

var rStarted = false;
var productDetails = [];
const languages = ['us', 'en', 'de', 'nl']; // List of supported languages

(function () {
    "use strict";

    // Create and style the button
    const exportButton = document.createElement('button');
    exportButton.textContent = 'Product Category Export';
    exportButton.style.padding = '10px 20px';
    exportButton.style.backgroundColor = '#007BFF';
    exportButton.style.color = 'white';
    exportButton.style.border = 'none';
    exportButton.style.borderRadius = '5px';
    exportButton.style.fontSize = '14px';
    exportButton.style.fontWeight = 'bold';
    exportButton.style.cursor = 'pointer';
    exportButton.style.transition = 'background-color 0.3s ease';
    exportButton.style.marginLeft = '10px';

    exportButton.addEventListener('mouseover', function () {
        exportButton.style.backgroundColor = '#0056b3';
    });

    exportButton.addEventListener('mouseout', function () {
        exportButton.style.backgroundColor = '#007BFF';
    });

    // Append the button next to the .PageBarActions
    const pageBarActions = document.querySelector('#content .PageBarActions');
    if (pageBarActions) {
        pageBarActions.appendChild(exportButton);
    } else {
        console.error('PageBarActions container not found!');
    }

    exportButton.addEventListener('click', function () {
        if (!rStarted) {
            rStarted = true;
            exportButton.textContent = 'Exporting...';
            startProductExport().then(() => {
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

async function startProductExport() {
    try {
        const baseURL = `${window.location.origin}/admin/products`;
        const productsURL = `${baseURL}.json?limit=250&page=1`;
        let page = 1;
        let hasMoreProducts = true;

        while (hasMoreProducts) {
            const productsData = await fetchJSON(`${baseURL}.json?limit=250&page=${page}`);

            if (!productsData || !productsData.products || productsData.products.length === 0) {
                hasMoreProducts = false;
                break;
            }

            const productIds = productsData.products.map(p => p.id);

            for (const productId of productIds) {
                const productURL = `${baseURL}/${productId}.json`;
                const productData = await fetchJSON(productURL);

                if (productData && productData.product) {
                    const categories = productData.product.product_categories;

                    if (categories && categories.length > 0) {
                        categories.forEach(category => {
                            const categoryId = category.category.id;
                            const categorySlug = (category.category.us && category.category.us.slug) ? category.category.us.slug : "-"; // Safe check for slug

                            let categoryDetails = {
                                product_id: productId,
                                category_id: categoryId,
                                category_slug: categorySlug
                            };

                            languages.forEach(lang => {
                                if (category.category[lang]) { // Ensure the language data exists
                                    categoryDetails[`category_${lang}_id`] = category.category[lang].id || "-";
                                    categoryDetails[`category_${lang}_slug`] = category.category[lang].slug || "-";
                                    categoryDetails[`category_${lang}`] = category.category[lang].fulltitle || "-";
                                } else {
                                    categoryDetails[`category_${lang}_id`] = "-";
                                    categoryDetails[`category_${lang}_slug`] = "-";
                                    categoryDetails[`category_${lang}`] = "-";
                                }
                            });

                            productDetails.push(categoryDetails);
                        });
                    } else {
                        const emptyDetails = {
                            product_id: productId,
                            category_id: "-",
                            category_slug: "-"
                        };
                        languages.forEach(lang => {
                            emptyDetails[`category_${lang}_id`] = "-";
                            emptyDetails[`category_${lang}_slug`] = "-";
                            emptyDetails[`category_${lang}`] = "-";
                        });
                        productDetails.push(emptyDetails);
                    }
                }
            }

            page++;
        }

        exporter();
    } catch (error) {
        console.error('Error fetching product data:', error.message);
        throw error;
    }
}

async function fetchJSON(url) {
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
}

function escapeCSV(value) {
    if (value == null) return "";
    return '"' + value.toString().replace(/"/g, '""') + '"';
}

function exporter() {
    try {
        // Create the header row with dynamic language titles
        const header = ["Product_ID", "Category_ID", "Category_Slug"];
        languages.forEach(lang => {
            header.push(`Category_${lang.toUpperCase()} ID`, `Category_${lang.toUpperCase()} Slug`, `Category_${lang.toUpperCase()} Name`);
        });

        const rows = [header.join(",")];
        productDetails.forEach(detail => {
            const row = [
                escapeCSV(detail.product_id),
                escapeCSV(detail.category_id),
                escapeCSV(detail.category_slug)
            ];
            languages.forEach(lang => {
                row.push(
                    escapeCSV(detail[`category_${lang}_id`]),
                    escapeCSV(detail[`category_${lang}_slug`]),
                    escapeCSV(detail[`category_${lang}`])
                );
            });
            rows.push(row.join(","));
        });

        const csvContent = new Blob([rows.join("\r\n")], { type: 'text/csv;charset=utf-8;' });
        saveAs(csvContent, 'productCatExport.csv');
    } catch (error) {
        console.error('Error generating CSV:', error.message);
    }
}
