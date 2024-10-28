// ==UserScript==
// @name         Orders - Added Columns
// @namespace    http://tampermonkey.net/
// @version      1.0
// @author       Kres G.
// @description  Adds Payment provider, order ID and region data to the orders page
// @match        */admin/orders*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    function getPageNumber() {
        const urlParams = new URLSearchParams(window.location.search);
        return urlParams.get('page') || 1;
    }

    function fetchAndInsertColumns() {
        const pageNumber = getPageNumber();
        const apiUrl = `${window.location.origin}/admin/orders.json?page=${pageNumber}`;

        fetch(apiUrl)
            .then(response => response.json())
            .then(data => insertColumns(data.orders))
            .catch(error => console.error('Error fetching orders:', error));
    }

    function insertColumns(orders) {
        const tableHeaderRow = document.querySelector(".M0.NotRounded.RoundedBottom thead tr");
        if (!tableHeaderRow) return;

        // Insert Payment Provider Header
        if (!tableHeaderRow.querySelector('.payment-provider-header')) {
            const grandTotalHeader = Array.from(tableHeaderRow.children).find(th => th.innerText.includes('Grand Total'));
            if (grandTotalHeader) {
                const paymentHeaderCell = document.createElement('th');
                paymentHeaderCell.classList.add('payment-provider-header');
                paymentHeaderCell.innerText = 'Payment';
                grandTotalHeader.insertAdjacentElement('afterend', paymentHeaderCell);
            }
        }

        // Insert Order ID Header
        if (!tableHeaderRow.querySelector('.order-id-header')) {
            const paymentProviderHeader = tableHeaderRow.querySelector('.payment-provider-header');
            if (paymentProviderHeader) {
                const orderIdHeaderCell = document.createElement('th');
                orderIdHeaderCell.classList.add('order-id-header');
                orderIdHeaderCell.innerText = 'Order ID';
                paymentProviderHeader.insertAdjacentElement('afterend', orderIdHeaderCell);
            }
        }

        // Insert Shipping Region Header
        if (!tableHeaderRow.querySelector('.region-header')) {
            const orderIdHeader = tableHeaderRow.querySelector('.order-id-header');
            if (orderIdHeader) {
                const regionHeaderCell = document.createElement('th');
                regionHeaderCell.classList.add('region-header');
                regionHeaderCell.innerText = 'Region';
                orderIdHeader.insertAdjacentElement('afterend', regionHeaderCell);
            }
        }

        document.querySelectorAll(".M0.NotRounded.RoundedBottom tbody tr").forEach(row => {
            const orderId = row.getAttribute('data-id');
            const order = orders.find(o => o.id.toString() === orderId);

            if (order) {
                // Insert Payment Provider Data
                let paymentProviderCell = row.querySelector('.payment-provider-cell');
                if (!paymentProviderCell) {
                    const grandTotalCell = row.querySelectorAll('td')[7];
                    paymentProviderCell = document.createElement('td');
                    paymentProviderCell.classList.add('payment-provider-cell');

                    const paymentKey = order.payment_provider_key || 'N/A';
                    const giftCardPayments = order.gift_card_payments || [];
                    const giftCardText = giftCardPayments.length > 0 ? ' + GC' : '';

                    paymentProviderCell.innerText = paymentKey + giftCardText;
                    grandTotalCell.insertAdjacentElement('afterend', paymentProviderCell);
                }

                // Insert Order ID
                let orderIdCell = row.querySelector('.order-id-cell');
                if (!orderIdCell) {
                    orderIdCell = document.createElement('td');
                    orderIdCell.classList.add('order-id-cell');
                    orderIdCell.innerText = order.id;
                    paymentProviderCell.insertAdjacentElement('afterend', orderIdCell);
                }

                // Insert Shipping Region Data
                let regionCell = row.querySelector('.region-cell');
                if (!regionCell) {
                    regionCell = document.createElement('td');
                    regionCell.classList.add('region-cell');
                    regionCell.innerText = order.shipping_address_region_name || 'N/A';
                    orderIdCell.insertAdjacentElement('afterend', regionCell);
                }
            }
        });
    }

    const observer = new MutationObserver(() => {
        const tableHeader = document.querySelector(".M0.NotRounded.RoundedBottom thead tr");
        if (tableHeader) {
            fetchAndInsertColumns();
        }
    });

    observer.observe(document.body, { childList: true, subtree: true });

    fetchAndInsertColumns();
})();
