// ==UserScript==
// @name         billingShippingAddressDetails
// @namespace    http://tampermonkey.net/
// @version      1.0
// @author       Kres G.
// @description  Inserts billing and shipping address details in the Customer table
// @match        */admin/customers*
// ==/UserScript==

(function() {
    'use strict';

    // Function to dynamically build JSON URL based on the current page
    function getJsonUrl() {
        const urlParams = new URLSearchParams(window.location.search);
        const page = urlParams.get('page') || 1; // Get the current page from the URL
        const query = urlParams.toString(); // Get the full query string, including all parameters

        // Construct the JSON URL with page and any active query parameters
        return `${window.location.origin}/admin/customers.json?page=${page}${query ? '&' + query : ''}`;
    }

    // Function to add the header columns for additional fields
    function addHeaderColumns() {
        const headerRow = document.querySelector('table thead tr');
        if (headerRow && !headerRow.querySelector('.extra-column')) {
            // Create and append new header columns for each new data field
            ['Billing Region ID', 'Billing Region', 'Billing Zip',
             'Shipping Region ID', 'Shipping Region', 'Shipping Zip'].forEach(title => {
                const th = document.createElement('th');
                th.classList.add('sortable', 'extra-column');
                th.innerHTML = `<span>${title}</span>`;
                headerRow.appendChild(th);
            });
            console.log("Additional columns added to the header."); // Debug log
        }
    }

    // Function to fetch customer data and populate table rows
    function fetchAndAddCustomerData() {
        fetch(getJsonUrl())
            .then(response => response.json())
            .then(data => {
                console.log("Fetched data:", data); // Debug log

                const customers = data.customers;
                if (!customers || !Array.isArray(customers)) {
                    console.error("No 'customers' array found in the JSON data");
                    return;
                }

                // Iterate over each customer row in the table and add the billing/shipping data
                document.querySelectorAll('table tbody tr').forEach((row, index) => {
                    const customer = customers[index]; // Match customers by index
                    if (customer) {
                        // Fields to display in the extra columns
                        const fields = [
                            customer.billing_address_region_id,
                            customer.billing_address_region_name,
                            customer.billing_address_zipcode,
                            customer.shipping_address_region_id,
                            customer.shipping_address_region_name,
                            customer.shipping_address_zipcode
                        ];

                        fields.forEach((fieldData, fieldIndex) => {
                            // Only add cell if it doesn't already exist
                            if (!row.querySelector(`.extra-cell-${fieldIndex}`)) {
                                const cell = document.createElement('td');
                                cell.classList.add('extra-cell', `extra-cell-${fieldIndex}`);
                                cell.textContent = fieldData || ''; // Display empty if data is missing
                                row.appendChild(cell);
                            }
                        });

                        console.log(`Added customer data for row ${index}.`); // Debug log
                    }
                });
            })
            .catch(error => console.error('Error fetching customer data:', error));
    }

    // Function to initialize and retry data loading with a delay if necessary
    function initializeData() {
        addHeaderColumns();
        fetchAndAddCustomerData();

        // Retry mechanism to ensure data is applied even if the table updates dynamically
        setTimeout(() => {
            addHeaderColumns();
            fetchAndAddCustomerData();
        }, 1000); // Retry after 1 second
    }

    // Set up MutationObserver to watch for changes to the table
    const table = document.querySelector('table');
    if (table) {
        const observer = new MutationObserver(() => {
            console.log("Table content updated, re-initializing data...");
            initializeData();
        });

        observer.observe(table, { childList: true, subtree: true });

        // Initial data load
        initializeData();
    } else {
        console.error("Table element not found.");
    }
})();
