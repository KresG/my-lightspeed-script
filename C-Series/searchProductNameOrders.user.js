// ==UserScript==
// @name     Search Product Name in all Orders
// @match    */admin/orders*
// @require  http://code.jquery.com/jquery-3.4.1.min.js
// @author   Kres
// @description  Search all orders for a specific product, including all order statuses. Modified script of "OrderCanHasProduct?"
// @version  1
// @icon     https://stg-assets.lightspeedhq.com/img/e4ce23b4-news_speeder_signup_newsupdate_illustration_optimized.png
// ==/UserScript==

// Global variables:
const elements = []; // Array to store matching order numbers
var all = true; // Mode: always check all orders
var started = false; // Flag to prevent multiple runs

// Step 0: Create app display:
addon();
$("#but").click(function() {
    if (!started) {
        logic();
    }
});
$("#butter").click(function() {
    mode();
});

// Step 1: Create the app display:
function addon() {
    // Add features to page:
    $("#content > div:nth-child(3)").append(`
    <div id='canhaz' style="padding: 10px;background-color:currentcolor;display: grid;">
    <p style='color:white;'>Search for the full product title to see where it has been added to orders.</p>
    <br>
    <p id="andyStatus" style="color:white;">STATUS: AWAITING INPUT</p>
    <input type='text' id='fname' placeholder='Product name'>
    <button id='butter' style='color:red'>All orders?</button>
    <button id='but'>Search Orders!</button>
    </div>`);
}

// Step 2: Read the list of order pages:
async function logic() {
    try {
        document.querySelector("#andyStatus").innerHTML = "STATUS: GATHERING DATA - Searching for product in orders...";
        started = true;
        var baseURL = document.URL;
        var URL = baseURL.split('?')[0] + ".json"; // Ensure URL is correctly formatted for JSON

        // Fetch the first page of orders:
        var data = await $.getJSON(URL);
        var totalPages = data.links.pages || 1; // Ensure totalPages is defined

        for (let i = 0; i < totalPages; i++) {
            document.querySelector("#andyStatus").innerHTML = `STATUS: GATHERING DATA - Processing page ${i + 1} of ${totalPages}...`;
            await sleep(1000); // Delay to prevent overwhelming server
            await getOrders(baseURL + `.json?page=${i + 1}`);
        }

        document.querySelector("#andyStatus").innerHTML = "STATUS: FINALIZING - Preparing results...";
        await sleep(2000);
        printer();
        document.querySelector("#andyStatus").innerHTML = "STATUS: DONE - Search completed!";
        started = false;
    } catch (error) {
        console.error("An error occurred:", error);
        document.querySelector("#andyStatus").innerHTML = "STATUS: ERROR - Something went wrong. Check console for details.";
    }
}

// Step 2.5: Get JSON of each order listing page & add elements based on criteria:
async function getOrders(orderPage) {
    try {
        var data = await $.getJSON(orderPage);
        var product = document.querySelector("#fname").value;

        for (let i = 0; i < data.orders.length; i++) {
            var currentOrder = data.orders[i].number;
            var status = data.orders[i].status;

            // Check all orders
            searchProducts(data.orders[i], product, currentOrder, status);
        }
    } catch (error) {
        console.error("Error fetching orders:", error);
        throw error;
    }
}

// Helper function to search products within an order:
function searchProducts(order, product, currentOrder, status) {
    for (let j = 0; j < order.order_products.length; j++) {
        if (order.order_products[j].product_title === product) {
            elements.push(`${currentOrder} - ${status}`);
        }
    }
}

// Step 3: Display data on page:
function printer() {
    var product = document.querySelector("#fname").value;
    elements.sort();

    $("#canhaz").append(`<p style="background-color:lightblue"> ${product} was found in these orders:</p>`);

    for (var x = 0; x < elements.length; x++) {
        $("#canhaz").append(`<p style="background-color:lightgreen">${elements[x]}</p>`);
    }

    elements.length = 0; // Clear the array for the next run
}

// Helper function: Toggle all orders mode or just cancelled/awaiting payment:
function mode() {
    var button = $('#butter');
    all = !all;
    button.css('color', all ? 'green' : 'red');
}

// Helper function: Sleep for a specified time
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// Helper function: Wait for an element to exist on the page
function waitForElement(selector, timeout = 10000) { // Default timeout set to 10 seconds
    return new Promise((resolve, reject) => {
        const interval = 100; // Check every 100ms
        const maxAttempts = timeout / interval;
        let attempts = 0;

        const checkExist = setInterval(() => {
            const element = document.querySelector(selector);
            if (element) {
                clearInterval(checkExist);
                resolve(element);
            } else if (attempts > maxAttempts) {
                clearInterval(checkExist);
                reject(new Error(`[USO] Button detection aborting due to timeout: ${selector}`));
            }
            attempts++;
        }, interval);
    });
}
