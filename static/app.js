document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const refreshBtn = document.getElementById('refresh-btn');
    const refreshIcon = document.getElementById('refresh-icon');
    const searchInput = document.getElementById('search-input');
    const filterPills = document.querySelectorAll('.pill');
    const loadingState = document.getElementById('loading-state');
    const errorState = document.getElementById('error-state');
    const errorMessage = document.getElementById('error-message');
    const retryBtn = document.getElementById('retry-btn');
    const feedList = document.getElementById('feed-list');
    const exportCsvBtn = document.getElementById('export-csv-btn');
    const themeToggleBtn = document.getElementById('theme-toggle-btn');
    const themeIcon = document.getElementById('theme-icon');
    
    // Theme initialization
    const currentTheme = localStorage.getItem('theme') || 'dark';
    if (currentTheme === 'light') {
        document.body.classList.add('light-mode');
        themeIcon.setAttribute('data-lucide', 'moon');
    }

    // Theme Toggle Handler
    themeToggleBtn.addEventListener('click', () => {
        document.body.classList.toggle('light-mode');
        const isLight = document.body.classList.contains('light-mode');
        
        localStorage.setItem('theme', isLight ? 'light' : 'dark');
        themeIcon.setAttribute('data-lucide', isLight ? 'moon' : 'sun');
        if (window.lucide) {
            window.lucide.createIcons();
        }
    });
    
    // Tweet Modal Elements
    const tweetModal = document.getElementById('tweet-modal');
    const tweetTextarea = document.getElementById('tweet-textarea');
    const charCounter = document.getElementById('char-counter');
    const closeModalBtn = document.getElementById('close-modal-btn');
    const cancelTweetBtn = document.getElementById('cancel-tweet-btn');
    const sendTweetBtn = document.getElementById('send-tweet-btn');
    const floatingTweetBtn = document.getElementById('floating-tweet-btn');

    // State Variables
    let allReleaseItems = []; // Array of structured release update items
    let currentFilterType = 'all';
    let searchQuery = '';

    // Initialize Lucide Icons
    if (window.lucide) {
        window.lucide.createIcons();
    }

    // Load data on startup
    fetchReleases();

    // Event Listeners
    refreshBtn.addEventListener('click', fetchReleases);
    retryBtn.addEventListener('click', fetchReleases);

    // Export to CSV handler
    exportCsvBtn.addEventListener('click', () => {
        const url = `/api/releases/bigquery_releases.csv?query=${encodeURIComponent(searchQuery)}&type=${encodeURIComponent(currentFilterType)}`;
        const link = document.createElement("a");
        link.href = url;
        link.download = "bigquery_releases.csv";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    });

    // Search input handler (with debounce/immediate feedback)
    searchInput.addEventListener('input', (e) => {
        searchQuery = e.target.value.toLowerCase().trim();
        renderFeed();
    });

    // Filter pill handlers
    filterPills.forEach(pill => {
        pill.addEventListener('click', () => {
            filterPills.forEach(p => p.classList.remove('active'));
            pill.classList.add('active');
            currentFilterType = pill.getAttribute('data-type');
            renderFeed();
        });
    });

    // Modal Control
    closeModalBtn.addEventListener('click', hideTweetModal);
    cancelTweetBtn.addEventListener('click', hideTweetModal);
    
    tweetTextarea.addEventListener('input', () => {
        const remaining = 280 - tweetTextarea.value.length;
        charCounter.textContent = remaining;
        if (remaining < 0) {
            charCounter.style.color = 'var(--accent-rose)';
        } else {
            charCounter.style.color = 'var(--text-muted)';
        }
    });

    sendTweetBtn.addEventListener('click', () => {
        const tweetText = tweetTextarea.value;
        const tweetUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(tweetText)}`;
        window.open(tweetUrl, '_blank', 'width=550,height=420');
        hideTweetModal();
    });

    // Selection listener to show floating Tweet button
    document.addEventListener('mouseup', handleTextSelection);
    document.addEventListener('selectionchange', handleTextSelectionChange);

    floatingTweetBtn.addEventListener('click', () => {
        const selectedText = window.getSelection().toString().trim();
        if (selectedText) {
            const formattedText = `"${selectedText.substring(0, 180)}${selectedText.length > 180 ? '...' : ''}" - BigQuery Update #BigQuery`;
            openTweetModal(formattedText);
        }
        floatingTweetBtn.classList.add('hidden');
    });

    // Functions
    async function fetchReleases() {
        showLoading(true);
        try {
            const response = await fetch('/api/releases');
            if (!response.ok) {
                throw new Error(`Server returned status ${response.status}`);
            }
            const data = await response.json();
            
            if (data.error) {
                throw new Error(data.error);
            }

            processRawEntries(data.entries || []);
            renderFeed();
            showLoading(false);
            exportCsvBtn.disabled = false;
        } catch (error) {
            console.error('Error fetching release notes:', error);
            errorMessage.textContent = error.message || 'Could not load release notes. Check backend connectivity.';
            showError(true);
            exportCsvBtn.disabled = true;
        }
    }

    function showLoading(isLoading) {
        if (isLoading) {
            loadingState.classList.remove('hidden');
            errorState.classList.add('hidden');
            feedList.classList.add('hidden');
            refreshIcon.classList.add('spin-fast');
            refreshBtn.disabled = true;
        } else {
            loadingState.classList.add('hidden');
            refreshIcon.classList.remove('spin-fast');
            refreshBtn.disabled = false;
        }
    }

    function showError(isError) {
        showLoading(false);
        if (isError) {
            errorState.classList.remove('hidden');
            feedList.classList.add('hidden');
        } else {
            errorState.classList.add('hidden');
        }
    }

    // Helper to strip HTML tags
    function stripHtml(html) {
        const tmp = document.createElement("div");
        tmp.innerHTML = html;
        // Clean up double spacing and trim
        return (tmp.textContent || tmp.innerText || "").replace(/\s+/g, ' ').trim();
    }

    // Process raw entries into individual update items
    function processRawEntries(entries) {
        allReleaseItems = [];
        
        entries.forEach(entry => {
            const dateStr = entry.title || 'Unknown Date';
            const link = entry.link || '';
            const rawContent = entry.content || '';
            
            // Parse HTML and break into items
            const parsedItems = parseEntryContent(rawContent, dateStr, link);
            allReleaseItems.push(...parsedItems);
        });
    }

    // Parsers HTML content by <h3> headers
    function parseEntryContent(contentHtml, dateStr, link) {
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = contentHtml;
        
        const items = [];
        let currentType = 'other';
        let currentHtml = '';
        
        const children = Array.from(tempDiv.children);
        
        children.forEach(child => {
            if (child.tagName === 'H3' || child.tagName === 'H2' || child.tagName === 'H4') {
                if (currentHtml.trim()) {
                    items.push({
                        type: currentType,
                        html: currentHtml,
                        text: stripHtml(currentHtml),
                        date: dateStr,
                        link: link
                    });
                }
                
                const headerText = child.textContent.trim().toLowerCase();
                if (headerText.includes('feature')) {
                    currentType = 'feature';
                } else if (headerText.includes('deprecated') || headerText.includes('deprecation')) {
                    currentType = 'deprecated';
                } else if (headerText.includes('change') || headerText.includes('changed') || headerText.includes('update')) {
                    currentType = 'changed';
                } else {
                    currentType = 'other';
                }
                currentHtml = '';
            } else {
                currentHtml += child.outerHTML;
            }
        });
        
        if (currentHtml.trim()) {
            items.push({
                type: currentType,
                html: currentHtml,
                text: stripHtml(currentHtml),
                date: dateStr,
                link: link
            });
        }
        
        if (items.length === 0 && tempDiv.innerHTML.trim()) {
            items.push({
                type: 'other',
                html: tempDiv.innerHTML,
                text: stripHtml(tempDiv.innerHTML),
                date: dateStr,
                link: link
            });
        }
        
        return items;
    }

    // Render feed items grouped by date
    function renderFeed() {
        feedList.innerHTML = '';
        
        // Filter items
        const filteredItems = allReleaseItems.filter(item => {
            const matchesFilter = currentFilterType === 'all' || item.type === currentFilterType;
            const matchesSearch = !searchQuery || 
                                  item.text.toLowerCase().includes(searchQuery) || 
                                  item.date.toLowerCase().includes(searchQuery) ||
                                  item.type.toLowerCase().includes(searchQuery);
            return matchesFilter && matchesSearch;
        });

        if (filteredItems.length === 0) {
            feedList.innerHTML = `
                <div class="loading-state">
                    <i data-lucide="info" style="width:3rem;height:3rem;margin-bottom:1rem;color:var(--text-muted)"></i>
                    <p>No release notes found matching current search or filter.</p>
                </div>
            `;
            if (window.lucide) window.lucide.createIcons();
            feedList.classList.remove('hidden');
            return;
        }

        // Group by Date
        const grouped = {};
        filteredItems.forEach(item => {
            if (!grouped[item.date]) {
                grouped[item.date] = [];
            }
            grouped[item.date].push(item);
        });

        // Generate elements
        Object.keys(grouped).forEach(date => {
            const dateGroup = document.createElement('div');
            dateGroup.className = 'release-date-group';
            
            const groupHeader = document.createElement('div');
            groupHeader.className = 'group-date';
            groupHeader.innerHTML = `<i data-lucide="calendar" style="width:1.2rem;height:1.2rem;"></i> <span>${date}</span>`;
            dateGroup.appendChild(groupHeader);
            
            grouped[date].forEach(item => {
                const card = document.createElement('div');
                card.className = 'item-card';
                
                const cardHeader = document.createElement('div');
                cardHeader.className = 'card-header';
                
                // Badge color/label
                let badgeClass = 'badge-other';
                let label = 'Update';
                if (item.type === 'feature') {
                    badgeClass = 'badge-feature';
                    label = 'Feature';
                } else if (item.type === 'changed') {
                    badgeClass = 'badge-changed';
                    label = 'Change';
                } else if (item.type === 'deprecated') {
                    badgeClass = 'badge-deprecated';
                    label = 'Deprecation';
                }
                
                cardHeader.innerHTML = `
                    <span class="badge ${badgeClass}">${label}</span>
                    <div class="action-btns">
                        ${item.link ? `<a href="${item.link}" target="_blank" class="btn-icon" title="View official docs"><i data-lucide="external-link"></i></a>` : ''}
                        <button class="btn-icon copy-btn" title="Copiar al portapapeles">
                            <i data-lucide="copy"></i>
                        </button>
                        <button class="btn-icon tweet-btn" title="Tweet this update">
                            <i data-lucide="twitter"></i>
                        </button>
                    </div>
                `;
                
                const cardContent = document.createElement('div');
                cardContent.className = 'card-content';
                cardContent.innerHTML = item.html;
                
                // Add event listener to Tweet button
                const tweetButton = cardHeader.querySelector('.tweet-btn');
                tweetButton.addEventListener('click', () => {
                    const cleanText = item.text;
                    const truncatedText = cleanText.substring(0, 180) + (cleanText.length > 180 ? '...' : '');
                    const tweetContent = `BigQuery Release (${item.date}): ${truncatedText} ${item.link ? '\nRead more: ' + item.link : ''}\n#BigQuery #GCP`;
                    openTweetModal(tweetContent);
                });

                // Add event listener to Copy button
                const copyButton = cardHeader.querySelector('.copy-btn');
                copyButton.addEventListener('click', () => {
                    navigator.clipboard.writeText(item.text).then(() => {
                        // Change icon to check for visual feedback
                        copyButton.innerHTML = '<i data-lucide="check" style="color: var(--accent-teal)"></i>';
                        if (window.lucide) window.lucide.createIcons();
                        setTimeout(() => {
                            copyButton.innerHTML = '<i data-lucide="copy"></i>';
                            if (window.lucide) window.lucide.createIcons();
                        }, 2000);
                    }).catch(err => {
                        console.error('Failed to copy text: ', err);
                    });
                });

                card.appendChild(cardHeader);
                card.appendChild(cardContent);
                dateGroup.appendChild(card);
            });
            
            feedList.appendChild(dateGroup);
        });

        if (window.lucide) {
            window.lucide.createIcons();
        }
        feedList.classList.remove('hidden');
    }

    // Open/Close Tweet Modals
    function openTweetModal(content) {
        tweetTextarea.value = content;
        // Trigger input to update character count
        tweetTextarea.dispatchEvent(new Event('input'));
        tweetModal.classList.remove('hidden');
    }

    function hideTweetModal() {
        tweetModal.classList.add('hidden');
    }

    // Text Selection sharing logic
    let selectionTimeout;
    function handleTextSelectionChange() {
        // Clear any ongoing timeout
        clearTimeout(selectionTimeout);
    }

    function handleTextSelection(e) {
        // Wait a split second to ensure selection coordinates are finalized
        selectionTimeout = setTimeout(() => {
            const selection = window.getSelection();
            const selectedText = selection.toString().trim();
            
            if (selectedText.length > 0) {
                // Ensure selection is inside the feed list container
                const range = selection.getRangeAt(0);
                const container = feedList;
                
                if (container.contains(range.commonAncestorContainer)) {
                    // Position floating button
                    const rect = range.getBoundingClientRect();
                    floatingTweetBtn.style.top = `${rect.top + window.scrollY - 40}px`;
                    floatingTweetBtn.style.left = `${rect.left + window.scrollX + (rect.width / 2) - 60}px`;
                    floatingTweetBtn.classList.remove('hidden');
                    return;
                }
            }
            // Hide button if no selection or click outside
            if (!e.target.closest('#floating-tweet-btn')) {
                floatingTweetBtn.classList.add('hidden');
            }
        }, 100);
    }
});
