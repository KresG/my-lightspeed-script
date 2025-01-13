// ==UserScript==
// @name         Email DNS Records Checker
// @namespace    http://tampermonkey.net/
// @match        */admin/settings/company/email_dns
// @version      1.1
// @author       Kres G - eCom Support
// @description  Display DNS records, check CNAME, DMARC, and DKIM records using Google DNS API
// @grant        none
// @updateURL    https://github.com/KresG/my-lightspeed-script/raw/main/C-Series/emailDnsChecker.meta.js
// @downloadURL  https://github.com/KresG/my-lightspeed-script/raw/main/C-Series/emailDnsChecker.user.js
// ==/UserScript==

(function() {
    'use strict';

    // Create and style the button
    const button = document.createElement('button');
    button.textContent = 'Show DNS Records and Policies';
    button.style.padding = '10px 20px';
    button.style.marginTop = '20px';
    button.style.display = 'block';
    button.style.margin = '0 auto';

    // Button
    const targetElement = document.querySelector('#content .container:nth-child(2)');
    if (targetElement) {
        targetElement.appendChild(button);
    }

    // Container for the results
    const resultContainer = document.createElement('div');
    resultContainer.style.marginTop = '20px';
    resultContainer.style.padding = '10px';
    targetElement.appendChild(resultContainer);

    button.addEventListener('click', async () => {
        const shopUrl = `https://${location.host}`;
        const jsonUrl = `${shopUrl}/admin/settings/company/email_dns.json`;

        try {
            const response = await fetch(jsonUrl);
            if (!response.ok) throw new Error('Network response was not ok');
            const data = await response.json();

            // Navigate to the DNS array in the JSON data
            const domains = data?.shop?.data?.email_validation?.domains;
            const domainKey = Object.keys(domains).pop(); // Get the last domain key
            const dnsRecords = domains?.[domainKey]?.dns;

            if (!dnsRecords || !Array.isArray(dnsRecords)) {
                throw new Error('Required data is missing in the JSON response.');
            }

            // Clear previous results
            resultContainer.innerHTML = '';

            // Table to display the DNS records
            const table = document.createElement('table');
            table.style.width = '100%';
            table.style.borderCollapse = 'collapse';
            table.style.marginTop = '10px';

            // Create the header row
            const headerRow = document.createElement('tr');
            const headers = ['Host', 'Type', 'CNAME Record', 'DKIM Record', 'TTL'];
            headers.forEach(headerText => {
                const header = document.createElement('th');
                header.textContent = headerText;
                header.style.border = '1px solid #ccc';
                header.style.padding = '8px';
                header.style.textAlign = 'left';
                headerRow.appendChild(header);
            });
            table.appendChild(headerRow);

            // Function to fetch CNAME record
            async function fetchCnameRecord(host) {
                const url = `https://dns.google/resolve?name=${encodeURIComponent(host)}&type=CNAME`;
                try {
                    const response = await fetch(url, {
                        headers: {
                            'Accept': 'application/dns-json'
                        }
                    });
                    if (!response.ok) throw new Error('Network response was not ok');
                    const data = await response.json();
                    const answer = data.Answer || [];
                    if (answer.length > 0) {
                        return answer.map(a => a.data.replace(/\.$/, '')).join(', '); // Remove trailing period
                    } else {
                        return 'No CNAME record found';
                    }
                } catch (error) {
                    return 'Error fetching CNAME record';
                }
            }

            // Function to fetch TTL value
            async function fetchTtlValue(host, type) {
                const url = `https://dns.google/resolve?name=${encodeURIComponent(host)}&type=${type}`;
                try {
                    const response = await fetch(url, {
                        headers: {
                            'Accept': 'application/dns-json'
                        }
                    });
                    if (!response.ok) throw new Error('Network response was not ok');
                    const data = await response.json();
                    const answer = data.Answer || [];
                    if (answer.length > 0) {
                        return answer[0].TTL || 'N/A';
                    } else {
                        return 'N/A';
                    }
                } catch (error) {
                    return 'Error fetching TTL';
                }
            }

            // Function to create an icon based on match status
            function createStatusIcon(match) {
                const icon = document.createElement('span');
                icon.style.fontSize = '16px';
                icon.style.marginLeft = '10px';
                if (match) {
                    icon.innerHTML = '✔️';
                    icon.style.color = '#00FF00';
                } else {
                    icon.innerHTML = '❌';
                    icon.style.color = '#FF0000';
                }
                return icon;
            }

            // Populate the table with DNS records
            for (let i = 0; i < dnsRecords.length; i++) {
                const record = dnsRecords[i];
                const row = document.createElement('tr');

                // Host column
                const hostCell = document.createElement('td');
                hostCell.textContent = record.host;
                hostCell.style.border = '1px solid #ccc';
                hostCell.style.padding = '8px';
                row.appendChild(hostCell);

                // Type column
                const typeCell = document.createElement('td');
                typeCell.textContent = record.type;
                typeCell.style.border = '1px solid #ccc';
                typeCell.style.padding = '8px';
                row.appendChild(typeCell);

                // CNAME Record column
                const cnameRecord = await fetchCnameRecord(record.host);
                const cnameCell = document.createElement('td');
                cnameCell.innerHTML = `<a href="https://dns.google/resolve?name=${encodeURIComponent(record.host)}&type=CNAME" target="_blank">${cnameRecord}</a>`;
                cnameCell.style.border = '1px solid #ccc';
                cnameCell.style.padding = '8px';

                // Compare Lightspeed values with CNAME record
                if (record.data.replace(/\.$/, '') !== cnameRecord.replace(/\.$/, '')) {
                    cnameCell.appendChild(createStatusIcon(false));

                    // Required CNAME value below the result if it doesn't match
                    const requiredCname = document.createElement('div');
                    requiredCname.style.color = '#000000';
                    requiredCname.textContent = `Required CNAME: ${record.data}`;
                    cnameCell.appendChild(requiredCname);
                } else {
                    cnameCell.appendChild(createStatusIcon(true));
                }

                row.appendChild(cnameCell);

                // DKIM Record column (hidden result for the first row)
                const dkimCell = document.createElement('td');
                if (i === 0) {
                    dkimCell.textContent = '';  // Keep blank for the first row
                } else {
                    dkimCell.textContent = 'Check DKIM';
                    dkimCell.innerHTML = `<a href="https://dns.google/resolve?name=${encodeURIComponent(record.host)}&type=TXT" target="_blank">Check DKIM</a>`;
                }
                dkimCell.style.border = '1px solid #ccc';
                dkimCell.style.padding = '8px';
                row.appendChild(dkimCell);

                // TTL column
                const ttlValue = await fetchTtlValue(record.host, record.type);
                const ttlCell = document.createElement('td');
                ttlCell.textContent = ttlValue;
                ttlCell.style.border = '1px solid #ccc';
                ttlCell.style.padding = '8px';
                row.appendChild(ttlCell);

                table.appendChild(row);
            }

            resultContainer.appendChild(table);

            // Fetch and display the DMARC policy
            const rootDomain = extractRootDomain(dnsRecords[0].host);
            const dmarcHost = `_dmarc.${rootDomain}`;
            const dmarcUrl = `https://dns.google/resolve?name=${encodeURIComponent(dmarcHost)}&type=TXT`;
            const spfHost = rootDomain;
            const spfUrl = `https://dns.google/resolve?name=${encodeURIComponent(spfHost)}&type=TXT`;

            // Container for DMARC policy
            const dmarcContainer = document.createElement('div');
            dmarcContainer.style.marginTop = '20px';
            dmarcContainer.innerHTML = `<strong>Domain:</strong> ${rootDomain}<br><a href="${dmarcUrl}" target="_blank">View DMARC Query</a>`;
            resultContainer.appendChild(dmarcContainer);

            // Fetch and display DMARC policy
            try {
                const dmarcResponse = await fetch(dmarcUrl, {
                    headers: {
                        'Accept': 'application/dns-json'
                    }
                });
                if (!dmarcResponse.ok) throw new Error('Network response was not ok');
                const dmarcData = await dmarcResponse.json();
                const dmarcRecords = dmarcData.Answer || [];
                let dmarcPolicy = 'No DMARC record found';

                for (const record of dmarcRecords) {
                    if (record.data.startsWith('v=DMARC1')) {
                        dmarcPolicy = record.data;
                        break;
                    }
                }

                dmarcContainer.innerHTML += `<br><strong>DMARC Policy:</strong> <span style="background-color: #000; color: #fff; padding: 2px 4px;">${dmarcPolicy}</span>`;

                // New table if no DMARC record is found
                if (dmarcPolicy === 'No DMARC record found') {
                    const title = document.createElement('h5');
                    title.textContent = '**Example of how to add the DMARC policy**';
                    resultContainer.appendChild(title);

                    const policyTable = document.createElement('table');
                    policyTable.style.width = '100%';
                    policyTable.style.borderCollapse = 'collapse';
                    policyTable.style.marginTop = '10px';

                    // Header row for the policy table
                    const policyHeaderRow = document.createElement('tr');
                    const policyHeaders = ['Record Type', 'Name', 'Value'];
                    policyHeaders.forEach(headerText => {
                        const header = document.createElement('th');
                        header.textContent = headerText;
                        header.style.border = '1px solid #ccc';
                        header.style.padding = '8px';
                        header.style.textAlign = 'left';
                        policyHeaderRow.appendChild(header);
                    });
                    policyTable.appendChild(policyHeaderRow);

                    // Row for the example DMARC record
                    const exampleRecord = {
                        recordType: 'TXT',
                        name: '_dmarc',
                        value: 'v=DMARC1; p=none;'
                    };
                    const exampleRow = document.createElement('tr');

                    const typeCell = document.createElement('td');
                    typeCell.textContent = exampleRecord.recordType;
                    typeCell.style.border = '1px solid #ccc';
                    typeCell.style.padding = '2px 5px';
                    exampleRow.appendChild(typeCell);

                    const nameCell = document.createElement('td');
                    nameCell.textContent = exampleRecord.name;
                    nameCell.style.border = '1px solid #ccc';
                    nameCell.style.padding = '2px 5px';
                    exampleRow.appendChild(nameCell);

                    const valueCell = document.createElement('td');
                    valueCell.textContent = exampleRecord.value;
                    valueCell.style.border = '1px solid #ccc';
                    valueCell.style.padding = '2px 5px';
                    exampleRow.appendChild(valueCell);

                    policyTable.appendChild(exampleRow);

                    // Additional rows for other policies
                    const policies = [
                        { recordType: 'TXT', name: '_dmarc', value: 'v=DMARC1; p=reject;' },
                        { recordType: 'TXT', name: '_dmarc', value: 'v=DMARC1; p=quarantine;' }
                    ];

                    policies.forEach(({ recordType, name, value }) => {
                        const policyRow = document.createElement('tr');

                        const policyTypeCell = document.createElement('td');
                        policyTypeCell.textContent = recordType;
                        policyTypeCell.style.border = '1px solid #ccc';
                        policyTypeCell.style.padding = '2px 5px';
                        policyRow.appendChild(policyTypeCell);

                        const policyNameCell = document.createElement('td');
                        policyNameCell.textContent = name;
                        policyNameCell.style.border = '1px solid #ccc';
                        policyNameCell.style.padding = '2px 5px';
                        policyRow.appendChild(policyNameCell);

                        const policyValueCell = document.createElement('td');
                        policyValueCell.textContent = value;
                        policyValueCell.style.border = '1px solid #ccc';
                        policyValueCell.style.padding = '2px 5px';
                        policyRow.appendChild(policyValueCell);

                        policyTable.appendChild(policyRow);
                    });

                    resultContainer.appendChild(policyTable);
                }
            } catch (error) {
                dmarcContainer.innerHTML += '<br><strong>DMARC Policy:</strong> Error fetching DMARC policy';
            }

            // Container for SPF policy
            const spfContainer = document.createElement('div');
            spfContainer.style.marginTop = '20px';
            spfContainer.innerHTML = `<a href="${spfUrl}" target="_blank">View SPF Query</a>`;
            resultContainer.appendChild(spfContainer);

            // Fetch and display SPF policy
            try {
                const spfResponse = await fetch(spfUrl, {
                    headers: {
                        'Accept': 'application/dns-json'
                    }
                });
                if (!spfResponse.ok) throw new Error('Network response was not ok');
                const spfData = await spfResponse.json();
                const spfRecords = spfData.Answer || [];
                let spfPolicy = 'No SPF record found';

                for (const record of spfRecords) {
                    if (record.data.startsWith('v=spf1')) {
                        spfPolicy = record.data;
                        break;
                    }
                }

                spfContainer.innerHTML += `<br><strong>SPF Policy:</strong> <span style="background-color: #000; color: #fff; padding: 2px 4px;">${spfPolicy}</span>`;
            } catch (error) {
                spfContainer.innerHTML += '<br><strong>SPF Policy:</strong> Error fetching SPF policy';
            }

        } catch (error) {
            resultContainer.innerHTML = `<p style="color: #FF0000;">Error: ${error.message}</p>`;
        }

        // Notes section
        const notesContainer = document.createElement('div');
        notesContainer.style.marginTop = '20px';
        notesContainer.style.padding = '10px';
        notesContainer.style.border = '1px solid #ccc';
        notesContainer.style.borderRadius = '5px';
        notesContainer.style.backgroundColor = '#f9f9f9';

        // Create notes
        const notesTitle = document.createElement('h5');
        notesTitle.textContent = 'Notes:';
        notesContainer.appendChild(notesTitle);

        const notesList = document.createElement('ul');
        const notes = [
            'We recommend starting with the p=none policy. They can move to p=quarantine or p=reject once they have a better understanding of their sending reputation.',
            'The email address added in generic and service email should be all small letter.',
            '<a href="https://lightspeedhq.atlassian.net/wiki/spaces/CLOUD/pages/380567587/DMARC+-+Troubleshooting+for+Company+email+settings" target="_blank">Confluence link</a>',
            '<a href="https://ecom-support.lightspeedhq.com/hc/en-us/articles/115000733793-Adding-your-store-s-brand-domain-to-your-emails#h_01HMSGC9GEYDNKZFKM7RNW3FJY" target="_blank">Help Center Article link</a>'
        ];

        notes.forEach(note => {
            const listItem = document.createElement('li');
            listItem.innerHTML = note;
            listItem.style.fontSize = '10px';
            notesList.appendChild(listItem);
        });

        notesContainer.appendChild(notesList);
        resultContainer.appendChild(notesContainer);

    });

    // Extract root domain
    function extractRootDomain(host) {
        const parts = host.split('.');
        if (parts.length >= 5) {
            return parts.slice(-4).join('.');
        } else if (parts.length >= 4) {
            return parts.slice(-3).join('.');
        } else {
            return parts.slice(-2).join('.');
        }
    }
})();
