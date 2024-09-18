// ==UserScript==
// @name        Discount Codes Exporter
// @match       */admin/discount_codes*
// @require     http://code.jquery.com/jquery-3.4.1.min.js
// @require     https://cdnjs.cloudflare.com/ajax/libs/FileSaver.js/2.0.5/FileSaver.min.js
// @author      Gerben | Some alteration by Kres G - C-series Support
// @description Creates an optimized export of all discount codes
// @version     1
// @icon        https://stg-assets.lightspeedhq.com/img/e4ce23b4-news_speeder_signup_newsupdate_illustration_optimized.png
// ==/UserScript==
// Ensure that jQuery is loaded before executing the script
(function () {
    "use strict";

    // Define the target URL path
    const targetPath = '/admin/discount_codes';

    // Declare variables
    var rPages = 0;
    var rStarted = false;
    var rTotals = 0;
    var discountData = [];

    // Check if the current URL path matches the target path
    if (location.pathname === targetPath) {
        console.log("On the correct page, adding button.");

        // Create and add the button and other elements
        $(".css-slsf62:first-child").append(`
        <div id="tdiv" class="ttdiv">
          <table class="toolTable">
            <tr>
              <th>DATA TYPE</th>
              <th>DATA VALUE</th>
            </tr>
            <tr>
              <td>ShopID</td>
              <td id="rShopId"></td>
            </tr>
            <tr>
              <td>Total Progress</td>
              <td id="rProgress">WAITING</td>
            </tr>
            <tr>
              <td>Run Process</td>
              <td>
                <p id="rDone" style="display:none;">EXPORT COMPLETE</p>
                <button class="executeButton" id="rBut">Start Discount Export</button>
                <div class="loadzin" style="display:none;text-align: center;">
                  <div class="spinner">
                    <div></div>
                    <div></div>
                    <div></div>
                    <div></div>
                    <div></div>
                  </div>
                </div>
              </td>
            </tr>
          </table>
        </div>
        <div id="idiv" class="iidiv">
          <br /><br />
          <h1><strong>Discount Export</strong></h1>
          <p>Step 1: Click "Start Discount Export".</p>
          <p>Step 2: Wait for export to complete.</p>
        </div>
        `);

        $("#rBut").click(function () {
            if (!rStarted) {
                rStarted = true;
                $(".loadzin").show();
                $("#rBut").hide();
                startDiscountExport();
            }
        });
    } else {
        console.log("Not on the correct page, button will not be added.");
    }

    async function startDiscountExport() {
        const baseURL = `https://${location.host}/admin/discount_codes`;
        const limit = 250;
        const initialData = await $.getJSON(`${baseURL}.json?limit=${limit}`);

        console.log("Initial Data:", initialData);  // Log data to verify fields

        rPages = Math.ceil(initialData.links.count / limit);
        rTotals = initialData.links.count;

        let discountsProcessed = 0;

        for (let i = 1; i <= rPages; i++) {
            const pageData = await $.getJSON(`${baseURL}.json?page=${i}&limit=${limit}`);
            console.log("Page Data:", pageData);  // Log page data to verify fields

            discountData.push(...pageData.discount_codes.map(d => ({
                discount_id: d.id || "N/A",
                code: d.code || "N/A",
                status: d.status || "N/A",
                type: d.type || "N/A",
                discount: (d.value === 0) ? '0' : (d.value || "N/A"),
                start_date: d.start_date || "N/A",
                end_date: d.end_date || "N/A"
            })));

            discountsProcessed += pageData.discount_codes.length;
            document.querySelector("#rProgress").innerHTML = `${discountsProcessed} / ${rTotals}`;
        }

        exporter();
        $(".loadzin").hide();
        $("#rDone").show();
        $("#rBut").show();
        rStarted = false;
    }

    function escapeCSV(value) {
      if (value == null) return "";
      return '"' + value.toString().replace(/"/g, '""') + '"';
    }

    function exporter() {
        var rows = ["DiscountID,DiscountCode,Status,Type,Discount,Start date,End date"];
        discountData.forEach(d => {
            rows.push([
                escapeCSV(d.discount_id),
                escapeCSV(d.code),
                escapeCSV(d.status),
                escapeCSV(d.type),
                escapeCSV(d.discount),
                escapeCSV(d.start_date),
                escapeCSV(d.end_date)
            ].join(","));
        });

        let csvContent = new Blob([rows.join("\r\n")], {type: 'text/csv;charset=utf-8;'});
        saveAs(csvContent, "discountExport.csv");
    }

})();
