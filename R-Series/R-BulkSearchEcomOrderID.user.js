// ==UserScript==
// @name         rBulkSearchEComOrder
// @namespace    http://tampermonkey.net/
// @version      1.2
// @description  Search eCom Order ID. This is useful to easily find the order especially if mx changed the date. v1.2 added export button.
// @author       Kres G.
// @match        */?name=reports.sales.listings.raw_transactions*
// @match        */?form_name=ui_tab&tab=reports
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

    const exportButton = document.createElement('button');
    exportButton.textContent = 'Export CSV';
    exportButton.style.marginLeft = '5px';
    exportButton.style.display = 'none';

    const outputArea = document.createElement('div');
    outputArea.style.marginTop = '10px';
    outputArea.style.whiteSpace = 'pre-wrap';
    outputArea.style.fontFamily = 'monospace';

    container.appendChild(title);
    container.appendChild(minimizeButton);
    container.appendChild(closeButton);
    container.appendChild(note);
    container.appendChild(inputField);
    container.appendChild(searchButton);
    container.appendChild(exportButton);
    container.appendChild(outputArea);
    document.body.appendChild(container);

    const fetchData = async (orderIds, radId) => {
        const results = [];
        const urlBase = `https://us.merchantos.com/API/Account/${radId}/Sale.json?referenceNumber=`;

        outputArea.textContent = 'Fetching data...';
        try {
            const requests = orderIds.map(orderId =>
                fetch(`${urlBase}${orderId.trim()}`)
                    .then(response => response.json())
                    .then(data => ({ orderId: orderId.trim(), saleID: data?.Sale?.saleID || 'Missing' }))
                    .catch(() => ({ orderId: orderId.trim(), saleID: 'Error' }))
            );
            const resultsData = await Promise.all(requests);
            displayResults(resultsData);
        } catch (error) {
            outputArea.textContent = 'Error fetching data';
            console.error('Fetch error:', error);
        }
    };

    const displayResults = (results) => {
        outputArea.textContent = results.map(r => `Order ID: ${r.orderId}, Sale ID: ${r.saleID}`).join('\n');
        exportButton.style.display = 'inline';
        exportButton.onclick = () => exportCSV(results);
    };

    const exportCSV = (results) => {
        const csvContent = 'data:text/csv;charset=utf-8,' +
            ['Order ID,Sale ID', ...results.map(r => `${r.orderId},${r.saleID}`)].join('\n');
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement('a');
        link.setAttribute('href', encodedUri);
        link.setAttribute('download', 'eCom_orders.csv');
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const getRadId = () => {
        const radElement = document.querySelector('#help_account_id > var');
        return radElement ? radElement.textContent.trim() : null;
    };

    searchButton.addEventListener('click', () => {
        const orderIds = inputField.value.split(',').map(id => id.trim()).filter(id => id);
        const radId = getRadId();
        if (!radId) {
            outputArea.textContent = 'RADID not found. Ensure you are on the correct page.';
            return;
        }
        if (orderIds.length === 0) {
            outputArea.textContent = 'Please enter at least one Order ID.';
            return;
        }
        fetchData(orderIds, radId);
    });
})();
