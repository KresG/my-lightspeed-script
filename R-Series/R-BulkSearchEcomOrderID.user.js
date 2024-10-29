// ==UserScript==
// @name         R - Bulk search eCom Order ID
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  Search eCom Order ID. This is useful to easily find the order especially if mx changed the date.
// @author       Kres G.
// @match        */?name=reports.sales.listings.raw_transactions*
// @grant        none
// ==/UserScript==

(function () {
    'use strict';

    const container = document.createElement('div');
    container.style.position = 'fixed';
    container.style.top = '10px';
    container.style.right = '10px';
    container.style.zIndex = 9999;
    container.style.backgroundColor = 'white';
    container.style.padding = '10px';
    container.style.border = '1px solid #ccc';
    container.style.boxShadow = '0 0 10px rgba(0, 0, 0, 0.1)';

    const title = document.createElement('h3');
    title.textContent = 'Bulk search eCom Order ID';
    title.style.margin = '0';

    const minimizeButton = document.createElement('button');
    minimizeButton.textContent = '-';
    minimizeButton.onclick = () => outputArea.style.display = outputArea.style.display === 'none' ? 'block' : 'none';

    const closeButton = document.createElement('button');
    closeButton.textContent = 'X';
    closeButton.onclick = () => container.style.display = 'none';

    const note = document.createElement('p');
    note.textContent = 'eCom orders will only sync if it is marked as paid. Unless it is paid by bank transfer or pay by invoice.';
    note.style.fontSize = '12px';
    note.style.margin = '5px 0';

    const inputField = document.createElement('input');
    inputField.type = 'text';
    inputField.placeholder = 'Enter Order IDs (comma-separated)';
    inputField.style.width = '250px';

    const searchButton = document.createElement('button');
    searchButton.textContent = 'Search';

    const outputArea = document.createElement('div');
    outputArea.style.marginTop = '10px';
    outputArea.style.whiteSpace = 'pre-wrap';
    outputArea.style.fontFamily = 'monospace';

    container.appendChild(title);
    container.appendChild(note);
    container.appendChild(minimizeButton);
    container.appendChild(closeButton);
    container.appendChild(inputField);
    container.appendChild(searchButton);
    container.appendChild(outputArea);
    document.body.appendChild(container);

    const fetchData = async (orderIds, radId) => {
        const results = [];
        const urlBase = `https://us.merchantos.com/API/Account/${radId}/Sale.json?referenceNumber=`;

        for (const orderId of orderIds) {
            const trimmedOrderId = orderId.trim();
            try {
                const response = await fetch(`${urlBase}${trimmedOrderId}`);
                const data = await response.json();

                const saleID = data?.Sale?.saleID || 'Missing';
                results.push(`Order ID: ${trimmedOrderId}, Sale ID: ${saleID}`);
            } catch (error) {
                results.push(`Order ID: ${trimmedOrderId}, Sale ID: Error (Fetch error)`);
                console.error('Fetch error:', error);
            }
        }
        displayResults(results);
    };

    const displayResults = (results) => {
        outputArea.textContent = results.length > 0 ? results.join('\n') : 'No results found.';
    };

    const getRadId = () => {
        const radElement = document.querySelector('#help_account_id > var');
        return radElement ? radElement.textContent.trim() : null;
    };

    searchButton.addEventListener('click', () => {
        const orderIds = inputField.value.split(',');
        const radId = getRadId();

        if (!radId) {
            outputArea.textContent = 'RADID not found. Please ensure you are on the correct page.';
            return;
        }

        if (orderIds.length > 0) {
            outputArea.textContent = ''; // Clear previous results
            fetchData(orderIds, radId);
        } else {
            outputArea.textContent = 'Please enter at least one Order ID.';
        }
    });
})();
