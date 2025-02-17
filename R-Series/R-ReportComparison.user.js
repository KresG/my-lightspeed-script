// ==UserScript==
// @name         R-ReportComparison
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  Compare two sets of data and identify discrepancies. The first column is the identifier.
// @author       Kres G
// @match        */?form_name=ui_tab&tab=reports
// ==/UserScript==

(function() {
    'use strict';

    function createUI() {
        let container = document.createElement('div');
        container.style.position = 'fixed';
        container.style.top = '10px';
        container.style.right = '10px';
        container.style.background = 'white';
        container.style.border = '1px solid black';
        container.style.padding = '15px';
        container.style.zIndex = '9999';
        container.style.maxWidth = '400px';
        container.style.overflowY = 'auto';
        container.style.maxHeight = '500px';
        container.style.boxShadow = '0 4px 8px rgba(0,0,0,0.2)';
        container.style.borderRadius = '5px';

        // Close & Minimize Buttons
        let header = document.createElement('div');
        header.style.display = 'flex';
        header.style.justifyContent = 'space-between';
        header.style.alignItems = 'center';
        header.style.marginBottom = '10px';

        let title = document.createElement('div');
        title.innerHTML =
            `<h3>Data Comparison Tool</h3><h6><a href="https://lightspeedhq.atlassian.net/wiki/spaces/CLOUD/pages/1236041889/Basic+Reports+Column+Breakdown+Data+Calculation" target="_blank" style="color:#007BFF; text-decoration:none;">
        Basic Reports: Column Breakdown & Data Calculation</a></h6>`;
        title.style.margin = '0';
        title.style.flexGrow = '1';

        const minimizeButton = document.createElement('button');
        minimizeButton.textContent = '−';
        minimizeButton.style.marginLeft = '5px';
        minimizeButton.style.cursor = 'pointer';
        minimizeButton.onclick = () => {
            let content = document.getElementById('content');
            content.style.display = content.style.display === 'none' ? 'block' : 'none';
        };

        const closeButton = document.createElement('button');
        closeButton.textContent = 'X';
        closeButton.style.marginLeft = '5px';
        closeButton.style.cursor = 'pointer';
        closeButton.onclick = () => container.style.display = 'none';

        header.appendChild(title);
        header.appendChild(minimizeButton);
        header.appendChild(closeButton);

        // Content Area
        let content = document.createElement('div');
        content.id = 'content';

        content.innerHTML = `
            <textarea id="dataSet1" placeholder="Paste first dataset here (space-separated)" rows="5" cols="50"></textarea><br>
            <textarea id="dataSet2" placeholder="Paste second dataset here (space-separated)" rows="5" cols="50"></textarea><br>
            <button id="compareBtn">Compare</button>
            <button id="exportBtn" style="display:none;">Export Result</button>
            <div id="result" style="white-space:pre-wrap; margin-top:10px; max-height: 200px; overflow-y: auto; border: 1px solid gray; padding: 5px;"></div>
        `;

        container.appendChild(header);
        container.appendChild(content);
        document.body.appendChild(container);
    }

    // Extract Data
    function parseData(input) {
        let lines = input.trim().split("\n").map(line => line.trim().split(/\s+/));
        let dataMap = new Map();
        let duplicateKeys = new Set();
        let seenKeys = new Set();

        for (let line of lines) {
            if (line.length < 2) continue;
            let key = line[0].trim();
            let value = line.slice(1).map(v => v.trim());

            if (seenKeys.has(key)) {
                duplicateKeys.add(key); // Track duplicate IDs
            }
            seenKeys.add(key);

            dataMap.set(key, value);
        }

        return { dataMap, duplicateKeys }; // Return both data and duplicates
    }

    // Compare Data
    function compareData() {
        let { dataMap: dataSet1, duplicateKeys: dup1 } = parseData(document.getElementById("dataSet1").value);
        let { dataMap: dataSet2, duplicateKeys: dup2 } = parseData(document.getElementById("dataSet2").value);
        let result = [];

        // ✅ Check for Duplicates
        if (dup1.size > 0) {
            result.push(`🟣 Duplicate IDs found in Dataset 1: ${[...dup1].join(", ")}`);
        }
        if (dup2.size > 0) {
            result.push(`🔵 Duplicate IDs found in Dataset 2: ${[...dup2].join(", ")}`);
        }

        let allKeys = new Set([...dataSet1.keys(), ...dataSet2.keys()]);

        for (let key of allKeys) {
            let val1 = dataSet1.get(key);
            let val2 = dataSet2.get(key);

            if (!val1) {
                result.push(`🔴 ID ${key} is MISSING in Dataset 1`);
            } else if (!val2) {
                result.push(`🟠 ID ${key} is MISSING in Dataset 2`);
            } else if (JSON.stringify(val1) !== JSON.stringify(val2)) {
                result.push(`⚠️ Difference in ID ${key}: \n   Dataset 1: ${val1.join(" ")} \n   Dataset 2: ${val2.join(" ")}`);
            }
        }

        let resultText = result.length ? result.join("\n") : "✅ No Differences Found";
        document.getElementById("result").textContent = resultText;

        // Show export button if there are results
        document.getElementById("exportBtn").style.display = result.length ? "inline-block" : "none";
    }

    // Export result to TXT file
    function exportResult() {
        let resultText = document.getElementById("result").textContent;
        let blob = new Blob([resultText], { type: "text/plain" });
        let link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = "comparison_result.txt";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    // Add UI and Event Listeners
    createUI();
    document.getElementById("compareBtn").addEventListener("click", compareData);
    document.getElementById("exportBtn").addEventListener("click", exportResult);
})();
