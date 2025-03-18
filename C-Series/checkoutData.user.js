// ==UserScript==
// @name         CheckoutData
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  This will display a new UI on the checkout page and include the tax rate for each product line item. Change the match depending on the shop language for it to work.
// @author       Kres
// @match        */checkouts/
// @match        */nl/checkouts/
// @match        */en/checkouts/
// @match        */fr/checkouts/
// @match        */checkout/onestep/*
// @match        */checkout/*
// @match        */checkout/onepage/*
// @match        */en/checkout/onestep/*
// @match        */nl/checkout/*
// @match        */us/checkout/*
// @match        */en/checkout/*
// ==/UserScript==

(function() {
    'use strict';

    // Ensure only one instance of the floating div exists
    const existingDiv = document.getElementById('floatingDataDiv');
    if (existingDiv) {
        existingDiv.remove();
    }

    // Create floating div
    const floatingDiv = document.createElement('div');
    floatingDiv.id = 'floatingDataDiv';
    floatingDiv.style.position = 'fixed';
    floatingDiv.style.top = '10px';
    floatingDiv.style.right = '10px';
    floatingDiv.style.width = '90%';
    floatingDiv.style.maxHeight = '400px';
    floatingDiv.style.overflowY = 'auto';
    floatingDiv.style.backgroundColor = '#fff';
    floatingDiv.style.border = '1px solid #ccc';
    floatingDiv.style.boxShadow = '0 4px 8px rgba(0,0,0,0.2)';
    floatingDiv.style.padding = '10px';
    floatingDiv.style.zIndex = '10000';
    floatingDiv.style.fontFamily = 'Arial, sans-serif';
    floatingDiv.style.fontSize = '12px';
    floatingDiv.style.color = '#333';

    // Create header with buttons
    const header = document.createElement('div');
    header.style.display = 'flex';
    header.style.justifyContent = 'space-between';
    header.style.alignItems = 'center';
    header.style.cursor = 'move';
    header.style.backgroundColor = '#f1f1f1';
    header.style.padding = '5px';

    const title = document.createElement('span');
    title.textContent = 'Checkout Data';
    header.appendChild(title);

    const buttonsDiv = document.createElement('div');
    header.appendChild(buttonsDiv);

    // Minimize Button
    const minimizeBtn = document.createElement('button');
    minimizeBtn.textContent = '−';
    minimizeBtn.style.marginRight = '5px';
    minimizeBtn.style.fontSize = '16px';
    minimizeBtn.addEventListener('click', () => {
        if (floatingDiv.style.height === '30px') {
            floatingDiv.style.height = '400px';
        } else {
            floatingDiv.style.height = '30px';
        }
    });
    buttonsDiv.appendChild(minimizeBtn);

    // Maximize Button
    const maximizeBtn = document.createElement('button');
    maximizeBtn.textContent = '⊞';
    maximizeBtn.style.marginRight = '5px';
    maximizeBtn.style.fontSize = '16px';
    maximizeBtn.addEventListener('click', () => {
        floatingDiv.style.height = '400px';
    });
    buttonsDiv.appendChild(maximizeBtn);

    // Close Button
    const closeBtn = document.createElement('button');
    closeBtn.textContent = 'X';
    closeBtn.style.fontSize = '16px';
    closeBtn.addEventListener('click', () => {
        floatingDiv.remove();
    });
    buttonsDiv.appendChild(closeBtn);

    floatingDiv.appendChild(header);
    floatingDiv.innerHTML += '<strong>Loading data...</strong>';
    document.body.appendChild(floatingDiv);

    // Enable drag to move
    let isDragging = false;
    let offsetX, offsetY;

    header.addEventListener('mousedown', (e) => {
        isDragging = true;
        offsetX = e.clientX - floatingDiv.offsetLeft;
        offsetY = e.clientY - floatingDiv.offsetTop;
    });

    document.addEventListener('mousemove', (e) => {
        if (isDragging) {
            floatingDiv.style.left = `${e.clientX - offsetX}px`;
            floatingDiv.style.top = `${e.clientY - offsetY}px`;
        }
    });

    document.addEventListener('mouseup', () => {
        isDragging = false;
    });

    // Fetch data from the dynamic URL
    const fetchCheckoutData = () => {
        const baseUrl = window.location.origin;
        const apiUrl = `${baseUrl}/checkout/onestep/details/?format=json`;

        fetch(apiUrl)
            .then(response => {
                if (!response.ok) {
                    throw new Error('Network response was not ok');
                }
                return response.json();
            })
            .then(data => {
                const products = data.checkout.quote.products;
                const discountRules = data.checkout.discount.rules;
                const shipmentMethod = data.checkout.shipment_method;
                renderData(products, discountRules, shipmentMethod);
            })
            .catch(() => {
                floatingDiv.innerHTML = '<strong>Error fetching data.</strong>';
            });
    };

    // Render products, discounts, and shipping in a table inside the floating div
    const renderData = (products, discountRules, shipmentMethod) => {
        if ((!products || products.length === 0) && (!discountRules || Object.keys(discountRules).length === 0) && !shipmentMethod) {
            floatingDiv.innerHTML = '<strong>No products, discount rules, or shipping method found.</strong>';
            return;
        }

        const productTable = createProductTable(products);
        const discountTable = createDiscountTable(discountRules);
        const shippingTable = createShippingTable(shipmentMethod);

        floatingDiv.innerHTML = '';
        floatingDiv.appendChild(header); // Re-append the header
        if (productTable) floatingDiv.appendChild(productTable);
        if (discountTable) floatingDiv.appendChild(discountTable);
        if (shippingTable) floatingDiv.appendChild(shippingTable);
    };

    const createProductTable = (products) => {
        if (!products || products.length === 0) return null;

        const table = document.createElement('table');
        table.style.width = '100%';
        table.style.borderCollapse = 'collapse';

        const thead = `
            <thead>
                <tr>
                    <th style="border: 1px solid #ddd; padding: 8px;">Product ID</th>
                    <th style="border: 1px solid #ddd; padding: 8px;">Variant ID</th>
                    <th style="border: 1px solid #ddd; padding: 8px;">Title</th>
                    <th style="border: 1px solid #ddd; padding: 8px;">Qty</th>
                    <th style="border: 1px solid #ddd; padding: 8px;">AddtCostInc</th>
                    <th style="border: 1px solid #ddd; padding: 8px;">AddtCostExc</th>
                    <th style="border: 1px solid #ddd; padding: 8px;">DiscExcl</th>
                    <th style="border: 1px solid #ddd; padding: 8px;">DiscIncl</th>
                    <th style="border: 1px solid #ddd; padding: 8px;">TaxRate</th>
                    <th style="border: 1px solid #ddd; padding: 8px;">PriceExcl</th>
                    <th style="border: 1px solid #ddd; padding: 8px;">PriceIncl</th>
                    <th style="border: 1px solid #ddd; padding: 8px;">StockLevel</th>
                    <th style="border: 1px solid #ddd; padding: 8px;">SizeX</th>
                    <th style="border: 1px solid #ddd; padding: 8px;">SizeY</th>
                    <th style="border: 1px solid #ddd; padding: 8px;">SizeZ</th>
                    <th style="border: 1px solid #ddd; padding: 8px;">Weight</th>
                    <th style="border: 1px solid #ddd; padding: 8px;">Qty Disc</th>
                </tr>
            </thead>
        `;

        const tbody = products.map(product => {
            return `
                <tr>
                    <td style="border: 1px solid #ddd; padding: 8px;">${product.product_id}</td>
                    <td style="border: 1px solid #ddd; padding: 8px;">${product.variant_id}</td>
                    <td style="border: 1px solid #ddd; padding: 8px;">${product.title}</td>
                    <td style="border: 1px solid #ddd; padding: 8px;">${product.quantity}</td>
                    <td style="border: 1px solid #ddd; padding: 8px;">${product.additional_cost_price_incl}</td>
                    <td style="border: 1px solid #ddd; padding: 8px;">${product.additional_cost_price_excl}</td>
                    <td style="border: 1px solid #ddd; padding: 8px;">${product.discount_excl}</td>
                    <td style="border: 1px solid #ddd; padding: 8px;">${product.discount_incl}</td>
                    <td style="border: 1px solid #ddd; padding: 8px;">${product.tax_rate}</td>
                    <td style="border: 1px solid #ddd; padding: 8px;">${product.price_excl}</td>
                    <td style="border: 1px solid #ddd; padding: 8px;">${product.price_incl}</td>
                    <td style="border: 1px solid #ddd; padding: 8px;">${product.stock_level}</td>
                    <td style="border: 1px solid #ddd; padding: 8px;">${product.size_x}</td>
                    <td style="border: 1px solid #ddd; padding: 8px;">${product.size_y}</td>
                    <td style="border: 1px solid #ddd; padding: 8px;">${product.size_z}</td>
                    <td style="border: 1px solid #ddd; padding: 8px;">${product.weight}</td>
                    <td style="border: 1px solid #ddd; padding: 8px;">${product.quantity_discount_messages}</td>
                </tr>
            `;
        }).join('');

        table.innerHTML = thead + `<tbody>${tbody}</tbody>`;
        return table;
    };

    const createDiscountTable = (discountRules) => {
        if (!discountRules || Object.keys(discountRules).length === 0) return null;

        const table = document.createElement('table');
        table.style.width = '100%';
        table.style.borderCollapse = 'collapse';
        table.style.marginTop = '20px';

        const thead = `
            <thead>
                <tr>
                    <th style="border: 1px solid #ddd; padding: 8px;">Rule ID</th>
                    <th style="border: 1px solid #ddd; padding: 8px;">Type</th>
                    <th style="border: 1px solid #ddd; padding: 8px;">Title</th>
                    <th style="border: 1px solid #ddd; padding: 8px;">Minimum Amount</th>
                    <th style="border: 1px solid #ddd; padding: 8px;">Discount Amount</th>
                    <th style="border: 1px solid #ddd; padding: 8px;">Categories Names</th>
                    <th style="border: 1px solid #ddd; padding: 8px;">Is Active</th>
                    <th style="border: 1px solid #ddd; padding: 8px;">Is Stop</th>
                </tr>
            </thead>
        `;

            const tbody = Object.values(discountRules).map(rule => {
            const data = rule.data || {};
            return `

                <tr>
                    <td style="border: 1px solid #ddd; padding: 8px;">${rule.id}</td>
                    <td style="border: 1px solid #ddd; padding: 8px;">${rule.type}</td>
                    <td style="border: 1px solid #ddd; padding: 8px;">${rule.title}</td>
                    <td style="border: 1px solid #ddd; padding: 8px;">${data.min_cat_amount || ''}</td>
                    <td style="border: 1px solid #ddd; padding: 8px;">${data.discount_amount || ''}</td>
                    <td style="border: 1px solid #ddd; padding: 8px;">${(data.categories_names || []).join(', ')}</td>
                    <td style="border: 1px solid #ddd; padding: 8px;">${rule.is_active}</td>
                    <td style="border: 1px solid #ddd; padding: 8px;">${rule.is_stop}</td>
                </tr>
            `;
        }).join('');

        table.innerHTML = thead + `<tbody>${tbody}</tbody>`;
        return table;
    };

    const createShippingTable = (shipmentMethod) => {
        if (!shipmentMethod) {
            const div = document.createElement('div');
            div.innerHTML = '<strong>No selected shipping found. Reload the page once selected.</strong>';
            return div;
        }

        const table = document.createElement('table');
        table.style.width = '100%';
        table.style.borderCollapse = 'collapse';
        table.style.marginTop = '10px';

        const thead = `
            <thead>
                <tr>
                    <th style="border: 1px solid #ddd; padding: 8px;">ShipmentID</th>
                    <th style="border: 1px solid #ddd; padding: 8px;">Tax Rate</th>
                    <th style="border: 1px solid #ddd; padding: 8px;">Title</th>
                    <th style="border: 1px solid #ddd; padding: 8px;">Method</th>
                    <th style="border: 1px solid #ddd; padding: 8px;">ID</th>
                    <th style="border: 1px solid #ddd; padding: 8px;">Discount</th>
                    <th style="border: 1px solid #ddd; padding: 8px;">Service Point</th>
                </tr>
            </thead>
        `;

        const tbody = `
            <tr>
                <td style="border: 1px solid #ddd; padding: 8px;">${shipmentMethod.id}</td>
                <td style="border: 1px solid #ddd; padding: 8px;">${shipmentMethod.tax_rate}</td>
                <td style="border: 1px solid #ddd; padding: 8px;">${shipmentMethod.title}</td>
                <td style="border: 1px solid #ddd; padding: 8px;">${shipmentMethod.data.method}</td>
                <td style="border: 1px solid #ddd; padding: 8px;">${shipmentMethod.data.shipment_id}</td>
                <td style="border: 1px solid #ddd; padding: 8px;">${shipmentMethod.discount}</td>
                <td style="border: 1px solid #ddd; padding: 8px;">${shipmentMethod.is_service_point}</td>
            </tr>
        `;

        table.innerHTML = thead + `<tbody>${tbody}</tbody>`;
        return table;
    };

    fetchCheckoutData();
})();
