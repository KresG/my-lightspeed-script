// ==UserScript==
// @name        Review Exporter
// @match       */admin/reviews*
// @require     http://code.jquery.com/jquery-3.4.1.min.js
// @require     https://cdnjs.cloudflare.com/ajax/libs/FileSaver.js/2.0.5/FileSaver.min.js
// @author      Kres G - C-series Support
// @description Creates an optimized export of all product reviews
// @icon        https://stg-assets.lightspeedhq.com/img/e4ce23b4-news_speeder_signup_newsupdate_illustration_optimized.png
// @version     1
// ==/UserScript==

var rPages = 0;
var rShopId = 0;
var rStarted = false;
var rTotals = 0;
var reviewData = [];
const languages = ['us', 'en', 'fc', 'fr', 'be', 'nl', 'de']; // List of script supported languages. Update it if needed.

(function () {
    "use strict";

    // Create and style the button
    const exportButton = document.createElement('button');
    exportButton.textContent = 'Start Review Export';
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
            startReviewExport().then(() => {
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

async function startReviewExport() {
    try {
        const baseURL = `https://${location.host}/admin/reviews`;
        const limit = 250;
        const initialData = await $.getJSON(`${baseURL}.json?limit=${limit}`);

        if (!initialData || !initialData.links || !initialData.reviews || initialData.reviews.length === 0) {
            throw new Error('Initial data is not in the expected format or no reviews found.');
        }

        rPages = Math.ceil(initialData.links.count / limit);
        rTotals = initialData.links.count;
        rShopId = initialData.reviews[0].shop_id || 'Unknown_Shop_ID';

        let reviewsProcessed = 0;

        for (let i = 1; i <= rPages; i++) {
            const pageData = await $.getJSON(`${baseURL}.json?page=${i}&limit=${limit}`);
            if (!pageData || !pageData.reviews) {
                throw new Error(`Page data for page ${i} is not in the expected format.`);
            }
            reviewData.push(...pageData.reviews.map(r => ({
                id: r.id,
                created_at: r.created_at,
                author: r.author,
                email: r.email,
                content: r.content,
                score: r.score,
                is_visible: r.is_visible,
                product_id: r.product_id,
                product_name: getProductName(r.product),
                updated_at: r.updated_at
            })));

            reviewsProcessed += pageData.reviews.length;
            console.log(`Processed ${reviewsProcessed} / ${rTotals} reviews`);
        }

        exporter();
    } catch (error) {
        console.error('Error fetching review data:', error.message);
        throw error; // Re-throw the error to be caught in the click handler
    }
}

function getProductName(product) {
    if (product && product.nl && product.nl.title) {
        return product.nl.title;
    }

    for (const lang of languages) {
        if (product && product[lang] && product[lang].title) {
            return product[lang].title;
        }
    }

    return "null";
}

function escapeCSV(value) {
    if (value == null) return "";
    return '"' + value.toString().replace(/"/g, '""') + '"';
}

function exporter() {
    try {
        const rows = ["Review_ID,Created_at,Author,Email,Content,Score,Is_Visible,Product_ID,Product_name,Updated_at"];
        reviewData.forEach(r => {
            rows.push([
                escapeCSV(r.id),
                escapeCSV(r.created_at),
                escapeCSV(r.author),
                escapeCSV(r.email),
                escapeCSV(r.content),
                escapeCSV(r.score),
                escapeCSV(r.is_visible),
                escapeCSV(r.product_id),
                escapeCSV(r.product_name),
                escapeCSV(r.updated_at)
            ].join(","));
        });

        const csvContent = new Blob([rows.join("\r\n")], { type: 'text/csv;charset=utf-8;' });
        saveAs(csvContent, `${rShopId}_reviewExport.csv`);
    } catch (error) {
        console.error('Error generating CSV:', error.message);
    }
}
