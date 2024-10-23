// ==UserScript==
// @name         Domain DNS Checker
// @namespace    http://tampermonkey.net/
// @match        */admin/domains
// @version      1.2
// @author       Kres G - eCom Support
// @description  Display domain CNAME and A Records using Google DNS (Added Conflictiing Records)
// @grant        none
// @updateURL    https://github.com/KresG/my-lightspeed-script/raw/main/C-Series/domainDnsChecker.meta.js
// @downloadURL  https://github.com/KresG/my-lightspeed-script/raw/main/C-Series/domainDnsChecker.user.js
// ==/UserScript==

(function() {
    'use strict';

    const shopUrl = `https://${location.host}`;
    const jsonUrl = `${shopUrl}/admin/domains.json`;
    const dnsApiUrl = 'https://dns.google/resolve';

    const expectedARecords = {
        shoplightspeed: ['162.159.129.85', '162.159.130.85'],
        webshopapp: ['104.16.8.49', '104.17.156.30']
    };

    const cnameFormats = {
        shoplightspeed: domain => `${domain}.shoplightspeed.com`,
        webshopapp: domain => `${domain}.shops.webshopapp.com`
    };

    function normalizeCnameRecord(cnameRecord) {
        return cnameRecord.replace(/\.$/, ''); // Remove trailing period if present
    }

    async function fetchCnameRecord(subdomain) {
        try {
            const response = await fetch(`${dnsApiUrl}?name=${subdomain}&type=CNAME`);
            if (!response.ok) throw new Error('Network response was not ok');
            const data = await response.json();
            if (data.Answer && data.Answer.length > 0) {
                return data.Answer[0].data;
            } else {
                return 'No CNAME record found';
            }
        } catch (error) {
            console.error(`Error fetching CNAME record for ${subdomain}:`, error);
            return 'Error fetching CNAME record';
        }
    }

    async function fetchARecord(domain) {
        try {
            const response = await fetch(`${dnsApiUrl}?name=${domain}&type=A`);
            if (!response.ok) throw new Error('Network response was not ok');
            const data = await response.json();
            if (data.Answer && data.Answer.length > 0) {
                return data.Answer.map(record => record.data).join(', ');
            } else {
                return 'No A record found';
            }
        } catch (error) {
            console.error(`Error fetching A record for ${domain}:`, error);
            return 'Error fetching A record';
        }
    }

    function checkARecords(aRecords, expectedRecords) {
        const records = aRecords.split(', ').map(record => record.trim());
        const missingRecords = expectedRecords.filter(record => !records.includes(record));
        const unexpectedRecords = records.filter(record => !expectedRecords.includes(record));
        return {
            allPresent: missingRecords.length === 0 && unexpectedRecords.length === 0,
            missingRecords,
            unexpectedRecords
        };
    }

    function checkCnameFormat(cnameRecord, expectedFormat) {
        return normalizeCnameRecord(cnameRecord) === normalizeCnameRecord(expectedFormat);
    }

    function extractRootDomain(subDomainName) {
        const parts = subDomainName.split('.');
        if (parts.length >= 5) {
            return parts.slice(-4).join('.');
        } else if (parts.length === 4) {
            return parts.slice(-3).join('.');
        } else if (parts.length === 3) {
            return parts.slice(-2).join('.');
        }
        return subDomainName;
    }

    async function fetchAndDisplayData() {
        try {
            const response = await fetch(jsonUrl);
            if (!response.ok) throw new Error('Network response was not ok');
            const data = await response.json();

            if (data.sub_domains && Array.isArray(data.sub_domains)) {
                console.log('Array name: sub_domains');

                const table = document.createElement('table');
                table.style.width = '80%';
                table.style.margin = '20px 10%';
                table.style.borderCollapse = 'collapse';
                table.style.border = '1px solid #ddd';

                const headerRow = document.createElement('tr');
                const headerSubDomainDomain = document.createElement('th');
                headerSubDomainDomain.textContent = 'Sub Domain / Domain';
                headerSubDomainDomain.style.border = '1px solid #ddd';
                headerSubDomainDomain.style.padding = '8px';
                headerSubDomainDomain.style.textAlign = 'left';
                headerSubDomainDomain.style.backgroundColor = '#f2f2f2';
                headerRow.appendChild(headerSubDomainDomain);
                table.appendChild(headerRow);

                const domainPart = shopUrl.split('.')[1];
                const expectedRecords = expectedARecords[domainPart] || [];
                const cnameFormat = cnameFormats[domainPart];

                for (const subDomain of data.sub_domains) {
                    if (subDomain.host_name && subDomain.shop_id) {
                        const subDomainName = subDomain.host_name;
                        const domainName = extractRootDomain(subDomainName);
                        const shopId = subDomain.shop_id;

                        const expectedCname = cnameFormat(shopId);

                        const cnameRecord = await fetchCnameRecord(subDomainName);
                        const aRecord = await fetchARecord(domainName);

                        const { allPresent, missingRecords, unexpectedRecords } = checkARecords(aRecord, expectedRecords);
                        const aRecordStatusIcon = allPresent ? '✔️' : '❌';
                        const aRecordMissingText = !allPresent ? `<br><strong>Required A Records:</strong> ${expectedRecords.join(', ')}` : '';
                        const aRecordConflictText = unexpectedRecords.length > 0 ? `<br><strong>Conflict:</strong> Unexpected A Records found - ${unexpectedRecords.join(', ')}` : '';

                        const cnameStatusIcon = checkCnameFormat(cnameRecord, expectedCname) ? '✔️' : '❌';
                        const cnameMissingText = cnameStatusIcon === '❌' ? `<br><strong>Required CNAME Record:</strong> ${expectedCname}` : '';

                        const subDomainRow = document.createElement('tr');
                        const subDomainCell = document.createElement('td');
                        subDomainCell.innerHTML = `
                            <strong>Subdomain:</strong> ${subDomainName}<br>
                            <strong>CNAME:</strong> <a href="https://dns.google/resolve?name=${encodeURIComponent(subDomainName)}&type=CNAME" target="_blank">${cnameRecord} ${cnameStatusIcon}</a>
                            ${cnameMissingText}
                        `;
                        subDomainCell.style.border = '1px solid #ddd';
                        subDomainCell.style.padding = '8px';
                        subDomainRow.appendChild(subDomainCell);
                        table.appendChild(subDomainRow);

                        const domainRow = document.createElement('tr');
                        const domainCell = document.createElement('td');
                        domainCell.innerHTML = `
                            <strong>Domain:</strong> ${domainName}<br>
                            <strong>A Record:</strong> <a href="https://dns.google/resolve?name=${encodeURIComponent(domainName)}&type=A" target="_blank">${aRecord} ${aRecordStatusIcon}</a>
                            ${aRecordMissingText}
                            ${aRecordConflictText}
                        `;
                        domainCell.style.border = '1px solid #ddd';
                        domainCell.style.padding = '8px';
                        domainRow.appendChild(domainCell);
                        table.appendChild(domainRow);
                    }
                }

                const referenceElement = document.getElementById('table_sub_domains');
                if (referenceElement) {
                    referenceElement.parentNode.insertBefore(table, referenceElement.nextSibling);
                    const descriptions = document.createElement('div');
                    descriptions.style.margin = '20px 10%';
                    descriptions.innerHTML = `
                        <ul>
                            <li>If the CNAME record is missing, trying to access the subdomain might result in an error.</li>
                            <li>If the A record is missing, trying to access the domain might also result in an error.</li>
                            <li>If there are unexpected A records, these may indicate a conflict that could cause issues with the domain. Request to take note of the conflict record and delete it in their domain DNS portal.</li>
                        </ul>
                        </br><p>After updating the DNS records, it may take some time for the changes to propagate. To speed up the process and trigger the SSL certificate, it might be necessary to delete and re-add the domain. However, always get permission from the merchant before doing this because deleting and re-adding the domain can affect both the subdomain and the domain.</p>
                        </br><p><strong>Helpful Links:</strong></p>
                        <ul>
                            <li><a href="https://lightspeedhq.atlassian.net/wiki/spaces/CLOUD/pages/139428315/Domain+Troubleshooting" target="_blank">Confluence</a></li>
                            <li><a href="https://ecom-support.lightspeedhq.com/hc/en-us/articles/360024200053-Domain-setup-troubleshooting" target="_blank">Customer Facing Article</a></li>
                        </ul>
                    `;
                    referenceElement.parentNode.insertBefore(descriptions, referenceElement.nextSibling.nextSibling);
                } else {
                    console.error('Reference element #table_sub_domains not found.');
                }
            } else {
                console.error('sub_domains array not found or is not an array.');
            }
        } catch (error) {
            console.error('Error fetching or displaying data:', error);
        }
    }

    window.addEventListener('load', fetchAndDisplayData);
})();
