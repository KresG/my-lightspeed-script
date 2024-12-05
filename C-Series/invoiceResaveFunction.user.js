// ==UserScript==
// @name         Invoice Resave Function
// @namespace    http://tampermonkey.net/
// @version      1.0
// @match        Kres
// @description  Automate Save button. This will help sync missing eCom orders to retail.
// @match        */admin/invoices
// @grant        none
// ==/UserScript==

(async function() {
    'use strict';

    // Create and insert the input UI below .invoices-header
    function createInvoiceUI() {
        const header = document.querySelector('.invoices-header');
        if (!header) return;

        const container = document.createElement('div');
        container.style = `
            margin-top: 20px;
            padding: 15px;
            border: 1px solid #ccc;
            border-radius: 5px;
            background: #f9f9f9;
            box-shadow: 0 2px 5px rgba(0,0,0,0.1);
        `;

        container.innerHTML = `
            <label style="font-weight: bold;">Enter Invoice Numbers (comma-separated):</label>
            <input type="text" id="invoiceNumbers" style="
                width: 300px;
                padding: 8px;
                margin-left: 10px;
                border: 1px solid #ccc;
                border-radius: 4px;
                box-shadow: inset 0 1px 3px rgba(0,0,0,0.1);
            " placeholder="e.g., INV123445,INV123446,INV123447">
            <button id="startProcess" style="
                margin-left: 10px;
                padding: 8px 10px;
                border: none;
                border-radius: 4px;
                background-color: #4caf50;
                color: white;
                font-weight: bold;
                cursor: pointer;
                transition: background-color 0.3s;
            ">Start</button>
            <div style="width: 100%; background: #f3f3f3; margin-top: 10px; border-radius: 4px; overflow: hidden;">
                <div id="progressBar" style="width: 0%; height: 20px; background: #4caf50;"></div>
            </div>
        `;

        header.insertAdjacentElement('afterend', container);
        document.getElementById('startProcess').onclick = processInvoices;
    }

    // Processes each invoice number by searching for the corresponding invoice ID
    async function processInvoices() {
        const invoiceNumbers = document.getElementById('invoiceNumbers').value.split(',').map(num => num.trim());
        const progressBar = document.getElementById('progressBar');

        for (let i = 0; i < invoiceNumbers.length; i++) {
            const invoiceId = await fetchInvoiceId(invoiceNumbers[i]);
            if (invoiceId) {
                await openAndSaveInvoice(invoiceId);
                progressBar.style.width = `${((i + 1) / invoiceNumbers.length) * 100}%`;
            } else {
                alert(`Invoice ID not found for Invoice Number: ${invoiceNumbers[i]}`);
            }
        }
    }

    // Fetch the invoice ID by invoice number from the API, handling pagination
    async function fetchInvoiceId(invoiceNumber) {
        const baseUrl = window.location.origin;
        let page = 1;
        let foundInvoice = null;

        while (true) {
            const response = await fetch(`${baseUrl}/admin/invoices.json?page=${page}`);
            if (!response.ok) {
                console.error('Failed to fetch invoices:', response.statusText);
                return null;
            }

            const data = await response.json();
            const invoice = data.invoices.find(inv => inv.number === invoiceNumber);
            if (invoice) {
                foundInvoice = invoice.id; // Found the invoice ID
                break; // Exit the loop since we found the invoice
            }

            // If there are no more pages or if the current page has no invoices
            if (!data.invoices.length) {
                break; // Exit the loop if there are no more invoices to check
            }

            page++; // Move to the next page
        }

        return foundInvoice; // Return the found invoice ID or null
    }

    // Opens an invoice in a new tab, clicks Save, and closes the tab
    function openAndSaveInvoice(invoiceId) {
        return new Promise(resolve => {
            const url = `${window.location.origin}/admin/invoices/${invoiceId}`;
            const newTab = window.open(url, '_blank');

            const interval = setInterval(() => {
                try {
                    if (newTab.document && newTab.document.readyState === 'complete') {
                        const saveButton = newTab.document.querySelector('button[type="submit"].primary');
                        if (saveButton) {
                            saveButton.click();
                            clearInterval(interval);
                            // Close the tab after a short delay
                            setTimeout(() => { newTab.close(); resolve(); }, 2000);
                        }
                    }
                } catch (e) {
                    console.error('Error accessing new tab:', e);
                }
            }, 1000);
        });
    }

    // Add UI when the script loads
    createInvoiceUI();

})();
