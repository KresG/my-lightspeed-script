// ==UserScript==
// @name         AllCategoriesData
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  Export all categories with ID
// @author       Kres
// @match        */admin/products*
// @require      http://code.jquery.com/jquery-3.4.1.min.js
// @require      https://cdnjs.cloudflare.com/ajax/libs/FileSaver.js/2.0.5/FileSaver.min.js
// ==/UserScript==

(function () {
    "use strict";

    let shopId = '';

    const exportWrapper = document.createElement('div');
    exportWrapper.style.marginTop = '20px';
    exportWrapper.innerHTML = '<h3>Export Categories Data</h3>';

    const exportTable = document.createElement('table');
    exportTable.style.width = '100%';
    exportTable.style.borderCollapse = 'collapse';

    const tableRow = document.createElement('tr');

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

    exportButton.addEventListener('mouseover', function () {
        exportButton.style.backgroundColor = '#0056b3';
    });

    exportButton.addEventListener('mouseout', function () {
        exportButton.style.backgroundColor = '#007BFF';
    });

    buttonCell.appendChild(exportButton);

    const descriptionCell = document.createElement('td');
    descriptionCell.style.width = '50%';
    descriptionCell.style.textAlign = 'left';
    descriptionCell.innerHTML =
        '<strong>Data Included:</strong>' +
        '<p>ID, Category_Title, Position, Depth, Type, Parent_Category_ID, Parent_Title, ' +
        'Subcategory_IDs, Subcategory_Names, Subsubcategory_IDs, Subsubcategory_Names</p>';

    tableRow.appendChild(buttonCell);
    tableRow.appendChild(descriptionCell);
    exportTable.appendChild(tableRow);
    exportWrapper.appendChild(exportTable);

    const targetElement = document.querySelector('#content > div.tc > div');
    if (targetElement) {
        targetElement.appendChild(exportWrapper);
    } else {
        console.error('Target container not found!');
    }

    exportButton.addEventListener('click', async function () {
        exportButton.textContent = 'Exporting...';
        exportButton.disabled = true;

        await fetchShopId();
        await exportCategories();

        exportButton.textContent = 'Export Complete';
        exportButton.disabled = false;
    });

    async function fetchShopId() {
        try {
            let response = await fetch(`${window.location.origin}/admin/products.json`);
            let data = await response.json();
            shopId = data.products[0]?.shop_id || "unknown";
        } catch (error) {
            console.error("Error fetching shop ID:", error);
            shopId = "unknown";
        }
    }

    async function exportCategories() {
        let categoriesData = [];
        let baseURL = `${window.location.origin}/admin/categories.json`;

        try {
            let response = await fetch(baseURL);
            let data = await response.json();

            if (!data.categories || data.categories.length === 0) {
                alert("No categories found.");
                return;
            }

            data.categories.forEach(category => {
                let langKey = Object.keys(category).find(key => typeof category[key] === 'object' && category[key].title);

                let categoryInfo = {
                    ID: category.id || "",
                    Category_Title: langKey ? category[langKey].title || "" : "",
                    Position: category.position || "",
                    Depth: category.depth || "",
                    Type: category.type || "",
                    Parent_Category_ID: category.parent_category_id || "",
                    Parent_Title: category.parent_titles || "",
                    Subcategory_IDs: "",
                    Subcategory_Names: "",
                    Subsubcategory_IDs: "",
                    Subsubcategory_Names: ""
                };

                if (category.children_categories && category.children_categories.length > 0) {
                    categoryInfo.Subcategory_IDs = category.children_categories.map(sub => sub.id).join("; ") || "";
                    categoryInfo.Subcategory_Names = category.children_categories.map(sub => langKey ? sub[langKey]?.title : "").join("; ") || "";

                    // Extract subsubcategories
                    let subsubcategoryIDs = [];
                    let subsubcategoryNames = [];

                    category.children_categories.forEach(sub => {
                        if (sub.children_categories && sub.children_categories.length > 0) {
                            sub.children_categories.forEach(subsub => {
                                subsubcategoryIDs.push(subsub.id);
                                subsubcategoryNames.push(langKey ? subsub[langKey]?.title : "");
                            });
                        }
                    });

                    categoryInfo.Subsubcategory_IDs = subsubcategoryIDs.join("; ") || "";
                    categoryInfo.Subsubcategory_Names = subsubcategoryNames.join("; ") || "";
                }

                categoriesData.push(categoryInfo);
            });

            generateCSV(categoriesData);
        } catch (error) {
            console.error("Error fetching categories:", error);
        }
    }

    function generateCSV(categoriesData) {
        if (categoriesData.length === 0) {
            alert("No categories found.");
            return;
        }

        let csvRows = [];
        let headers = [
            "ID", "Category_Title", "Position", "Depth", "Type", "Parent_Category_ID", "Parent_Title",
            "Subcategory_IDs", "Subcategory_Names", "Subsubcategory_IDs", "Subsubcategory_Names"
        ];
        csvRows.push(headers.join(","));

        categoriesData.forEach(cat => {
            let row = headers.map(header => `"${cat[header]}"`);
            csvRows.push(row.join(","));
        });

        let csvContent = csvRows.join("\n");
        let blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });

        let fileName = shopId ? `${shopId}_Categories_Export.csv` : "Categories_Export.csv";
        saveAs(blob, fileName);
    }
})();
