document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('invoice-form');
    const milestoneRows = document.getElementById('milestone-rows');
    const addItemBtn = document.getElementById('add-item-btn');
    const printBtn = document.getElementById('print-btn');
    const discountRateInput = document.getElementById('discount-rate');

    const fields = {
        clientName: document.getElementById('client-name'),
        projectName: document.getElementById('project-name'),
        dueDate: document.getElementById('due-date')
    };

    const previewEls = {
        clientName: document.getElementById('client-name-lbl'),
        projectName: document.getElementById('project-name-lbl'),
        dueDate: document.getElementById('due-date-lbl'),
        currentDate: document.getElementById('current-date-lbl'),
        subtotal: document.getElementById('subtotal-lbl'),
        adjustment: document.getElementById('adjustment-lbl'),
        grandTotal: document.getElementById('grand-total-lbl'),
        ledger: document.getElementById('ledger-items-body')
    };

    function formatCurrency(value) {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD'
        }).format(value || 0);
    }

    function safeNumber(value) {
        const parsed = Number(value);
        return Number.isFinite(parsed) ? parsed : 0;
    }

    function todayISO() {
        const now = new Date();
        return now.toISOString().split('T')[0];
    }

    function setDefaultDate() {
        const issueDateEl = document.getElementById('current-date-lbl');
        issueDateEl.textContent = new Date().toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    }

    function addMilestoneRow(item = { description: '', amount: '' }) {
        const wrapper = document.createElement('div');
        wrapper.className = 'milestone-item';

        const descInput = document.createElement('input');
        descInput.type = 'text';
        descInput.placeholder = 'e.g. Discovery sprint';
        descInput.value = item.description || '';
        descInput.setAttribute('aria-label', 'Milestone description');

        const amountInput = document.createElement('input');
        amountInput.type = 'number';
        amountInput.min = '0';
        amountInput.step = '0.01';
        amountInput.placeholder = '0.00';
        amountInput.value = item.amount || '';
        amountInput.setAttribute('aria-label', 'Milestone amount');

        const removeBtn = document.createElement('button');
        removeBtn.type = 'button';
        removeBtn.className = 'remove-item';
        removeBtn.textContent = '×';
        removeBtn.setAttribute('aria-label', 'Remove milestone item');
        removeBtn.addEventListener('click', () => {
            wrapper.remove();
            saveDraft();
            updatePreview();
        });

        [descInput, amountInput].forEach((input) => {
            input.addEventListener('input', () => {
                saveDraft();
                updatePreview();
            });
        });

        wrapper.append(descInput, amountInput, removeBtn);
        milestoneRows.appendChild(wrapper);
    }

    function getMilestoneData() {
        return Array.from(document.querySelectorAll('.milestone-item')).map((row) => {
            const inputs = row.querySelectorAll('input');
            return {
                description: inputs[0]?.value.trim() || '',
                amount: safeNumber(inputs[1]?.value || 0)
            };
        }).filter((item) => item.description || item.amount > 0);
    }

    function updatePreview() {
        const clientName = fields.clientName.value.trim() || 'Awaiting input details...';
        const projectName = fields.projectName.value.trim() || 'Awaiting project parameters...';
        const dueDate = fields.dueDate.value;

        previewEls.clientName.textContent = clientName;
        previewEls.projectName.textContent = projectName;
        previewEls.dueDate.textContent = dueDate ? new Date(dueDate + 'T00:00:00').toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        }) : '--/--/----';

        const subtotal = getMilestoneData().reduce((sum, item) => sum + safeNumber(item.amount), 0);
        const discountRate = safeNumber(discountRateInput.value || 0) / 100;
        const adjustment = subtotal * discountRate;
        const grandTotal = subtotal - adjustment;

        previewEls.subtotal.textContent = formatCurrency(subtotal);
        previewEls.adjustment.textContent = `-${formatCurrency(adjustment)}`;
        previewEls.grandTotal.textContent = formatCurrency(grandTotal);

        previewEls.ledger.innerHTML = '';

        const rows = getMilestoneData();
        if (!rows.length) {
            previewEls.ledger.innerHTML = `
                <tr>
                    <td colspan="2" style="color:#7a8aa0; font-style:italic; text-align:left; padding:16px;">No milestone items yet. Add one to build your total.</td>
                </tr>
            `;
            return;
        }

        rows.forEach((item) => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${item.description || 'Untitled milestone'}</td>
                <td align="right">${formatCurrency(item.amount)}</td>
            `;
            previewEls.ledger.appendChild(tr);
        });
    }

    function saveDraft() {
        const draft = {
            clientName: fields.clientName.value,
            projectName: fields.projectName.value,
            dueDate: fields.dueDate.value,
            discountRate: discountRateInput.value,
            milestones: getMilestoneData()
        };
        localStorage.setItem('sovereign-invoice-draft', JSON.stringify(draft));
    }

    function loadDraft() {
        const raw = localStorage.getItem('sovereign-invoice-draft');
        if (!raw) {
            addMilestoneRow();
            return;
        }

        try {
            const draft = JSON.parse(raw);
            fields.clientName.value = draft.clientName || '';
            fields.projectName.value = draft.projectName || '';
            fields.dueDate.value = draft.dueDate || '';
            discountRateInput.value = draft.discountRate || 0;

            const milestoneList = Array.isArray(draft.milestones) && draft.milestones.length ? draft.milestones : [{ description: '', amount: '' }];
            milestoneRows.innerHTML = '';
            milestoneList.forEach((item) => addMilestoneRow(item));
        } catch (error) {
            console.warn('Draft load failed:', error);
            addMilestoneRow();
        }
    }

    function resetDraft() {
        localStorage.removeItem('sovereign-invoice-draft');
        milestoneRows.innerHTML = '';
        form.reset();
        discountRateInput.value = 0;
        addMilestoneRow();
        updatePreview();
    }

    function bindEvents() {
        Object.values(fields).forEach((field) => {
            field.addEventListener('input', () => {
                saveDraft();
                updatePreview();
            });
        });

        fields.dueDate.addEventListener('change', () => {
            saveDraft();
            updatePreview();
        });

        discountRateInput.addEventListener('input', () => {
            saveDraft();
            updatePreview();
        });

        addItemBtn.addEventListener('click', () => {
            addMilestoneRow();
            saveDraft();
            updatePreview();
        });

        printBtn.addEventListener('click', () => {
            window.print();
        });
    }

    bindEvents();
    loadDraft();
    setDefaultDate();
    updatePreview();

    window.resetDraftAction = resetDraft;
    document.getElementById('resetBtn')?.addEventListener('click', resetDraft);
});
