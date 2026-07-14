document.addEventListener('DOMContentLoaded', () => {
    initTabs();
    initDictionary();
    initTranslation();
    initCharacterDetail();
    initKeyboardEvents();
});

function initTabs() {
    const tabs = document.querySelectorAll('.tab-btn');
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const target = tab.dataset.tab;
            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
            document.getElementById(`tab-${target}`).classList.add('active');
        });
    });
}

function showToast(message) {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 2500);
}

function createLoading() {
    const div = document.createElement('div');
    div.className = 'loading-spinner';
    div.innerHTML = '<div class="spinner"></div><span>Đang xử lý...</span>';
    return div;
}

function removeAccents(str) {
    return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

/* =========== DICTIONARY =========== */

function initDictionary() {
    const input = document.getElementById('dict-input');
    const searchBtn = document.getElementById('dict-search-btn');
    const chips = document.querySelectorAll('.option-chip');

    chips.forEach(chip => {
        chip.addEventListener('click', () => {
            chips.forEach(c => c.classList.remove('active'));
            chip.classList.add('active');
        });
    });

    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') searchDict();
    });
    searchBtn.addEventListener('click', searchDict);

    document.querySelectorAll('.example-word').forEach(el => {
        el.addEventListener('click', () => {
            input.value = el.dataset.word;
            searchDict();
        });
    });
}

async function searchDict() {
    const input = document.getElementById('dict-input');
    const results = document.getElementById('dict-results');
    const query = input.value.trim();
    if (!query) return;

    const activeChip = document.querySelector('.option-chip.active');
    const mode = activeChip ? activeChip.dataset.mode : 'chinese';

    results.innerHTML = '';
    results.appendChild(createLoading());

    try {
        let matches = [];

        if (mode === 'chinese' || mode === 'pinyin' || mode === 'vietnamese') {
            if (mode === 'chinese') {
                const localMatches = DICT_DB.filter(d =>
                    d.simplified.includes(query) || d.traditional.includes(query)
                );
                matches = matches.concat(localMatches);
            }
            if (mode === 'pinyin') {
                const pyMatches = DICT_DB.filter(d =>
                    d.pinyin.toLowerCase().includes(query.toLowerCase())
                );
                matches = matches.concat(pyMatches);
            }
            if (mode === 'vietnamese') {
                const viMatches = DICT_DB.filter(d =>
                    d.vi.toLowerCase().includes(query.toLowerCase())
                );
                matches = matches.concat(viMatches);
            }
        }

        // Check single char in character DB
        for (const [ch, data] of Object.entries(CHARACTER_DB)) {
            let match = false;
            if (mode === 'chinese' && (ch.includes(query) || data.simplified.includes(query))) match = true;
            if (mode === 'pinyin' && data.pinyin.toLowerCase().includes(query.toLowerCase())) match = true;
            if (mode === 'vietnamese' && data.vi.toLowerCase().includes(query.toLowerCase())) match = true;
            if (match) {
                if (!matches.find(m => m.simplified === data.simplified)) {
                    matches.push({
                        simplified: data.simplified,
                        traditional: data.traditional,
                        pinyin: data.pinyin,
                        vi: data.vi,
                        frequency: 'Cao',
                        isChar: true
                    });
                }
            }
        }

        // Deduplicate
        matches = matches.filter((item, index, self) =>
            index === self.findIndex(t => t.simplified === item.simplified)
        );

        setTimeout(() => {
            results.innerHTML = '';
            if (matches.length === 0) {
                results.innerHTML = `
                    <div class="welcome-message">
                        <div class="welcome-icon">😕</div>
                        <h3>Không tìm thấy kết quả</h3>
                        <p>Không tìm thấy từ "${query}" trong từ điển. Hãy thử tìm kiếm với từ khóa khác.</p>
                    </div>
                `;
                return;
            }
            renderDictResults(matches, results);
        }, 200);

    } catch (err) {
        results.innerHTML = `
            <div class="welcome-message">
                <div class="welcome-icon">⚠️</div>
                <h3>Lỗi</h3>
                <p>${err.message}</p>
            </div>
        `;
    }
}

function renderDictResults(matches, container) {
    container.innerHTML = '<div class="dict-card"></div>';
    const card = container.querySelector('.dict-card');

    matches.slice(0, 25).forEach(word => {
        if (word.isChar && CHARACTER_DB[word.simplified]) {
            const ch = CHARACTER_DB[word.simplified];
            const info = document.createElement('div');
            info.style.cssText = 'font-size:13px;color:#c0392b;font-weight:500;margin-bottom:8px;display:flex;align-items:center;gap:6px;';
            info.innerHTML = '📌 Nhấp vào chữ để xem chi tiết lịch sử & hình thành';
            info.addEventListener('click', () => showCharDetail(word.simplified));
            card.appendChild(info);
        }
        const dItem = createDictItem(word);
        card.appendChild(dItem);
    });

    if (matches.length > 25) {
        const more = document.createElement('p');
        more.style.cssText = 'text-align:center;color:#7f8c8d;padding:12px;font-size:13px;';
        more.textContent = `và ${matches.length - 25} kết quả khác...`;
        card.appendChild(more);
    }
}

function createDictItem(word) {
    const div = document.createElement('div');
    div.className = 'dict-word';
    div.innerHTML = `
        <div class="dict-word-text">${word.simplified}</div>
        <div class="dict-pinyin">${word.pinyin}</div>
        <div class="dict-meaning">${word.vi}</div>
    `;

    const details = document.createElement('div');
    details.className = 'dict-details';
    details.innerHTML = `
        <div class="dict-detail-item">
            <div class="dict-detail-label">Phồn thể</div>
            <div class="dict-detail-value">${word.traditional}</div>
        </div>
        <div class="dict-detail-item">
            <div class="dict-detail-label">Tần suất</div>
            <div class="dict-detail-value">${word.frequency}</div>
        </div>
    `;
    div.appendChild(details);

    if (CHARACTER_DB[word.simplified]) {
        const ch = CHARACTER_DB[word.simplified];
        const charInfo = document.createElement('div');
        charInfo.style.cssText = 'margin-top:8px;padding:8px 12px;background:#fef9e7;border-radius:6px;border-left:3px solid #f39c12;font-size:13px;cursor:pointer;transition:0.2s;';
        charInfo.innerHTML = `<strong>🔍 Chi tiết chữ:</strong> ${ch.formation} · ${ch.radical} · ${ch.strokes} nét`;
        charInfo.addEventListener('mouseenter', () => { charInfo.style.background = '#fce4b8'; });
        charInfo.addEventListener('mouseleave', () => { charInfo.style.background = '#fef9e7'; });
        charInfo.addEventListener('click', () => showCharDetail(word.simplified));
        div.appendChild(charInfo);
    }

    return div;
}

function showCharDetail(char) {
    const charTab = document.querySelector('[data-tab="character"]');
    charTab.click();
    document.getElementById('char-input').value = char;
    document.getElementById('char-search-btn').click();
}

/* =========== TRANSLATION =========== */

function initTranslation() {
    const sourceText = document.getElementById('source-text');
    const translateBtn = document.getElementById('translate-btn');
    const swapBtn = document.getElementById('swap-lang-btn');
    const sourceLang = document.getElementById('source-lang');
    const targetLang = document.getElementById('target-lang');

    sourceText.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && e.ctrlKey) translateText();
    });
    translateBtn.addEventListener('click', translateText);

    swapBtn.addEventListener('click', () => {
        const temp = sourceLang.value;
        sourceLang.value = targetLang.value;
        targetLang.value = temp;
        const tempText = sourceText.value;
        sourceText.value = '';
        document.getElementById('translation-result').innerHTML = '<p class="placeholder-text">Bản dịch sẽ hiển thị ở đây...</p>';
        if (tempText) {
            document.getElementById('translation-result').innerHTML = `<p>Đã đổi ngôn ngữ. Nhập văn bản mới để dịch.</p>`;
        }
    });

    // Auto-detect Chinese characters for dictionary lookup in translation
    sourceText.addEventListener('input', () => {
        const val = sourceText.value.trim();
        if (val && /[\u4e00-\u9fff]/.test(val)) {
            // Has Chinese characters
        }
    });
}

async function translateText() {
    const sourceText = document.getElementById('source-text');
    const result = document.getElementById('translation-result');
    const text = sourceText.value.trim();
    if (!text) {
        result.innerHTML = '<p class="placeholder-text">Vui lòng nhập văn bản cần dịch.</p>';
        return;
    }

    const sourceLang = document.getElementById('source-lang').value;
    const targetLang = document.getElementById('target-lang').value;
    const langPair = `${sourceLang}|${targetLang}`;

    result.innerHTML = '';
    result.appendChild(createLoading());

    try {
        const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${langPair}`;
        const resp = await fetch(url, { signal: AbortSignal.timeout(8000) });
        const data = await resp.json();

        setTimeout(() => {
            result.innerHTML = '';
            if (data && data.responseData && data.responseData.translatedText) {
                let translatedText = data.responseData.translatedText;
                result.innerHTML = `<p>${translatedText}</p>`;

                // If translating Chinese -> Vietnamese, show character breakdown for single chars
                if (sourceLang === 'zh-CN' && text.length === 1 && CHARACTER_DB[text]) {
                    const ch = CHARACTER_DB[text];
                    const charLink = document.createElement('div');
                    charLink.style.cssText = 'margin-top:16px;padding:12px;background:#fef9e7;border-radius:6px;border-left:3px solid #f39c12;font-size:13px;cursor:pointer;';
                    charLink.innerHTML = `<strong>🔍 Xem chi tiết chữ "${text}":</strong> ${ch.formation} · ${ch.radical} · ${ch.strokes} nét. Nhấp để xem thêm.`;
                    charLink.addEventListener('click', () => showCharDetail(text));
                    result.appendChild(charLink);
                }

                // Show related dictionary entries for Chinese input
                if (sourceLang === 'zh-CN' && text.length >= 2) {
                    const dictMatches = DICT_DB.filter(d => d.simplified.includes(text));
                    if (dictMatches.length > 0) {
                        const related = document.createElement('div');
                        related.style.cssText = 'margin-top:16px;padding-top:12px;border-top:1px solid #e0d6ce;';
                        let relatedHTML = '<div style="font-size:12px;color:#7f8c8d;margin-bottom:6px;font-weight:600;">TỪ LIÊN QUAN TRONG TỪ ĐIỂN:</div>';
                        relatedHTML += '<div style="display:flex;flex-wrap:wrap;gap:6px;">';
                        dictMatches.slice(0, 5).forEach(m => {
                            relatedHTML += `<span style="padding:4px 10px;background:#f5f0eb;border-radius:4px;font-size:13px;cursor:pointer;" onclick="showCharDetail('${m.simplified}')">${m.simplified} - ${m.pinyin}</span>`;
                        });
                        relatedHTML += '</div>';
                        related.innerHTML = relatedHTML;
                        result.appendChild(related);
                    }
                }
            } else {
                result.innerHTML = '<p class="placeholder-text">Không thể dịch văn bản. Vui lòng thử lại sau.</p>';
            }
        }, 300);

    } catch {
        setTimeout(() => {
            result.innerHTML = '<p class="placeholder-text">Lỗi kết nối. Vui lòng kiểm tra internet và thử lại.</p>';
        }, 300);
    }
}

/* =========== CHARACTER DETAIL =========== */

function initCharacterDetail() {
    const input = document.getElementById('char-input');
    const searchBtn = document.getElementById('char-search-btn');

    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') searchCharacter();
    });
    searchBtn.addEventListener('click', searchCharacter);

    document.querySelectorAll('.example-char').forEach(el => {
        el.addEventListener('click', () => {
            input.value = el.dataset.char;
            searchCharacter();
        });
    });
}

function searchCharacter() {
    const input = document.getElementById('char-input');
    const result = document.getElementById('char-result');
    const query = input.value.trim();
    if (!query) return;

    result.innerHTML = '';
    result.appendChild(createLoading());

    setTimeout(() => {
        result.innerHTML = '';

        // Find chars in the query
        const chars = [];
        for (const ch of query) {
            if (CHARACTER_DB[ch]) {
                chars.push(ch);
            }
        }

        if (chars.length === 0) {
            // Try multi-char word lookup in dict
            const dictMatch = DICT_DB.find(d => d.simplified === query);
            if (dictMatch) {
                result.innerHTML = `
                    <div class="char-detail-card">
                        <div class="char-detail-header">
                            <div style="font-size:64px;font-family:'Noto Serif SC',serif;margin-bottom:8px;">${dictMatch.simplified}</div>
                            <div style="font-size:20px;color:#c0392b;">${dictMatch.pinyin}</div>
                            <div style="font-size:18px;font-weight:600;">${dictMatch.vi}</div>
                        </div>
                        <div class="char-detail-body">
                            <p>Đây là từ ghép. Nhấp vào từng chữ để xem chi tiết:</p>
                            <div style="display:flex;gap:12px;margin-top:12px;flex-wrap:wrap;">
                                ${[...dictMatch.simplified].map(ch => {
                                    const hasData = CHARACTER_DB[ch] ? 'cursor:pointer;color:#c0392b;' : '';
                                    return `<span style="font-size:28px;font-family:'Noto Serif SC',serif;padding:8px 16px;background:#f5f0eb;border-radius:8px;${hasData}" onclick="${CHARACTER_DB[ch] ? `showCharDetail('${ch}')` : ''}">${ch}</span>`;
                                }).join('')}
                            </div>
                        </div>
                    </div>
                `;
                return;
            }

            result.innerHTML = `
                <div class="welcome-message">
                    <div class="welcome-icon">😕</div>
                    <h3>Không có dữ liệu</h3>
                    <p>Chưa có thông tin chi tiết về "${query}" trong cơ sở dữ liệu.</p>
                </div>
            `;
            return;
        }

        // Show detail for first char, then list others
        const mainChar = chars[0];
        renderCharDetail(mainChar, result, chars.slice(1));
    }, 200);
}

function renderCharDetail(char, container, otherChars) {
    const data = CHARACTER_DB[char];
    if (!data) return;

    let evolutionHTML = '';
    if (data.evolution && data.evolution.length > 0) {
        evolutionHTML = '<div class="char-evolution"><h4>📜 Lịch sử tiến hóa của chữ</h4><div class="evolution-timeline">';
        data.evolution.forEach(stage => {
            const displayChar = stage.char || char;
            evolutionHTML += `
                <div class="evolution-stage">
                    <span class="evolution-char">${displayChar}</span>
                    <span class="evolution-label">${stage.era}</span>
                </div>
            `;
        });
        evolutionHTML += '</div></div>';
    }

    let examplesHTML = '';
    if (data.examples && data.examples.length > 0) {
        examplesHTML = '<div class="dict-examples" style="margin-top:16px;"><h4>Ví dụ:</h4><div class="dict-examples-list">';
        data.examples.forEach(ex => {
            examplesHTML += `<span class="example-item">${ex}</span>`;
        });
        examplesHTML += '</div></div>';
    }

    let otherCharsHTML = '';
    if (otherChars && otherChars.length > 0) {
        otherCharsHTML = '<div style="margin-top:16px;padding-top:16px;border-top:2px solid #f5f0eb;"><p style="font-size:13px;color:#7f8c8d;margin-bottom:8px;">CÁC CHỮ KHÁC TRONG TỪ:</p><div style="display:flex;gap:8px;flex-wrap:wrap;">';
        otherChars.forEach(ch => {
            const cd = CHARACTER_DB[ch];
            otherCharsHTML += `<span style="padding:8px 14px;background:#f5f0eb;border-radius:6px;cursor:pointer;font-size:18px;font-family:'Noto Serif SC',serif;transition:0.2s;" onmouseenter="this.style.background='#c0392b';this.style.color='white'" onmouseleave="this.style.background='#f5f0eb';this.style.color='inherit'" onclick="showCharDetail('${ch}')">${ch} ${cd ? cd.pinyin : ''} - ${cd ? cd.vi : ''}</span>`;
        });
        otherCharsHTML += '</div></div>';
    }

    let relatedCharsHTML = '';
    const relatedChars = Object.entries(CHARACTER_DB)
        .filter(([k, v]) => k !== char && v.radical === data.radical)
        .slice(0, 6);
    if (relatedChars.length > 0) {
        relatedCharsHTML = '<div style="margin-top:16px;padding-top:16px;border-top:2px solid #f5f0eb;"><p style="font-size:13px;color:#7f8c8d;margin-bottom:8px;">CHỮ CÙNG BỘ THỦ:</p><div style="display:flex;gap:8px;flex-wrap:wrap;">';
        relatedChars.forEach(([k, v]) => {
            relatedCharsHTML += `<span style="padding:6px 12px;background:#fef9e7;border-radius:6px;cursor:pointer;font-size:16px;font-family:'Noto Serif SC',serif;" onclick="showCharDetail('${k}')">${k} (${v.pinyin})</span>`;
        });
        relatedCharsHTML += '</div></div>';
    }

    container.innerHTML = `
        <div class="char-detail-card">
            <div class="char-detail-header">
                <div class="char-detail-char">${data.simplified}</div>
                <div class="char-detail-pinyin">${data.pinyin}</div>
                <div class="char-detail-meaning">${data.vi}</div>
                ${data.traditional !== data.simplified ? `<div style="font-size:14px;color:#7f8c8d;">Phồn thể: ${data.traditional}</div>` : ''}
            </div>
            <div class="char-detail-body">
                <div class="char-info-grid">
                    <div class="char-info-item">
                        <div class="char-info-label">Bộ thủ</div>
                        <div class="char-info-value">${data.radical}</div>
                    </div>
                    <div class="char-info-item">
                        <div class="char-info-label">Số nét</div>
                        <div class="char-info-value">${data.strokes}</div>
                    </div>
                    <div class="char-info-item">
                        <div class="char-info-label">Loại hình thành</div>
                        <div class="char-info-value highlight">${data.formation}</div>
                    </div>
                    <div class="char-info-item">
                        <div class="char-info-label">Phồn thể</div>
                        <div class="char-info-value">${data.traditional}</div>
                    </div>
                </div>

                <div class="char-formation-detail">
                    <h4>🏗️ ${data.formation}</h4>
                    <p>${data.formationDesc}</p>
                </div>

                ${evolutionHTML}

                <div class="char-description">
                    <h4>📖 Ý nghĩa chi tiết</h4>
                    <p>${data.description}</p>
                </div>

                ${examplesHTML}
                ${otherCharsHTML}
                ${relatedCharsHTML}
            </div>
        </div>
    `;

    // Smooth scroll
    container.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

/* =========== KEYBOARD EVENTS =========== */

function initKeyboardEvents() {
    document.addEventListener('keydown', (e) => {
        if (e.altKey || e.ctrlKey || e.metaKey) return;

        const activeTab = document.querySelector('.tab-btn.active');
        if (!activeTab) return;

        const tabs = document.querySelectorAll('.tab-btn');
        const currentIndex = Array.from(tabs).indexOf(activeTab);

        if (e.key === '1') { tabs[0]?.click(); e.preventDefault(); }
        if (e.key === '2') { tabs[1]?.click(); e.preventDefault(); }
        if (e.key === '3') { tabs[2]?.click(); e.preventDefault(); }
    });
}
